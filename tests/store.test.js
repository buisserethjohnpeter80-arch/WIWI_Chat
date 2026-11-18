import test from 'node:test';
import assert from 'node:assert/strict';
import { LanChatStore } from '../src/lanStore.js';
function fakeStorage() { const cache=new Map();return {getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)}; }
const peer='WIWI-abcdef0123456789abcd';
test('deduplicates incoming messages and persists history',()=>{
  const storage=fakeStorage();const a=new LanChatStore(storage);
  assert.equal(a.add(peer,'Nearby',{id:'m1',text:'Hello',mine:false},{unread:true}),true);
  assert.equal(a.add(peer,'Nearby',{id:'m1',text:'Hello',mine:false},{unread:true}),false);
  assert.equal(a.get(peer).messages.length,1);assert.equal(a.get(peer).unread,1);
  a.clearUnread(peer);assert.equal(a.get(peer).unread,0);
  const restored=new LanChatStore(storage);assert.equal(restored.get(peer).messages[0].text,'Hello');
});
test('status changes and retention cap',()=>{
 const a=new LanChatStore(fakeStorage());
 for(let i=0;i<302;i++)a.add(peer,'Nearby',{id:`m${i}`,mine:true,text:'Hi',status:'pending'});
 assert.equal(a.get(peer).messages.length,300);
 a.updateStatus(peer,'m301','sent');assert.equal(a.get(peer).messages.at(-1).status,'sent');
});
