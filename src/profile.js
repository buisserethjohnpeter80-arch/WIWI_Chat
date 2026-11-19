// Local profile management for WIWIchat.
//
// One source of truth for the local user: display name, device name,
// optional photo (local only, never sent over LAN in v1 — the LAN
// protocol carries name + peer id only), and the stable peer id
// (WIWI- + 20 hex). The LAN identity key is kept as a mirror so the
// existing LanService / native plugin keep working unchanged.
//
// No email, phone number or password is ever asked for, and nothing
// is registered on any internet server.
import { isPeerId, makeIdentity, validateName } from './lanProtocol.js';

export const PROFILE_KEY = 'wiwichat-profile-v1';
export const LEGACY_IDENTITY_KEY = 'wiwi-lan-identity-v1';
export const MAX_PHOTO_BYTES = 500 * 1024;

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isValidProfile(value) {
  return (
    value &&
    typeof value.displayName === 'string' &&
    value.displayName.trim().length > 0 &&
    value.displayName.trim().length <= 32 &&
    isPeerId(value.peerId)
  );
}

function normalizeProfile(value) {
  return {
    displayName: validateName(value.displayName),
    deviceName: validateName(value.deviceName || 'My phone'),
    photo: typeof value.photo === 'string' && value.photo.startsWith('data:image/') ? value.photo : null,
    peerId: value.peerId,
    onboarded: value.onboarded === true,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

// Load the saved profile, or adopt a valid profile from an older
// version (a v0.2 LAN identity with a custom name), or null when the
// user still needs onboarding. A default "My phone" identity that
// was auto-created by v0.2 is NOT treated as a finished profile:
// that user has never chosen a name, so onboarding is shown.
export function loadProfile(storage = localStorage) {
  const saved = readJson(storage, PROFILE_KEY);
  if (isValidProfile(saved)) return normalizeProfile(saved);

  const legacy = readJson(storage, LEGACY_IDENTITY_KEY);
  if (isPeerId(legacy?.id) && typeof legacy.name === 'string') {
    const name = legacy.name.trim();
    if (name && name !== 'My phone') {
      const adopted = normalizeProfile({
        displayName: name,
        deviceName: 'My phone',
        photo: null,
        peerId: legacy.id,
        onboarded: true,
      });
      try {
        saveProfile(adopted, storage);
      } catch {
        // The mirror write failed (storage unavailable): the adopted
        // profile still works for this session, and the next save
        // retries it. Never fail the launch over the mirror.
      }
      return adopted;
    }
  }
  return null;
}

export function saveProfile(profile, storage = localStorage) {
  const normalized = normalizeProfile(profile);
  try {
    storage.setItem(PROFILE_KEY, JSON.stringify(normalized));
    // Mirror the LAN identity so LanService and the native plugin use
    // exactly the same id and advertised name.
    storage.setItem(
      LEGACY_IDENTITY_KEY,
      JSON.stringify({ id: normalized.peerId, name: normalized.displayName }),
    );
  } catch {
    // Quota exceeded, or storage blocked/disabled: the caller shows
    // this message and keeps the form, so nothing the user typed is lost.
    throw new Error('Could not save your profile. Storage is unavailable — check your browser settings and try again.');
  }
  return normalized;
}

export function createProfile({ displayName, deviceName, photo, peerId }, storage = localStorage) {
  const id = isPeerId(peerId) ? peerId : makeIdentity().id;
  return saveProfile(
    {
      displayName: validateName(displayName),
      deviceName: deviceName ? validateName(deviceName) : 'My phone',
      photo: photo || null,
      peerId: id,
      onboarded: false,
    },
    storage,
  );
}

export function updateProfile(patch, storage = localStorage) {
  const current = loadProfile(storage);
  if (!current) throw new Error('No profile to update');
  return saveProfile({ ...current, ...patch }, storage);
}

export function completeOnboarding(storage = localStorage) {
  const current = loadProfile(storage);
  if (!current) throw new Error('No profile to complete');
  return saveProfile({ ...current, onboarded: true }, storage);
}

export function isOnboarded(profile) {
  return Boolean(profile && profile.onboarded === true);
}

// Probe whether local storage can actually be written. Some browsers
// and phones block it (private mode, disabled cookies/storage): reads
// then return null and writes throw, so the app must show a
// recoverable error instead of crashing at startup. The probe key is
// removed again right away and never holds user data.
export function storageUsable(storage = localStorage) {
  try {
    storage.setItem('__wiwichat-probe__', '1');
    storage.removeItem('__wiwichat-probe__');
    return true;
  } catch {
    return false;
  }
}

// A profile photo is a data URL chosen by the user on this device.
// It is stored locally only and is never uploaded anywhere.
export function validatePhotoDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    throw new Error('Choose an image file');
  }
  if (dataUrl.length > MAX_PHOTO_BYTES) {
    throw new Error('Photo is too large. Choose a smaller image.');
  }
  return dataUrl;
}
