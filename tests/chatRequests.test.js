import test from 'node:test';
import assert from 'node:assert/strict';
import { LanChatStore } from '../src/lanStore.js';

function fakeStorage(entries = {}) {
  const cache = new Map(Object.entries(entries));
  return {
    getItem: (k) => (cache.has(k) ? cache.get(k) : null),
    setItem: (k, v) => cache.set(k, v),
    removeItem: (k) => cache.delete(k),
  };
}

const peer = 'WIWI-abcdef0123456789abcd';
const peer2 = 'WIWI-0123456789abcdef0123';
const msg = (id, text) => ({ id, text, mine: false, time: '10:00', sentAt: '2026-11-19T10:00:00.000Z', status: 'received' });

test('a first message from someone new becomes a request, not a chat', () => {
  const store = new LanChatStore(fakeStorage());
  assert.equal(store.addRequest(peer, 'Marie', msg('m1', 'Bonjou!')), 'request');
  assert.equal(store.chats.length, 0);
  assert.equal(store.requests.length, 1);
  assert.equal(store.requests[0].messages.length, 1);
  assert.equal(store.get(peer), undefined);
});

test('more messages from the same person join the same request', () => {
  const store = new LanChatStore(fakeStorage());
  store.addRequest(peer, 'Marie', msg('m1', 'Bonjou!'));
  store.addRequest(peer, 'Marie', msg('m2', 'Ou la?'));
  assert.equal(store.requests.length, 1);
  assert.equal(store.requests[0].messages.length, 2);
  assert.equal(store.chats.length, 0);
});

test('a retried message is not duplicated inside the request', () => {
  const store = new LanChatStore(fakeStorage());
  store.addRequest(peer, 'Marie', msg('m1', 'Bonjou!'));
  assert.equal(store.addRequest(peer, 'Marie', msg('m1', 'Bonjou!')), 'duplicate');
  assert.equal(store.requests[0].messages.length, 1);
});

test('accepting moves the hidden messages into a real chat, in order', () => {
  const store = new LanChatStore(fakeStorage());
  store.addRequest(peer, 'Marie', msg('m1', 'Bonjou!'));
  store.addRequest(peer, 'Marie', msg('m2', 'Ou la?'));
  const chat = store.acceptRequest(peer);
  assert.equal(chat.id, peer);
  assert.deepEqual(chat.messages.map((m) => m.text), ['Bonjou!', 'Ou la?']);
  assert.equal(store.requests.length, 0);
  assert.equal(store.chats.length, 1);
});

test('declining deletes the request and blocks the sender locally', () => {
  const store = new LanChatStore(fakeStorage());
  store.addRequest(peer, 'Marie', msg('m1', 'Bonjou!'));
  assert.equal(store.declineRequest(peer), true);
  assert.equal(store.requests.length, 0);
  assert.equal(store.chats.length, 0);
  assert.equal(store.isBlocked(peer), true);
  assert.equal(store.addRequest(peer, 'Marie', msg('m2', 'Ou la?')), 'blocked');
  assert.equal(store.requests.length, 0);
});

test('a message from someone with a chat already never becomes a request', () => {
  const store = new LanChatStore(fakeStorage());
  store.ensure(peer, 'Marie');
  assert.equal(store.addRequest(peer, 'Marie', msg('m1', 'Bonjou!')), 'chat');
  assert.equal(store.requests.length, 0);
});

test('requests and the blocked list survive a relaunch', () => {
  const storage = fakeStorage();
  const a = new LanChatStore(storage);
  a.addRequest(peer, 'Marie', msg('m1', 'Bonjou!'));
  a.addRequest(peer2, 'Paul', msg('m2', 'Salut'));
  a.declineRequest(peer2);
  const b = new LanChatStore(storage);
  assert.equal(b.requests.length, 1);
  assert.equal(b.requests[0].messages[0].text, 'Bonjou!');
  assert.equal(b.isBlocked(peer2), true);
  assert.equal(b.isBlocked(peer), false);
});

test('clearing all conversations removes requests but keeps the blocked list', () => {
  const storage = fakeStorage();
  const store = new LanChatStore(storage);
  store.addRequest(peer, 'Marie', msg('m1', 'Bonjou!'));
  store.addRequest(peer2, 'Paul', msg('m2', 'Salut'));
  store.declineRequest(peer2);
  store.clearAll();
  assert.equal(store.requests.length, 0);
  assert.equal(store.isBlocked(peer2), true);
  assert.equal(store.addRequest(peer2, 'Paul', msg('m3', 'Ankò?')), 'blocked');
});
