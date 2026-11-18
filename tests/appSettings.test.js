import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultAppSettings, loadAppSettings, saveAppSettings } from '../src/appSettings.js';

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

test('defaults: alerts and sound on, vibrate off', () => {
  assert.deepEqual(defaultAppSettings(), { notifications: true, sound: true, vibrate: false });
});

test('empty storage loads the defaults', () => {
  assert.deepEqual(loadAppSettings(fakeStorage()), defaultAppSettings());
});

test('saved settings round-trip', () => {
  const storage = fakeStorage();
  saveAppSettings({ notifications: false, sound: true, vibrate: true }, storage);
  assert.deepEqual(loadAppSettings(storage), { notifications: false, sound: true, vibrate: true });
});

test('corrupted saved JSON falls back to defaults', () => {
  const storage = fakeStorage({ 'wiwichat-app-settings-v1': '{not json' });
  assert.deepEqual(loadAppSettings(storage), defaultAppSettings());
});

test('unknown fields are ignored and missing fields default', () => {
  const storage = fakeStorage({ 'wiwichat-app-settings-v1': JSON.stringify({ sound: false, extra: 1 }) });
  assert.deepEqual(loadAppSettings(storage), { notifications: true, sound: false, vibrate: false });
});

test('saving normalizes partial settings', () => {
  const storage = fakeStorage();
  assert.deepEqual(saveAppSettings({ notifications: false }, storage), { notifications: false, sound: true, vibrate: false });
  assert.deepEqual(loadAppSettings(storage), { notifications: false, sound: true, vibrate: false });
});
