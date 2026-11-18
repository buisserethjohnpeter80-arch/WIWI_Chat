// Precise removal of WIWIchat demo data.
//
// Demo chats are identified ONLY by their exact, known demo ids.
// Anything else in the same store is real user data and is kept.
// Corrupted data is never deleted: if it cannot be parsed, it is
// left alone and reported, so a general reset can never wipe a
// real conversation by accident.
export const DEMO_KEY = 'wiwichat-demo-v1';
export const DEMO_IDS = new Set(['sarah', 'david', 'group12', 'peter', 'admin', 'math']);

export function migrateDemoData(storage = localStorage) {
  const raw = storage.getItem(DEMO_KEY);
  if (raw === null) return { removed: 0, kept: 0, changed: false };
  let chats;
  try {
    chats = JSON.parse(raw);
  } catch {
    return { removed: 0, kept: 0, changed: false, corrupted: true };
  }
  if (!Array.isArray(chats)) return { removed: 0, kept: 0, changed: false, corrupted: true };
  const kept = chats.filter((c) => c && typeof c.id === 'string' && !DEMO_IDS.has(c.id));
  const removed = chats.length - kept.length;
  if (removed === 0) return { removed: 0, kept: kept.length, changed: false };
  if (kept.length === 0) storage.removeItem(DEMO_KEY);
  else storage.setItem(DEMO_KEY, JSON.stringify(kept));
  return { removed, kept: kept.length, changed: true };
}
