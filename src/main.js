import {
  DEFAULT_SETTINGS,
  DEFAULT_HOTKEYS,
  HOTKEY_ACTIONS,
  PROFILES,
  applyOverlayVisual,
  normalizeSettings,
  profileName,
  readStoredHotkeys,
  readStoredSettings,
  storeHotkeys,
  storeSettings
} from "./settings.js";

const previewOverlay = document.querySelector("#previewOverlay");
const eventLog = document.querySelector("#eventLog");
const runtimeDot = document.querySelector("#runtimeDot");
const runtimeLabel = document.querySelector("#runtimeLabel");
const statusPill = document.querySelector("#statusPill");
const modeReadout = document.querySelector("#modeReadout");
const clickReadout = document.querySelector("#clickReadout");
const layerReadout = document.querySelector("#layerReadout");
const toggleOverlayLabel = document.querySelector("#toggleOverlayLabel");
const previewOverlayLabel = document.querySelector("#previewOverlayLabel");
const layerSummary = document.querySelector("#layerSummary");
const anchorSummary = document.querySelector("#anchorSummary");
const guideSummary = document.querySelector("#guideSummary");
const maskSummary = document.querySelector("#maskSummary");
const hotkeyEditor = document.querySelector("#hotkeyEditor");
const hotkeyStatusPill = document.querySelector("#hotkeyStatusPill");

let settings = readStoredSettings();
let hotkeys = readStoredHotkeys();
let hotkeyStatuses = new Map();
let recordingHotkey = null;
let overlayPreviewVisible = false;
let browserPreviewWindow = null;
let temporarilyHidden = false;

const isTauri = Boolean(window.__TAURI__?.core?.invoke);
const invoke = (command, args = {}) => {
  if (!isTauri) return Promise.resolve(null);
  return window.__TAURI__.core.invoke(command, args);
};
const isMacPlatform = /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
const modifierCodes = new Set([
  "AltLeft",
  "AltRight",
  "ControlLeft",
  "ControlRight",
  "MetaLeft",
  "MetaRight",
  "ShiftLeft",
  "ShiftRight"
]);
const profileHotkeyActions = {
  "profile-soft": "soft",
  "profile-focus": "focus",
  "profile-strong": "strong",
  "profile-reference": "reference",
  "profile-modeling": "modeling"
};

function logEvent(text) {
  const item = document.createElement("li");
  const now = new Date();
  item.textContent = `${now.toLocaleTimeString("zh-CN", { hour12: false })}  ${text}`;
  eventLog.prepend(item);

  while (eventLog.children.length > 6) {
    eventLog.lastElementChild.remove();
  }
}

function formatValue(key, value) {
  if (key.endsWith("Opacity") || key === "vignetteStrength") return `${value}%`;
  if (key === "anchorSize") return `${value}px`;
  if (key === "guideThickness") return `${value}px`;
  if (key === "guideGap") return `${value}vmin`;
  return value;
}

function hotkeyActionLabel(action) {
  return HOTKEY_ACTIONS.find((item) => item.action === action)?.label || action;
}

function normalizeHotkeyIdentity(shortcut) {
  return hotkeyTokens(shortcut).map(canonicalHotkeyToken).join("+");
}

function hotkeyTokens(shortcut) {
  return shortcut
    .split("+")
    .map((token) => token.trim())
    .filter(Boolean);
}

function isModifierToken(token) {
  return [
    "alt",
    "cmd",
    "cmdorcontrol",
    "cmdorctrl",
    "command",
    "commandorcontrol",
    "commandorctrl",
    "control",
    "ctrl",
    "option",
    "shift",
    "super"
  ].includes(token.toLowerCase());
}

function canonicalHotkeyToken(token) {
  const lower = token.trim().toLowerCase();
  const aliases = {
    alt: "alt",
    cmd: "super",
    cmdorcontrol: "commandorcontrol",
    cmdorctrl: "commandorcontrol",
    command: "super",
    commandorcontrol: "commandorcontrol",
    commandorctrl: "commandorcontrol",
    control: "control",
    ctrl: "control",
    option: "alt",
    shift: "shift",
    super: "super"
  };

  if (aliases[lower]) return aliases[lower];
  if (/^key[a-z]$/.test(lower)) return lower.slice(3);
  if (/^digit[0-9]$/.test(lower)) return lower.slice(5);
  return lower;
}

