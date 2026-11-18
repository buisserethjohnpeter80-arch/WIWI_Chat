import test from 'node:test';
import assert from 'node:assert/strict';
import { createMessage, makeIdentity, verifyIncoming, isPeerId, isAck, MAX_MESSAGE_LENGTH } from '../src/lanProtocol.js';

const sender = 'WIWI-abcdef0123456789abcd';
const base = { id: '12345678-1234-1234-1234-123456789abc', fromId: sender, fromName: 'Test Phone', text: 'Bonjou! 👋', sentAt: '2026-11-18T12:00:00.000Z' };
test('identity is stable-shaped and valid', () => {
  const id = makeIdentity(() => 'abcd1234-5678-9000-aabb-ccddeeff1122');
  assert.equal(id.id, 'WIWI-abcd123456789000aabb');
  assert.ok(isPeerId(id.id));
  assert.equal(id.name, 'My phone');
});
test('create message and validate sender / content', () => {
  const msg = createMessage(base);
  assert.equal(msg.v, 1);
  assert.equal(msg.type, 'message');
  assert.deepEqual(verifyIncoming(msg), msg);
  assert.ok(isAck({v:1,type:'ack',id:base.id},base.id));
  assert.equal(isAck({v:1,type:'ack',id:'wrong'},base.id),false);
});
test('reject future protocol versions, unexpected data, oversized text', () => {
  assert.throws(()=>verifyIncoming({...createMessage(base), v:2}));
  assert.throws(()=>createMessage({...base,text:'x'.repeat(MAX_MESSAGE_LENGTH+1)}));
  assert.throws(()=>createMessage({...base,fromId:'not-a-peer'}));
  assert.throws(()=>createMessage({...base,text:'  '}));
  assert.throws(()=>createMessage({...base,fromName:''}));
});
test('suspicious text stays text and is not rewritten by protocol', () => {
  const message = createMessage({...base,text:'<img src=x onerror=alert(1)>'});
  assert.equal(message.text,'<img src=x onerror=alert(1)>');
  // UI escapes this content before inserting into innerHTML.
});
