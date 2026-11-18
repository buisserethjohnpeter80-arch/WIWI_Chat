// Shared cross-platform protocol, keep compatible with Android and iOS peers.
export const LAN_VERSION = 1;
export const BONJOUR_TYPE = '_wiwichat._tcp';
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_PEER_NAME_LENGTH = 32;
export const MAX_PEER_ID_LENGTH = 40;
const PEER_ID = /^WIWI-[0-9a-f]{20}$/;
const MESSAGE_ID = /^[A-Za-z0-9_-]{8,80}$/;

export function makeIdentity(randomUUID = () => crypto.randomUUID()) {
  const hex = randomUUID().replace(/[^0-9a-f]/gi, '').toLowerCase();
  if (hex.length < 20) throw new Error('A secure random UUID is required');
  return { id: `WIWI-${hex.slice(0, 20)}`, name: 'My phone' };
}
export function isPeerId(value) { return typeof value === 'string' && PEER_ID.test(value); }
export function validateName(value) {
  if (typeof value !== 'string') throw new Error('Name is required');
  const name = value.trim().slice(0, MAX_PEER_NAME_LENGTH);
  if (!name) throw new Error('Name cannot be empty');
  return name;
}
export function createMessage({ id, fromId, fromName, text, sentAt }) {
  if (typeof id !== 'string' || !MESSAGE_ID.test(id)) throw new Error('Invalid message ID');
  if (!isPeerId(fromId)) throw new Error('Invalid sender ID');
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_MESSAGE_LENGTH) throw new Error('Message must contain 1 to 4000 characters');
  if (typeof sentAt !== 'string' || !Number.isFinite(Date.parse(sentAt))) throw new Error('Invalid timestamp');
  return { v: LAN_VERSION, type: 'message', id, fromId, fromName: validateName(fromName), text, sentAt };
}
export function verifyIncoming(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== LAN_VERSION || raw.type !== 'message') throw new Error('Unsupported protocol');
  return createMessage(raw);
}
export function isAck(raw, id) {
  return raw?.v === LAN_VERSION && raw?.type === 'ack' && raw?.id === id;
}
