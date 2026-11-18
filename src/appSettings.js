// App settings for WIWIchat: notification alerts, sound and vibration.
// Persisted locally only, in the same storage as the profile and the LAN
// history. Nothing here is sent over the network.
export const APP_SETTINGS_KEY = 'wiwichat-app-settings-v1';

export function defaultAppSettings() {
  return { notifications: true, sound: true, vibrate: false };
}

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadAppSettings(storage = localStorage) {
  const saved = readJson(storage, APP_SETTINGS_KEY);
  const defaults = defaultAppSettings();
  if (!saved || typeof saved !== 'object') return defaults;
  return {
    notifications: saved.notifications !== false,
    sound: saved.sound !== false,
    vibrate: saved.vibrate === true,
  };
}

export function saveAppSettings(settings, storage = localStorage) {
  const value = {
    notifications: settings.notifications !== false,
    sound: settings.sound !== false,
    vibrate: settings.vibrate === true,
  };
  try {
    storage.setItem(APP_SETTINGS_KEY, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: settings stay in memory for this session.
  }
  return value;
}