function validateHotkeyShortcut(action, shortcut, sourceHotkeys = hotkeys) {
  if (!shortcut) return { ok: true };

  const tokens = hotkeyTokens(shortcut);
  const hasModifier = tokens.slice(0, -1).some(isModifierToken);

  if (tokens.length < 2 || !hasModifier) {
    return { ok: false, message: "至少包含一个修饰键" };
  }

  const identity = normalizeHotkeyIdentity(shortcut);
  const duplicate = HOTKEY_ACTIONS.find(({ action: otherAction }) => {
    if (otherAction === action) return false;
    const otherShortcut = sourceHotkeys[otherAction];
    return otherShortcut && normalizeHotkeyIdentity(otherShortcut) === identity;
  });

  if (duplicate) {
    return { ok: false, message: `和「${duplicate.label}」重复` };
  }

  return { ok: true };
}

function normalizeKeyboardCode(code) {
  if (/^Key[A-Z]$/.test(code) || /^Digit[0-9]$/.test(code) || /^F([1-9]|1[0-9]|2[0-4])$/.test(code)) {
    return code;
  }

  if (/^Numpad[0-9]$/.test(code)) {
    return code;
  }

  const supportedCodes = new Set([
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "Backquote",
    "Backslash",
    "Backspace",
    "BracketLeft",
    "BracketRight",
    "CapsLock",
    "Comma",
    "Delete",
    "End",
    "Enter",
    "Equal",
    "Escape",
    "Home",
    "Insert",
    "Minus",
    "NumpadAdd",
    "NumpadDecimal",
    "NumpadDivide",
    "NumpadEnter",
    "NumpadEqual",
    "NumpadMultiply",
    "NumpadSubtract",
    "PageDown",
    "PageUp",
    "Pause",
    "Period",
    "PrintScreen",
    "Quote",
    "ScrollLock",
    "Semicolon",
    "Slash",
    "Space",
    "Tab"
  ]);

  return supportedCodes.has(code) ? code : "";
}

function shortcutFromKeyboardEvent(event) {
  if (modifierCodes.has(event.code)) return "";

  const keyCode = normalizeKeyboardCode(event.code);
  if (!keyCode) return "";

  const parts = [];

  if ((isMacPlatform && event.metaKey) || (!isMacPlatform && event.ctrlKey)) {
    parts.push("CommandOrControl");
  }

  if (isMacPlatform && event.ctrlKey) {
    parts.push("Control");
  }

  if (!isMacPlatform && event.metaKey) {
    parts.push("Super");
  }

  if (event.altKey) {
    parts.push("Alt");
  }

  if (event.shiftKey) {
    parts.push("Shift");
  }

  if (!parts.length) return "";

  return [...parts, keyCode].join("+");
}

function displayHotkeyToken(token) {
  const labels = {
    Alt: "⌥/Alt",
    Command: "⌘",
    Cmd: "⌘",
    CommandOrControl: "⌘/Ctrl",
    Control: "Ctrl",
    Ctrl: "Ctrl",
    Option: "⌥/Alt",
    Shift: "⇧",
    Super: "Win",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    Backquote: "`",
    Backslash: "\\",
    Backspace: "Backspace",
    BracketLeft: "[",
    BracketRight: "]",
    CapsLock: "Caps",
    Comma: ",",
    Delete: "Delete",
    End: "End",
    Enter: "Enter",
    Equal: "=",
    Escape: "Esc",
    Home: "Home",
    Insert: "Insert",
    Minus: "-",
    NumpadAdd: "Num +",
    NumpadDecimal: "Num .",
    NumpadDivide: "Num /",
    NumpadEnter: "Num Enter",
    NumpadEqual: "Num =",
    NumpadMultiply: "Num *",
    NumpadSubtract: "Num -",
    PageDown: "PgDn",
    PageUp: "PgUp",
    Pause: "Pause",
    Period: ".",
    PrintScreen: "PrtSc",
    Quote: "'",
    ScrollLock: "ScrLk",
    Semicolon: ";",
    Slash: "/",
    Space: "Space",
    Tab: "Tab"
  };

  if (/^Key[A-Z]$/.test(token)) return token.slice(3);
  if (/^Digit[0-9]$/.test(token)) return token.slice(5);
  if (/^Numpad[0-9]$/.test(token)) return `Num ${token.slice(6)}`;
  return labels[token] || token;
}

