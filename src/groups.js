// Group management — honest state for v1.
//
// The Wi-Fi LAN protocol in this version is 1-to-1 only: it has no
// group message, group membership or group delivery. So there is no
// real group chat to manage yet, and this module deliberately does
// NOT create a group that would look functional while its messages
// could never reach the other members.
//
// The UI shows "No groups yet" with a clear "coming in a later
// version" state, and createGroup() reports that instead of
// inventing a group. When a real group protocol lands, this is the
// module that will own it.
export const GROUP_CHAT_AVAILABLE = false;

export function listGroups() {
  return [];
}

export function createGroup() {
  return { ok: false, reason: 'group-chat-not-available' };
}
