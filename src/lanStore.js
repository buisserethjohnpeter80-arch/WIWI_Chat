const KEY = 'wiwichat-lan-chats-v1';
const REQUESTS_KEY = 'wiwichat-chat-requests-v1';
const BLOCKED_KEY = 'wiwichat-blocked-v1';
const LIMIT_CHATS = 100;
const LIMIT_MESSAGES = 300;
const COLOR = '#197de5';
export class LanChatStore {
  constructor(storage = localStorage) {
    this.storage = storage;
    this.chats = [];
    this.requests = [];
    this.blocked = [];
    try {
      const data = JSON.parse(storage.getItem(KEY));
      if (Array.isArray(data)) {
        this.chats = data.filter(c => typeof c?.id === 'string' && c.id.startsWith('WIWI-') && Array.isArray(c.messages))
          .slice(0, LIMIT_CHATS).map(c => ({ id: c.id, name: String(c.name || 'Nearby device').slice(0, 32), color: COLOR,
            unread: 0, messages: c.messages.filter(m => typeof m?.id === 'string' && typeof m?.text === 'string').slice(-LIMIT_MESSAGES) }));
      }
    } catch { /* fresh install */ }
    try {
      const reqs = JSON.parse(storage.getItem(REQUESTS_KEY));
      if (Array.isArray(reqs)) {
        this.requests = reqs.filter(r => typeof r?.id === 'string' && r.id.startsWith('WIWI-') && Array.isArray(r.messages))
          .map(r => ({ id: r.id, name: String(r.name || 'Nearby device').slice(0, 32),
            messages: r.messages.filter(m => typeof m?.id === 'string' && typeof m?.text === 'string').slice(-LIMIT_MESSAGES) }));
      }
    } catch { /* fresh install */ }
    try {
      const blocked = JSON.parse(storage.getItem(BLOCKED_KEY));
      if (Array.isArray(blocked)) {
        this.blocked = blocked.filter(id => typeof id === 'string' && id.startsWith('WIWI-'));
      }
    } catch { /* fresh install */ }
  }
  get(id) { return this.chats.find(c => c.id === id); }
  ensure(id, name) {
    let chat = this.get(id);
    if (!chat) {
      chat = { id, name: name || `Phone ${id.slice(-4)}`, color: COLOR, messages: [], unread: 0 };
      this.chats.unshift(chat);
      if (this.chats.length > LIMIT_CHATS) this.chats.length = LIMIT_CHATS;
    } else if (name && (chat.name.startsWith('Phone ') || chat.name === 'Nearby device')) chat.name = name;
    this.save();
    return chat;
  }
  add(id, name, message, { unread = false } = {}) {
    const chat = this.ensure(id, name);
    if (chat.messages.some(m => m.id === message.id)) return false; // deduplicate retries
    chat.messages.push(message);
    if (chat.messages.length > LIMIT_MESSAGES) chat.messages.shift();
    if (unread) chat.unread++;
    this.save();
    return true;
  }
  updateStatus(id, messageId, status) {
    const msg = this.get(id)?.messages.find(m => m.id === messageId);
    if (msg) { msg.status = status; this.save(); }
  }
  clearUnread(id) {
    const chat = this.get(id);
    if (chat) { chat.unread = 0; this.save(); }
  }
  // Remove every conversation and message (Privacy & security setting).
  // Pending requests hold messages too, so they go as well. The
  // blocked list is a privacy choice, not history, so it stays.
  clearAll() {
    this.chats = [];
    this.requests = [];
    this.save();
    this.saveRequests();
  }
  save() {
    try {
      const safe = this.chats.map(({ id, name, messages }) => ({ id, name, messages }));
      this.storage.setItem(KEY, JSON.stringify(safe));
    } catch (error) { console.warn('Unable to persist LAN messages', error); }
  }

  // ---- Chat requests (local only, no protocol change) ----
  //
  // A first message from someone with no conversation yet becomes a
  // chat request, not a chat: the sender sees nothing different, but
  // on this phone the message stays hidden inside the request until
  // the user accepts. Declining deletes the request and blocks the
  // sender on this device, so later messages from them are ignored.
  getRequest(id) { return this.requests.find(r => r.id === id); }
  isBlocked(id) { return this.blocked.includes(id); }
  addRequest(id, name, message) {
    if (this.isBlocked(id)) return 'blocked';
    if (this.get(id)) return 'chat'; // already a conversation: use add()
    let req = this.getRequest(id);
    if (!req) {
      req = { id, name: name || `Phone ${id.slice(-4)}`, messages: [] };
      this.requests.unshift(req);
    } else if (name && (req.name.startsWith('Phone ') || req.name === 'Nearby device')) req.name = name;
    if (req.messages.some(m => m.id === message.id)) return 'duplicate';
    req.messages.push(message);
    if (req.messages.length > LIMIT_MESSAGES) req.messages.shift();
    this.saveRequests();
    return 'request';
  }
  acceptRequest(id) {
    const req = this.getRequest(id);
    if (!req) return null;
    const chat = this.ensure(id, req.name);
    for (const m of req.messages) {
      if (!chat.messages.some(x => x.id === m.id)) chat.messages.push(m);
    }
    chat.messages.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
    if (chat.messages.length > LIMIT_MESSAGES) chat.messages.splice(0, chat.messages.length - LIMIT_MESSAGES);
    this.requests = this.requests.filter(r => r.id !== id);
    this.save();
    this.saveRequests();
    return chat;
  }
  declineRequest(id) {
    if (!this.getRequest(id)) return false;
    this.requests = this.requests.filter(r => r.id !== id);
    if (!this.blocked.includes(id)) this.blocked.push(id);
    this.saveRequests();
    this.saveBlocked();
    return true;
  }
  saveRequests() {
    try {
      const safe = this.requests.map(({ id, name, messages }) => ({ id, name, messages }));
      this.storage.setItem(REQUESTS_KEY, JSON.stringify(safe));
    } catch (error) { console.warn('Unable to persist chat requests', error); }
  }
  saveBlocked() {
    try {
      this.storage.setItem(BLOCKED_KEY, JSON.stringify(this.blocked));
    } catch (error) { console.warn('Unable to persist blocked devices', error); }
  }
}
