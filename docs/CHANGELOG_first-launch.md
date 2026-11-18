# WIWIchat First Launch Experience — change log

Base: `feature/wiwichat-lan-v0.2` (PR #1, v0.2 LAN foundation), not main v0.1,
so real LAN discovery, sending, ACK and retry are available underneath.

Added:
- `src/profile.js` — local profile (display name, device name, optional
  photo, stable WIWI- peer id), onboarding state, adoption of a valid
  older v0.2 identity with a custom name
- `src/demoMigration.js` — removes only the exact known demo ids
  (sarah, david, group12, peter, admin, math) from `wiwichat-demo-v1`;
  keeps any other chat; leaves corrupted data alone
- `src/groups.js` — group chat honestly unavailable (`GROUP_CHAT_AVAILABLE
  = false`); `createGroup()` reports `group-chat-not-available`
- `tests/profile.test.js` — profile, migration and group-availability tests
- `docs/CHANGELOG_first-launch.md` — this file

Modified:
- `src/main.js` — rewritten in readable form with the same v0.2 LAN
  behaviour: 3-step onboarding (Welcome / Create Local Profile /
  Connect Locally), empty home (Chats / Contacts / Groups), first
  conversation starts empty, Settings profile editing, no demo seed
  anywhere, no repopulation on restart
- `src/style.css` — onboarding, empty-state and profile-form styles
  only; legacy styles untouched
- `README.md` — First Launch section, demo-removal and group honesty notes

Unchanged:
- `vite.config.js`, `capacitor.config.json`, `index.html`,
  `plugins/wiwi-lan/`, `src/lanProtocol.js`, `src/lanService.js`,
  `src/lanStore.js` (LAN transport, protocol and native plugin untouched)

Not implemented (shown honestly in the UI, not faked):
- Group chat over LAN (protocol is 1-to-1 only)
- Connect Request / Accept-Decline flow (protocol does not support it)
- File transfer, Wi-Fi Direct, E2E encryption, pairing
- Profile photo sharing with peers (photo is local only; protocol
  carries name + peer id only)
