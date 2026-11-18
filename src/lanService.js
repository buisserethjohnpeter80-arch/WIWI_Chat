import { Capacitor } from '@capacitor/core';
import { WIWILan } from '@wiwichat/lan';
import { createMessage, isPeerId, makeIdentity, validateName, verifyIncoming } from './lanProtocol.js';

const IDENTITY_KEY = 'wiwi-lan-identity-v1';
export const nativeLanSupported = () => Capacitor.isNativePlatform() && ['ios', 'android'].includes(Capacitor.getPlatform());

export function loadIdentity(storage = localStorage) {
  let value;
  try { value = JSON.parse(storage.getItem(IDENTITY_KEY)); } catch { /* ignore invalid old data */ }
  if (!isPeerId(value?.id)) value = makeIdentity();
  value.name = validateName(value.name || 'My phone');
  storage.setItem(IDENTITY_KEY, JSON.stringify(value));
  return value;
}

export class LanService {
  constructor(plugin = WIWILan, { onPeers = () => {}, onMessage = () => {}, onStatus = () => {} } = {}) {
    this.plugin = plugin;
    this.handlers = { onPeers, onMessage, onStatus };
    this.peers = new Map();
    this.handles = [];
    this.running = false;
  }
  getPeers() { return [...this.peers.values()].sort((a, b) => a.name.localeCompare(b.name)); }
  async start(identity) {
    if (!nativeLanSupported() && this.plugin === WIWILan) {
      this.handlers.onStatus({ running: false, reason: 'web' });
      return false;
    }
    if (this.running) return true;
    this.peers.clear();
    this.handlers.onPeers(this.getPeers());
    try {
      this.handles = await Promise.all([
        this.plugin.addListener('peerFound', ({ id, name }) => {
          if (!isPeerId(id) || id === identity.id) return;
          this.peers.set(id, { id, name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 32) : `Phone ${id.slice(-4)}` });
          this.handlers.onPeers(this.getPeers());
        }),
        this.plugin.addListener('peerLost', ({ id }) => {
          if (!isPeerId(id)) return;
          this.peers.delete(id);
          this.handlers.onPeers(this.getPeers());
        }),
        this.plugin.addListener('message', raw => {
          try { this.handlers.onMessage(verifyIncoming(raw)); } catch (error) { console.warn('Rejected LAN payload', error); }
        }),
        this.plugin.addListener('status', status => {
          this.handlers.onStatus(status);
          if (status.running === false) this.running = false;
        })
      ]);
      await this.plugin.start({ peerId: identity.id, name: validateName(identity.name) });
      this.running = true;
      this.handlers.onStatus({ running: true });
      return true;
    } catch (error) {
      await this.stop();
      this.handlers.onStatus({ running: false, reason: String(error?.message || error) });
      return false;
    }
  }
  async stop() {
    this.running = false;
    try { await this.plugin.stop(); } catch { /* native plugin may be absent in Chrome */ }
    for (const h of this.handles) { try { await h.remove(); } catch { /* no-op */ } }
    this.handles = [];
    this.peers.clear();
    this.handlers.onPeers(this.getPeers());
    this.handlers.onStatus({ running: false });
  }
  async send({ recipientId, identity, id, text, sentAt }) {
    if (!this.running) throw new Error('Wi-Fi LAN is not active');
    if (!this.peers.has(recipientId)) throw new Error('This device is no longer nearby');
    const payload = createMessage({ id, fromId: identity.id, fromName: identity.name, text, sentAt });
    return this.plugin.send({ peerId: recipientId, ...payload });
  }
}