function appendHotkeyCode(target, shortcut) {
  target.replaceChildren();

  if (!shortcut) {
    const empty = document.createElement("span");
    empty.className = "hotkey-empty";
    empty.textContent = "未设置";
    target.append(empty);
    return;
  }

  for (const token of hotkeyTokens(shortcut)) {
    const key = document.createElement("kbd");
    key.textContent = displayHotkeyToken(token);
    target.append(key);
  }
}

function hotkeyStatusForAction(action) {
  if (recordingHotkey === action) {
    return hotkeyStatuses.get(action) || { state: "recording", message: "按下组合键" };
  }

  if (!hotkeys[action]) {
    return { state: "disabled", message: "未设置" };
  }

  return hotkeyStatuses.get(action) || {
    state: isTauri ? "pending" : "preview",
    message: isTauri ? "待注册" : "仅桌面版生效"
  };
}

function updateHotkeyStatusPill() {
  if (!hotkeyStatusPill) return;

  const statuses = HOTKEY_ACTIONS.map(({ action }) => hotkeyStatusForAction(action));
  const failed = statuses.some((status) => status.state === "failed");
  const activeCount = statuses.filter((status) => status.state === "registered").length;
  const enabledCount = HOTKEY_ACTIONS.filter(({ action }) => hotkeys[action]).length;

  hotkeyStatusPill.classList.toggle("running", activeCount > 0 && !failed);
  hotkeyStatusPill.classList.toggle("error", failed);
  hotkeyStatusPill.classList.toggle("muted", !isTauri || enabledCount === 0);

  if (recordingHotkey) {
    hotkeyStatusPill.textContent = "录制中";
  } else if (failed) {
    hotkeyStatusPill.textContent = "需处理";
  } else if (!isTauri) {
    hotkeyStatusPill.textContent = "浏览器预览";
  } else {
    hotkeyStatusPill.textContent = `${activeCount}/${enabledCount} 已注册`;
  }
}

function renderHotkeyEditor() {
  if (!hotkeyEditor) return;

  const rows = HOTKEY_ACTIONS.map(({ action, label, detail }) => {
    const shortcut = hotkeys[action];
    const status = hotkeyStatusForAction(action);
    const row = document.createElement("div");
    row.className = `hotkey-row is-${status.state}`;
    row.dataset.hotkeyRow = action;

    const meta = document.createElement("div");
    meta.className = "hotkey-meta";

    const title = document.createElement("strong");
    title.textContent = label;

    const description = document.createElement("span");
    description.textContent = detail;

    meta.append(title, description);

    const capture = document.createElement("button");
    capture.className = "hotkey-capture";
    capture.type = "button";
    capture.dataset.hotkeyRecord = action;
    capture.setAttribute("aria-label", `录制${label}快捷键`);
    appendHotkeyCode(capture, shortcut);

    const state = document.createElement("span");
    state.className = "hotkey-state";
    state.textContent = status.message;

    const controls = document.createElement("div");
    controls.className = "hotkey-controls";

    const clear = document.createElement("button");
    clear.className = "ghost-action compact-action";
    clear.type = "button";
    clear.dataset.hotkeyClear = action;
    clear.textContent = "清除";
    clear.disabled = !shortcut;

    const reset = document.createElement("button");
    reset.className = "ghost-action compact-action";
    reset.type = "button";
    reset.dataset.hotkeyReset = action;
    reset.textContent = "默认";
    reset.disabled = shortcut === DEFAULT_HOTKEYS[action];

    controls.append(clear, reset);
    row.append(meta, capture, state, controls);
    return row;
  });

  hotkeyEditor.replaceChildren(...rows);
  updateHotkeyStatusPill();
}

