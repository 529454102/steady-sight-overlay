export const STORAGE_KEY = "steady-sight-overlay-settings";
export const HOTKEY_STORAGE_KEY = "steady-sight-overlay-hotkeys";

export const HOTKEY_ACTIONS = [
  {
    action: "toggle-overlay",
    label: "开关 Overlay",
    detail: "启动或关闭桌面悬浮视觉层"
  },
  {
    action: "toggle-temporary-hide",
    label: "临时隐藏",
    detail: "保留启动状态，短时隐藏或恢复"
  },
  {
    action: "toggle-preview",
    label: "预览开关",
    detail: "打开或关闭真实桌面预览"
  },
  {
    action: "toggle-click-through",
    label: "点击穿透",
    detail: "切换鼠标是否穿透到游戏"
  },
  {
    action: "profile-soft",
    label: "轻缓模式",
    detail: "切换到低强度暗角和少量参照"
  },
  {
    action: "profile-focus",
    label: "FPS 专注",
    detail: "切换到准星、水平线和中等暗角"
  },
  {
    action: "profile-strong",
    label: "强辅助",
    detail: "切换到网格、边缘框和转向脉冲"
  },
  {
    action: "profile-reference",
    label: "彩色参照",
    detail: "切换到高可见度稳定杆和方向块"
  },
  {
    action: "profile-modeling",
    label: "3D 建模",
    detail: "切换到圆环锚点和弱网格参照"
  }
];

export const DEFAULT_HOTKEYS = {
  "toggle-overlay": "CommandOrControl+Shift+O",
  "toggle-temporary-hide": "CommandOrControl+Shift+H",
  "toggle-preview": "CommandOrControl+Shift+P",
  "toggle-click-through": "",
  "profile-soft": "CommandOrControl+Shift+1",
  "profile-focus": "CommandOrControl+Shift+2",
  "profile-strong": "CommandOrControl+Shift+3",
  "profile-reference": "",
  "profile-modeling": ""
};

export const DEFAULT_SETTINGS = {
  enabled: false,
  clickThrough: true,
  anchor: true,
  horizon: true,
  vignette: true,
  grid: false,
  edgeFrame: false,
  stabilizer: true,
  edgeMarkers: true,
  motionPulse: false,
  anchorStyle: "dot",
  anchorColor: "#f8fafc",
  anchorSize: 14,
  anchorOpacity: 84,
  guideStyle: "domeCross",
  guideColor: "#c8b92f",
  guideOpacity: 34,
  guideThickness: 22,
  guideGap: 14,
  vignetteStrength: 36,
  horizonOpacity: 34,
  gridOpacity: 18,
  profile: "focus"
};

export const PROFILES = {
  soft: {
    profile: "soft",
    anchor: true,
    horizon: false,
    vignette: true,
    grid: false,
    edgeFrame: false,
    stabilizer: true,
    edgeMarkers: false,
    motionPulse: false,
    anchorStyle: "dot",
    anchorColor: "#f8fafc",
    guideStyle: "domeCross",
    guideColor: "#c8b92f",
    guideOpacity: 24,
    guideThickness: 16,
    guideGap: 17,
    anchorSize: 10,
    anchorOpacity: 70,
    vignetteStrength: 22,
    horizonOpacity: 18,
    gridOpacity: 10
  },
  focus: {
    profile: "focus",
    anchor: true,
    horizon: true,
    vignette: true,
    grid: false,
    edgeFrame: false,
    stabilizer: true,
    edgeMarkers: true,
    motionPulse: false,
    anchorStyle: "cross",
    anchorColor: "#f8fafc",
    guideStyle: "domeCross",
    guideColor: "#c8b92f",
    guideOpacity: 34,
    guideThickness: 22,
    guideGap: 14,
    anchorSize: 16,
    anchorOpacity: 86,
    vignetteStrength: 36,
    horizonOpacity: 34,
    gridOpacity: 16
  },
  strong: {
    profile: "strong",
    anchor: true,
    horizon: true,
    vignette: true,
    grid: true,
    edgeFrame: true,
    stabilizer: true,
    edgeMarkers: true,
    motionPulse: true,
    anchorStyle: "ring",
    anchorColor: "#00d4ff",
    guideStyle: "boxCircle",
    guideColor: "#00d4ff",
    guideOpacity: 58,
    guideThickness: 30,
    guideGap: 12,
    anchorSize: 24,
    anchorOpacity: 92,
    vignetteStrength: 58,
    horizonOpacity: 50,
    gridOpacity: 28
  },
  reference: {
    profile: "reference",
    anchor: true,
    horizon: false,
    vignette: false,
    grid: false,
    edgeFrame: false,
    stabilizer: true,
    edgeMarkers: true,
    motionPulse: false,
    anchorStyle: "ring",
    anchorColor: "#00d4ff",
    guideStyle: "boxCircle",
    guideColor: "#00d4ff",
    guideOpacity: 70,
    guideThickness: 32,
    guideGap: 13,
    anchorSize: 22,
    anchorOpacity: 92,
    vignetteStrength: 0,
    horizonOpacity: 0,
    gridOpacity: 0
  },
  modeling: {
    profile: "modeling",
    anchor: true,
    horizon: true,
    vignette: false,
    grid: true,
    edgeFrame: false,
    stabilizer: true,
    edgeMarkers: true,
    motionPulse: false,
    anchorStyle: "ring",
    anchorColor: "#c8b92f",
    guideStyle: "edgeArrows",
    guideColor: "#c8b92f",
    guideOpacity: 42,
    guideThickness: 34,
    guideGap: 20,
    anchorSize: 18,
    anchorOpacity: 78,
    vignetteStrength: 18,
    horizonOpacity: 42,
    gridOpacity: 20
  }
};

