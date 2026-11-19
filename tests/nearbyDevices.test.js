import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDiscoveredPeers, createNearbyDevices } from '../src/nearbyDevices.js';
import { LanChatStore } from '../src/lanStore.js';

function fakeStorage() {
  const cache = new Map();
  return {
    getItem: (k) => cache.get(k) || null,
    setItem: (k, v) => cache.set(k, v),
    removeItem: (k) => cache.delete(k),
  };
}

const peer = 'WIWI-abcdef0123456789abcd';
const peer2 = 'WIWI-0123456789abcdef0123';

test('discovery adds devices to the nearby list, keyed by stable id', () => {
  const nearby = createNearbyDevices();
  applyDiscoveredPeers(nearby, [{ id: peer, name: 'Marie' }, { id: peer2, name: 'Paul' }]);
  assert.equal(nearby.size, 2);
  assert.equal(nearby.get(peer).name, 'Marie');
});

test('re-discovery updates the name instead of duplicating the device', () => {
  const nearby = createNearbyDevices();
  applyDiscoveredPeers(nearby, [{ id: peer, name: 'Marie' }]);
  applyDiscoveredPeers(nearby, [{ id: peer, name: 'Marie L.' }]);
  applyDiscoveredPeers(nearby, [{ id: peer, name: 'Marie L.' }]);
  assert.equal(nearby.size, 1);
  assert.equal(nearby.get(peer).name, 'Marie L.');
});

test('a device missing from the new snapshot has disconnected and leaves the list', () => {
  const nearby = createNearbyDevices();
  applyDiscoveredPeers(nearby, [{ id: peer, name: 'Marie' }, { id: peer2, name: 'Paul' }]);
  applyDiscoveredPeers(nearby, [{ id: peer2, name: 'Paul' }]);
  assert.equal(nearby.size, 1);
  assert.equal(nearby.has(peer), false);
  assert.equal(nearby.has(peer2), true);
});

test('an empty snapshot clears the nearby list', () => {
  const nearby = createNearbyDevices();
  applyDiscoveredPeers(nearby, [{ id: peer, name: 'Marie' }]);
  applyDiscoveredPeers(nearby, []);
  assert.equal(nearby.size, 0);
});

test('entries without a device id are ignored', () => {
  const nearby = createNearbyDevices();
  applyDiscoveredPeers(nearby, [null, {}, { name: 'No id' }, { id: peer, name: 'Marie' }]);
  assert.equal(nearby.size, 1);
});

test('discovery never creates or touches persisted conversations', () => {
  const storage = fakeStorage();
  const history = new LanChatStore(storage);
  const nearby = createNearbyDevices();
  applyDiscoveredPeers(nearby, [{ id: peer, name: 'Marie' }]);
  applyDiscoveredPeers(nearby, [{ id: peer, name: 'Marie' }, { id: peer2, name: 'Paul' }]);
  applyDiscoveredPeers(nearby, []);
  assert.equal(history.chats.length, 0);
  assert.equal(storage.getItem('wiwichat-lan-chats-v1'), null);
  assert.equal(nearby.size, 0);
});
