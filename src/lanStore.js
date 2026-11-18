const KEY = 'wiwichat-lan-chats-v1';
const LIMIT_CHATS = 100;
const LIMIT_MESSAGES = 300;
const COLOR = '#197de5';
export class LanChatStore {
  constructor(storage = localStorage) {
    this.storage = storage;
    this.chats = [];
    try {
      const data = JSON.parse(storage.getItem(KEY));
      if (Array.isArray(data)) {
        this.chats = data.filter(c => typeof c?.id === 'string' && c.id.startsWith('WIWI-') && Array.isArray(c.messages))
          .slice(0, LIMIT_CHATS).map(c => ({ id: c.id, name: String(c.name || 'Nearby device').slice(0, 32), color: COLOR,
            unread: 0, messages: c.messages.filter(m => typeof m?.id === 'string' && typeof m?.text === 'string').slice(-LIMIT_MESSAGES) }));
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
  save() {
    try {
      const safe = this.chats.map(({ id, name, messages }) => ({ id, name, messages }));
      this.storage.setItem(KEY, JSON.stringify(safe));
    } catch (error) { console.warn('Unable to persist LAN messages', error); }
  }
}
