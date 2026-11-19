// Nearby devices: ephemeral discovery state, kept separate from the
// persisted conversation history in LanChatStore.
//
// A device found on Wi-Fi LAN lives ONLY here until the user
// explicitly starts a chat with it. Discovery never creates, opens
// or persists a conversation: no history.ensure() call, no write to
// localStorage. The stable device id (WIWI- + 20 hex) is the map key,
// so the same device seen again — or after a reconnect — updates one
// entry instead of duplicating it. A device missing from a new
// snapshot has disconnected: it leaves this list, while its chat
// history (if any) stays untouched in the store.
export function createNearbyDevices() {
  return new Map();
}

export function applyDiscoveredPeers(nearby, peers) {
  nearby.clear();
  for (const p of peers || []) {
    if (!p || typeof p.id !== 'string' || !p.id) continue;
    const name = typeof p.name === 'string' && p.name.trim()
      ? p.name.trim().slice(0, 32)
      : `Phone ${p.id.slice(-4)}`;
    nearby.set(p.id, { id: p.id, name });
  }
  return nearby;
}
