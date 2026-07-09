import {
  STORAGE_KEY,
  applyOverlayVisual,
  normalizeSettings,
  readStoredSettings
} from "./settings.js";

const liveOverlay = document.querySelector("#liveOverlay");
let settings = readStoredSettings();

function render(nextSettings) {
  settings = normalizeSettings(nextSettings);
  applyOverlayVisual(liveOverlay, settings);
}

render(settings);

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  render(JSON.parse(event.newValue));
});

if (window.__TAURI__?.event?.listen) {
  window.__TAURI__.event.listen("overlay-settings", (event) => {
    render(event.payload);
  });
}

setInterval(() => {
  render(readStoredSettings());
}, 1200);