async function registerHotkeys(reason = "快捷键已更新") {
  const nextStatuses = new Map();
  const bindings = [];

  for (const { action } of HOTKEY_ACTIONS) {
    const shortcut = hotkeys[action];

    if (!shortcut) {
      nextStatuses.set(action, { state: "disabled", message: "未设置" });
      continue;
    }

    const validation = validateHotkeyShortcut(action, shortcut);
    if (!validation.ok) {
      nextStatuses.set(action, { state: "failed", message: validation.message });
      continue;
    }

    bindings.push({ action, shortcut });
    nextStatuses.set(action, {
      state: isTauri ? "pending" : "preview",
      message: isTauri ? "待注册" : "仅桌面版生效"
    });
  }

  if (!isTauri) {
    hotkeyStatuses = nextStatuses;
    renderHotkeyEditor();
    return;
  }

  try {
    const results = await invoke("register_hotkeys", { hotkeys: bindings });

    for (const result of results || []) {
      nextStatuses.set(result.action, {
        state: result.registered ? "registered" : "failed",
        message: result.message
      });
    }

    hotkeyStatuses = nextStatuses;
    renderHotkeyEditor();
    logEvent(reason);
  } catch (error) {
    for (const { action } of HOTKEY_ACTIONS) {
      if (hotkeys[action]) {
        nextStatuses.set(action, { state: "failed", message: `注册失败：${error}` });
      }
    }

    hotkeyStatuses = nextStatuses;
    renderHotkeyEditor();
    logEvent(`快捷键同步失败：${error}`);
  }
}

function setHotkey(action, shortcut, reason) {
  recordingHotkey = null;
  const nextHotkeys = { ...hotkeys, [action]: shortcut };
  const validation = validateHotkeyShortcut(action, shortcut, nextHotkeys);

  if (!validation.ok) {
    hotkeyStatuses.set(action, { state: "failed", message: validation.message });
    renderHotkeyEditor();
    logEvent(`快捷键未保存：${validation.message}`);
    return;
  }

  hotkeys = nextHotkeys;
  storeHotkeys(hotkeys);
  registerHotkeys(reason);
}

function startHotkeyRecording(action) {
  recordingHotkey = action;
  hotkeyStatuses.set(action, { state: "recording", message: "按下组合键" });
  renderHotkeyEditor();
}

function handleHotkeyCapture(event) {
  if (!recordingHotkey) return;

  event.preventDefault();
  event.stopPropagation();

  if (event.key === "Escape") {
    recordingHotkey = null;
    renderHotkeyEditor();
    logEvent("快捷键录制已取消");
    return;
  }

  const shortcut = shortcutFromKeyboardEvent(event);

  if (!shortcut) {
    hotkeyStatuses.set(recordingHotkey, { state: "recording", message: "这个按键暂不支持" });
    renderHotkeyEditor();
    return;
  }

  const action = recordingHotkey;
  recordingHotkey = null;
  setHotkey(action, shortcut, `快捷键已更新：${hotkeyActionLabel(action)}`);
}

function syncControls() {
  for (const control of document.querySelectorAll("[data-setting]")) {
    const key = control.dataset.setting;

    if (control.type === "checkbox") {
      control.checked = Boolean(settings[key]);
    } else {
      control.value = settings[key];
    }
  }

  for (const output of document.querySelectorAll("[data-output]")) {
    const key = output.dataset.output;
    output.value = formatValue(key, settings[key]);
    output.textContent = output.value;
  }

  for (const button of document.querySelectorAll("[data-profile]")) {
    button.classList.toggle("active", button.dataset.profile === settings.profile);
  }

  for (const swatch of document.querySelectorAll("[data-color]")) {
    swatch.classList.toggle("active", swatch.dataset.color === settings.anchorColor);
  }

  for (const swatch of document.querySelectorAll("[data-guide-color]")) {
    swatch.classList.toggle("active", swatch.dataset.guideColor === settings.guideColor);
  }
}