const BOOLEAN_KEYS = [
  "enabled",
  "clickThrough",
  "anchor",
  "horizon",
  "vignette",
  "grid",
  "edgeFrame",
  "stabilizer",
  "edgeMarkers",
  "motionPulse"
];

const NUMBER_KEYS = [
  "anchorSize",
  "anchorOpacity",
  "guideOpacity",
  "guideThickness",
  "guideGap",
  "vignetteStrength",
  "horizonOpacity",
  "gridOpacity"
];

export function normalizeSettings(raw = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...raw };

  for (const key of BOOLEAN_KEYS) {
    settings[key] = Boolean(settings[key]);
  }

  for (const key of NUMBER_KEYS) {
    settings[key] = Number(settings[key]);
  }

  if (!["dot", "cross", "ring"].includes(settings.anchorStyle)) {
    settings.anchorStyle = DEFAULT_SETTINGS.anchorStyle;
  }

  if (!["boxCircle", "domeCross", "edgeArrows"].includes(settings.guideStyle)) {
    settings.guideStyle = DEFAULT_SETTINGS.guideStyle;
  }

  if (!/^#[0-9a-f]{6}$/i.test(settings.anchorColor)) {
    settings.anchorColor = DEFAULT_SETTINGS.anchorColor;
  }

  if (!/^#[0-9a-f]{6}$/i.test(settings.guideColor)) {
    settings.guideColor = DEFAULT_SETTINGS.guideColor;
  }

  return settings;
}

export function readStoredSettings() {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function storeSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
}

export function normalizeHotkeys(raw = {}) {
  const hotkeys = {};

  for (const { action } of HOTKEY_ACTIONS) {
    const value = raw[action];
    hotkeys[action] = typeof value === "string" ? value.trim() : DEFAULT_HOTKEYS[action];
  }

  return hotkeys;
}

export function readStoredHotkeys() {
  try {
    return normalizeHotkeys(JSON.parse(localStorage.getItem(HOTKEY_STORAGE_KEY) || "{}"));
  } catch {
    return { ...DEFAULT_HOTKEYS };
  }
}

export function storeHotkeys(hotkeys) {
  localStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify(normalizeHotkeys(hotkeys)));
}

export function applyOverlayVisual(stage, settingsInput) {
  const settings = normalizeSettings(settingsInput);
  stage.style.setProperty("--anchor-color", settings.anchorColor);
  stage.style.setProperty("--anchor-size", `${settings.anchorSize}px`);
  stage.style.setProperty("--anchor-opacity", `${settings.anchorOpacity / 100}`);
  stage.style.setProperty("--guide-color", settings.guideColor);
  stage.style.setProperty("--guide-opacity", `${settings.guideOpacity / 100}`);
  stage.style.setProperty("--guide-thickness", `${settings.guideThickness}px`);
  stage.style.setProperty("--guide-gap", `${settings.guideGap}vmin`);
  stage.style.setProperty("--vignette-strength", `${settings.vignetteStrength / 100}`);
  stage.style.setProperty("--horizon-opacity", `${settings.horizonOpacity / 100}`);
  stage.style.setProperty("--grid-opacity", `${settings.gridOpacity / 100}`);
  stage.dataset.anchorStyle = settings.anchorStyle;
  stage.dataset.guideStyle = settings.guideStyle;

  stage.classList.toggle("show-anchor", settings.anchor);
  stage.classList.toggle("show-horizon", settings.horizon);
  stage.classList.toggle("show-vignette", settings.vignette);
  stage.classList.toggle("show-grid", settings.grid);
  stage.classList.toggle("show-edge-frame", settings.edgeFrame);
  stage.classList.toggle("show-stabilizer", settings.stabilizer);
  stage.classList.toggle("show-edge-markers", settings.edgeMarkers);
  stage.classList.toggle("motion-pulse", settings.motionPulse);
  stage.classList.toggle("is-enabled", settings.enabled);
}

export function profileName(profile) {
  const names = {
    soft: "轻缓",
    focus: "专注",
    strong: "强辅助",
    reference: "彩色参照",
    modeling: "建模"
  };
  return names[profile] || names.focus;
}
