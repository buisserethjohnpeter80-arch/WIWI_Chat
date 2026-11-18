import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completeOnboarding,
  createProfile,
  isOnboarded,
  loadProfile,
  updateProfile,
  validatePhotoDataUrl,
} from '../src/profile.js';
import { migrateDemoData, DEMO_KEY } from '../src/demoMigration.js';
import { GROUP_CHAT_AVAILABLE, createGroup, listGroups } from '../src/groups.js';

function fakeStorage(entries = {}) {
  const cache = new Map(Object.entries(entries));
  return {
    getItem: (k) => (cache.has(k) ? cache.get(k) : null),
    setItem: (k, v) => cache.set(k, v),
    removeItem: (k) => cache.delete(k),
  };
}

const peerId = 'WIWI-abcdef0123456789abcd';

test('fresh install has no profile, so onboarding is required', () => {
  assert.equal(loadProfile(fakeStorage()), null);
});

test('profile is created with a stable WIWI- id, never the user name', () => {
  const storage = fakeStorage();
  const profile = createProfile({ displayName: 'Ana', deviceName: 'Ana Phone', photo: null, peerId }, storage);
  assert.equal(profile.peerId, peerId);
  assert.equal(profile.displayName, 'Ana');
  assert.equal(profile.onboarded, false);
  assert.equal(isOnboarded(profile), false);
  const reloaded = loadProfile(storage);
  assert.equal(reloaded.displayName, 'Ana');
  assert.equal(reloaded.peerId, peerId);
  assert.equal(completeOnboarding(storage).onboarded, true);
  assert.equal(isOnboarded(loadProfile(storage)), true);
});

test('profile can be updated without losing the peer id', () => {
  const storage = fakeStorage();
  createProfile({ displayName: 'Ana', peerId }, storage);
  const updated = updateProfile({ displayName: 'Ana B' }, storage);
  assert.equal(updated.displayName, 'Ana B');
  assert.equal(updated.peerId, peerId);
});

test('a valid older v0.2 identity with a custom name is adopted, not forced through onboarding', () => {
  const storage = fakeStorage({
    'wiwi-lan-identity-v1': JSON.stringify({ id: peerId, name: 'Bob' }),
  });
  const profile = loadProfile(storage);
  assert.equal(profile.displayName, 'Bob');
  assert.equal(profile.peerId, peerId);
  assert.equal(profile.onboarded, true);
});

test('a default My phone identity is not treated as a finished profile', () => {
  const storage = fakeStorage({
    'wiwi-lan-identity-v1': JSON.stringify({ id: peerId, name: 'My phone' }),
  });
  assert.equal(loadProfile(storage), null);
});

test('photo must be an image data URL under the size limit', () => {
  assert.equal(validatePhotoDataUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc');
  assert.throws(() => validatePhotoDataUrl('https://example.com/photo.png'));
  assert.throws(() => validatePhotoDataUrl('data:image/png;base64,' + 'x'.repeat(600 * 1024)));
});

test('migration removes only exact demo ids and keeps real chats', () => {
  const storage = fakeStorage({
    [DEMO_KEY]: JSON.stringify([
      { id: 'sarah', name: 'Sarah', messages: [] },
      { id: 'group12', name: 'Gwoup Klas 12', messages: [] },
      { id: peerId, name: 'Real peer', messages: [{ id: 'm1', text: 'Bonjou' }] },
    ]),
  });
  const result = migrateDemoData(storage);
  assert.equal(result.removed, 2);
  assert.equal(result.kept, 1);
  const kept = JSON.parse(storage.getItem(DEMO_KEY));
  assert.deepEqual(kept.map((c) => c.id), [peerId]);
});

test('migration removes the demo key entirely when only demo data exists', () => {
  const storage = fakeStorage({
    [DEMO_KEY]: JSON.stringify([{ id: 'david', name: 'David', messages: [] }]),
  });
  assert.deepEqual(migrateDemoData(storage), { removed: 1, kept: 0, changed: true });
  assert.equal(storage.getItem(DEMO_KEY), null);
});

test('migration leaves corrupted data alone instead of a general reset', () => {
  const storage = fakeStorage({ [DEMO_KEY]: '{not json' });
  const result = migrateDemoData(storage);
  assert.equal(result.corrupted, true);
  assert.equal(storage.getItem(DEMO_KEY), '{not json');
});

test('group chat is honestly unavailable: no groups, no fake creation', () => {
  assert.equal(GROUP_CHAT_AVAILABLE, false);
  assert.deepEqual(listGroups(), []);
  assert.deepEqual(createGroup(), { ok: false, reason: 'group-chat-not-available' });
});