function updateReadouts() {
  const hasVisibleIntent = settings.enabled || overlayPreviewVisible;
  statusPill.textContent = temporarilyHidden && hasVisibleIntent ? "已隐藏" : settings.enabled ? "运行中" : "未启动";
  statusPill.classList.toggle("running", settings.enabled && !temporarilyHidden);
  toggleOverlayLabel.textContent = settings.enabled ? "关闭 Overlay" : "启动 Overlay";
  previewOverlayLabel.textContent = overlayPreviewVisible ? "关闭预览" : "预览窗口";
  modeReadout.textContent = profileName(settings.profile);
  clickReadout.textContent = settings.clickThrough ? "穿透" : "拦截";
  layerReadout.textContent = temporarilyHidden && hasVisibleIntent ? "快捷隐藏" : settings.enabled ? "显示" : overlayPreviewVisible ? "预览" : "隐藏";

  const layers = [
    settings.anchor && "中心锚点",
    settings.stabilizer && "稳定参照",
    settings.edgeMarkers && "边缘方向块",
    settings.horizon && "水平线",
    settings.vignette && "暗角",
    settings.grid && "网格",
    settings.edgeFrame && "边缘框"
  ].filter(Boolean);

  const anchorNames = {
    dot: "圆点",
    cross: "准星",
    ring: "圆环"
  };
  const guideNames = {
    domeCross: "圆角条 + 十字",
    boxCircle: "方条 + 圆环",
    edgeArrows: "边缘箭头"
  };

  layerSummary.textContent = layers.length ? layers.join("、") : "无视觉层";
  anchorSummary.textContent = `${anchorNames[settings.anchorStyle]} / ${settings.anchorSize}px / ${settings.anchorOpacity}%`;
  guideSummary.textContent = `${guideNames[settings.guideStyle]} / ${settings.guideThickness}px / ${settings.guideOpacity}%`;
  maskSummary.textContent = settings.vignette ? `暗角 ${settings.vignetteStrength}%` : "暗角关闭";
}

async function applySettings(reason = "设置已更新") {
  settings = normalizeSettings(settings);
  storeSettings(settings);
  applyOverlayVisual(previewOverlay, { ...settings, enabled: true });
  syncControls();
  updateReadouts();

  try {
    const overlaySettings = {
      ...settings,
      enabled: (settings.enabled || overlayPreviewVisible) && !temporarilyHidden
    };
    await invoke("apply_overlay_settings", { settings: overlaySettings });
    logEvent(isTauri ? reason : `${reason}，当前为浏览器预览`);
  } catch (error) {
    logEvent(`桌面层同步失败：${error}`);
  }
}

function updateSettingFromControl(control) {
  const key = control.dataset.setting;
  if (control.type === "checkbox") {
    settings[key] = control.checked;
  } else if (control.type === "range") {
    settings[key] = Number(control.value);
  } else {
    settings[key] = control.value;
  }
}

function setProfile(profile) {
  settings = normalizeSettings({ ...settings, ...PROFILES[profile], profile });
  applySettings(`已切换到${profileName(profile)}模式`);
}

