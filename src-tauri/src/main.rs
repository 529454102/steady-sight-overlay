#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use tauri::{window::Color, AppHandle, Emitter, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const MAIN_WINDOW_LABEL: &str = "main";
const OVERLAY_WINDOW_LABEL: &str = "overlay";

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct OverlaySettings {
    enabled: bool,
    click_through: bool,
    anchor: bool,
    horizon: bool,
    vignette: bool,
    grid: bool,
    edge_frame: bool,
    stabilizer: bool,
    edge_markers: bool,
    motion_pulse: bool,
    anchor_style: String,
    anchor_color: String,
    anchor_size: f64,
    anchor_opacity: f64,
    guide_style: String,
    guide_color: String,
    guide_opacity: f64,
    guide_thickness: f64,
    guide_gap: f64,
    vignette_strength: f64,
    horizon_opacity: f64,
    grid_opacity: f64,
    profile: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HotkeyBinding {
    action: String,
    shortcut: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HotkeyRegistration {
    action: String,
    shortcut: String,
    registered: bool,
    message: String,
}

fn is_allowed_hotkey_action(action: &str) -> bool {
    matches!(
        action,
        "toggle-overlay"
            | "toggle-preview"
            | "toggle-temporary-hide"
            | "toggle-click-through"
            | "profile-soft"
            | "profile-focus"
            | "profile-strong"
            | "profile-reference"
            | "profile-modeling"
    )
}

fn normalize_shortcut_identity(shortcut: &str) -> String {
    match shortcut.parse::<tauri_plugin_global_shortcut::Shortcut>() {
        Ok(parsed) => parsed.id().to_string(),
        Err(_) => shortcut
            .split_whitespace()
            .collect::<String>()
            .to_lowercase(),
    }
}

fn get_overlay_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(OVERLAY_WINDOW_LABEL)
        .ok_or_else(|| "overlay window was not created".to_string())
}

fn ensure_main_window(caller: &WebviewWindow) -> Result<(), String> {
    if caller.label() == MAIN_WINDOW_LABEL {
        Ok(())
    } else {
        Err("overlay commands can only be invoked from the main control window".to_string())
    }
}

fn configure_overlay_window(overlay: &WebviewWindow) -> Result<(), String> {
    if overlay.label() != OVERLAY_WINDOW_LABEL {
        return Err(format!(
            "refusing to configure non-overlay window '{}'",
            overlay.label()
        ));
    }

    let monitor = match overlay
        .current_monitor()
        .map_err(|error| error.to_string())?
    {
        Some(monitor) => monitor,
        None => overlay
            .primary_monitor()
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "no monitor detected for overlay".to_string())?,
    };

    overlay
        .set_position(*monitor.position())
        .map_err(|error| error.to_string())?;
    overlay
        .set_size(*monitor.size())
        .map_err(|error| error.to_string())?;
    overlay
        .set_always_on_top(true)
        .map_err(|error| error.to_string())?;
    overlay
        .set_visible_on_all_workspaces(true)
        .map_err(|error| error.to_string())?;
    overlay
        .set_shadow(false)
        .map_err(|error| error.to_string())?;
    overlay
        .set_focusable(false)
        .map_err(|error| error.to_string())?;
    overlay
        .set_background_color(Some(Color(0, 0, 0, 0)))
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn apply_overlay_settings(
    app: AppHandle,
    caller: WebviewWindow,
    settings: OverlaySettings,
) -> Result<(), String> {
    ensure_main_window(&caller)?;
    let overlay = get_overlay_window(&app)?;

    overlay
        .emit("overlay-settings", settings.clone())
        .map_err(|error| error.to_string())?;

    overlay
        .set_ignore_cursor_events(settings.click_through)
        .map_err(|error| error.to_string())?;

    if settings.enabled {
        configure_overlay_window(&overlay)?;
        overlay.show().map_err(|error| error.to_string())?;
    } else {
        overlay.hide().map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn show_overlay_window(app: AppHandle, caller: WebviewWindow) -> Result<(), String> {
    ensure_main_window(&caller)?;
    let overlay = get_overlay_window(&app)?;

    overlay
        .set_ignore_cursor_events(true)
        .map_err(|error| error.to_string())?;
    configure_overlay_window(&overlay)?;
    overlay.show().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn hide_overlay_window(app: AppHandle, caller: WebviewWindow) -> Result<(), String> {
    ensure_main_window(&caller)?;
    let overlay = get_overlay_window(&app)?;

    overlay.hide().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn register_hotkeys(
    app: AppHandle,
    caller: WebviewWindow,
    hotkeys: Vec<HotkeyBinding>,
) -> Result<Vec<HotkeyRegistration>, String> {
    ensure_main_window(&caller)?;

    let shortcut_manager = app.global_shortcut();
    shortcut_manager
        .unregister_all()
        .map_err(|error| error.to_string())?;

    let mut seen_shortcuts = HashSet::new();
    let mut results = Vec::new();

    for binding in hotkeys {
        let action = binding.action.trim().to_string();
        let shortcut = binding.shortcut.trim().to_string();

        if shortcut.is_empty() {
            results.push(HotkeyRegistration {
                action,
                shortcut,
                registered: false,
                message: "未设置".to_string(),
            });
            continue;
        }

        if !is_allowed_hotkey_action(&action) {
            results.push(HotkeyRegistration {
                action,
                shortcut,
                registered: false,
                message: "未知动作".to_string(),
            });
            continue;
        }

        if !seen_shortcuts.insert(normalize_shortcut_identity(&shortcut)) {
            results.push(HotkeyRegistration {
                action,
                shortcut,
                registered: false,
                message: "快捷键重复".to_string(),
            });
            continue;
        }

        let emit_action = action.clone();
        let registration =
            shortcut_manager.on_shortcut(shortcut.as_str(), move |app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    let _ = app.emit("hotkey-action", emit_action.clone());
                }
            });

        match registration {
            Ok(()) => results.push(HotkeyRegistration {
                action,
                shortcut,
                registered: true,
                message: "已注册".to_string(),
            }),
            Err(error) => results.push(HotkeyRegistration {
                action,
                shortcut,
                registered: false,
                message: error.to_string(),
            }),
        }
    }

    Ok(results)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            if let Some(overlay) = app.get_webview_window(OVERLAY_WINDOW_LABEL) {
                overlay.set_ignore_cursor_events(true)?;
                configure_overlay_window(&overlay)?;
                overlay.hide()?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            apply_overlay_settings,
            register_hotkeys,
            show_overlay_window,
            hide_overlay_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running steady-sight overlay");
}