function bindControls() {
  document.addEventListener("input", (event) => {
    const control = event.target.closest("[data-setting]");
    if (!control) return;
    updateSettingFromControl(control);
    applySettings();
  });

  document.addEventListener("change", (event) => {
    const control = event.target.closest("[data-setting]");
    if (!control) return;
    updateSettingFromControl(control);
    applySettings();
  });

  document.addEventListener("click", (event) => {
    const profileButton = event.target.closest("[data-profile]");
    if (profileButton) {
      setProfile(profileButton.dataset.profile);
      return;
    }

    const swatch = event.target.closest("[data-color]");
    if (swatch) {
      settings.anchorColor = swatch.dataset.color;
      applySettings("锚点颜色已更新");
      return;
    }

    const guideSwatch = event.target.closest("[data-guide-color]");
    if (guideSwatch) {
      settings.guideColor = guideSwatch.dataset.guideColor;
      applySettings("参照颜色已更新");
      return;
    }

    const panelShortcut = event.target.closest("[data-panel-shortcut]");
    if (panelShortcut) {
      showPanel(panelShortcut.dataset.panelShortcut);
      return;
    }

    const hotkeyRecord = event.target.closest("[data-hotkey-record]");
    if (hotkeyRecord) {
      startHotkeyRecording(hotkeyRecord.dataset.hotkeyRecord);
      return;
    }

    const hotkeyClear = event.target.closest("[data-hotkey-clear]");
    if (hotkeyClear) {
      setHotkey(hotkeyClear.dataset.hotkeyClear, "", `快捷键已清除：${hotkeyActionLabel(hotkeyClear.dataset.hotkeyClear)}`);
      return;
    }

    const hotkeyReset = event.target.closest("[data-hotkey-reset]");
    if (hotkeyReset) {
      const action = hotkeyReset.dataset.hotkeyReset;
      setHotkey(action, DEFAULT_HOTKEYS[action], `快捷键已恢复默认：${hotkeyActionLabel(action)}`);
      return;
    }

    const resetHotkeys = event.target.closest("#resetHotkeysBtn");
    if (resetHotkeys) {
      recordingHotkey = null;
      hotkeys = { ...DEFAULT_HOTKEYS };
      storeHotkeys(hotkeys);
      registerHotkeys("快捷键已全部恢复默认");
      return;
    }
  });

  document.querySelector("#toggleOverlayBtn").addEventListener("click", () => {
    overlayPreviewVisible = false;
    temporarilyHidden = false;
    settings.enabled = !settings.enabled;
    applySettings(settings.enabled ? "Overlay 已启动" : "Overlay 已关闭");
  });

  document.querySelector("#openOverlayBtn").addEventListener("click", async () => {
    if (isTauri) {
      overlayPreviewVisible = !overlayPreviewVisible;
      temporarilyHidden = false;
      await applySettings(overlayPreviewVisible ? "预览窗口已显示" : "预览窗口已关闭");
      return;
    }

    if (browserPreviewWindow && !browserPreviewWindow.closed) {
      browserPreviewWindow.close();
      browserPreviewWindow = null;
      overlayPreviewVisible = false;
      updateReadouts();
      logEvent("浏览器 overlay 预览窗口已关闭");
      return;
    }

    browserPreviewWindow = window.open("./overlay.html?preview=1", "steady-sight-overlay", "popup,width=980,height=620");
    overlayPreviewVisible = true;
    updateReadouts();
    logEvent("已打开浏览器 overlay 预览窗口");
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      showPanel(button.dataset.panel);
    });
  });

  if (window.__TAURI__?.event?.listen) {
    window.__TAURI__.event.listen("hotkey-action", (event) => {
      handleHotkeyAction(event.payload);
    });
  }

  document.addEventListener("keydown", handleHotkeyCapture, true);
}

function handleHotkeyAction(action) {
  if (action === "toggle-overlay") {
    overlayPreviewVisible = false;
    temporarilyHidden = false;
    settings.enabled = !settings.enabled;
    applySettings(settings.enabled ? "快捷键：Overlay 已启动" : "快捷键：Overlay 已关闭");
    return;
  }

  if (action === "toggle-preview") {
    overlayPreviewVisible = !overlayPreviewVisible;
    temporarilyHidden = false;
    applySettings(overlayPreviewVisible ? "快捷键：预览已显示" : "快捷键：预览已关闭");
    return;
  }

  if (action === "toggle-temporary-hide") {
    if (!settings.enabled && !overlayPreviewVisible) {
      logEvent("快捷键：当前没有可隐藏的 overlay");
      return;
    }
    temporarilyHidden = !temporarilyHidden;
    applySettings(temporarilyHidden ? "快捷键：Overlay 已临时隐藏" : "快捷键：Overlay 已恢复");
    return;
  }

  if (action === "toggle-click-through") {
    settings.clickThrough = !settings.clickThrough;
    applySettings(settings.clickThrough ? "快捷键：已开启点击穿透" : "快捷键：已关闭点击穿透");
    return;
  }

  const profile = profileHotkeyActions[action];
  if (profile) {
    setProfile(profile);
    logEvent(`快捷键：已切换到${profileName(profile)}模式`);
    return;
  }
}

function showPanel(panel) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.panel === panel);
  });
  document.querySelectorAll("[data-panel-view]").forEach((view) => {
    view.classList.toggle("active", view.dataset.panelView === panel);
  });
}

function boot() {
  if (isTauri) {
    runtimeDot.classList.add("online");
    runtimeLabel.textContent = "Tauri 桌面";
  }

  if (!localStorage.getItem("steady-sight-overlay-settings")) {
    settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...PROFILES.focus });
  }

  bindControls();
  renderHotkeyEditor();
  registerHotkeys("快捷键已就绪");
  applySettings("应用已就绪");
}

boot();
