# WIWIchat Foundation v0.2 — First real Wi-Fi LAN transport

Built as a small, reviewable increment on the attached **WIWIchat Foundation v0.1**. Keep the original Ionic Core + vanilla JavaScript + Vite + Capacitor design and both light/dark appearances. New communication features run through the local `@wiwichat/lan` Capacitor plugin.

## Implemented in source

- Bonjour/mDNS service discovery, using the shared service type `_wiwichat._tcp`.
- Native local TCP listener on Android (Java, `NsdManager`) and iOS (Swift, `Network.framework`).
- Cross-platform newline-delimited JSON protocol v1, UTF-8, capped at 16 KiB per frame and 4,000 characters per text.
- Native device announcements and peer lost/found events.
- LAN text message send/receive with a technical `ack` for network acceptance, **not** read receipts or a guarantee of durable delivery.
- Local history stored separately from legacy demo contacts/messages; duplicate message IDs discarded; send failures can be retried.
- Device display name editing and persistent random service ID; UI status, nearby peers, and online/offline sending.
- Chrome browser preview still displays the UI, but cannot discover devices or send LAN messages. It always labels sample contacts as demos.
- Google Fonts network dependency removed; offline interface uses system sans-serif if Inter is not installed.

## Not production ready

**This version is an implementation candidate, not a verified native release.** Real devices are required to validate Android/Android, Android/iOS, and iOS/iOS interoperability. No native compilation or device test has been completed in this environment. It also lacks pairing/authentication, end-to-end encryption, reliable server-side persistence before ACK, Wi-Fi Direct, group chat over LAN, file transfer, background delivery or push notifications. Only use on a **trusted local network for testing**, and do not exchange sensitive information yet.

## Get started in Chrome

Use Node.js supported by Vite 7 (Node 20.19+ or 22.12+).

```sh
npm install
npm test
npm run dev
npm run build
```

Chrome remains only an interface preview. A Vite build does not make TCP/mDNS available to a web page.

## Native Android install (on an SDK-equipped computer)

```sh
npm install
npm test
npm run build
npx cap add android           # Only if android/ doesn't exist yet
npx cap sync android
npx cap open android
```

- Use the Android Studio/Gradle project to build and run on two physical Android devices.
- Android manifest permissions are included with the plugin: `INTERNET`, `ACCESS_NETWORK_STATE`, `CHANGE_WIFI_MULTICAST_STATE`.
- No generic nearby Wi-Fi scan is performed. Android uses `NsdManager`, not direct Wi-Fi radio scans.
- For future Android 17 / API 37 targeting, `ACCESS_LOCAL_NETWORK` permission handling must be researched and tested before increasing `targetSdkVersion`.
- Add the generated `android/` project to source control after review if your project policy requires reproducible builds. Never replace an existing native project blindly.

## Native iOS install (on a Mac with Xcode)

```sh
npm install
npm test
npm run build
npx cap add ios               # Only if ios/ doesn't exist yet
npm run ios:privacy           # Add iOS local-network privacy keys, idempotently
npx cap sync ios
npx cap open ios
```

Check `ios/App/App/Info.plist` for:

```xml
<key>NSLocalNetworkUsageDescription</key>
<string>WIWIchat finds nearby phones and exchanges messages on your local Wi-Fi network.</string>
<key>NSBonjourServices</key>
<array><string>_wiwichat._tcp</string></array>
```

Both a CocoaPods podspec and SPM `Package.swift` are included in the plugin. Determine which package manager the generated Capacitor iOS project uses and verify the plugin was actually discovered and linked by `npx cap sync ios`. Accept the iOS local-network permission prompt on both devices.

## Two-device test

1. Install this **same v0.2 build** on each phone.
2. Connect both to the same Wi-Fi access point. Disable guest Wi-Fi/client isolation and avoid VPNs that isolate devices.
3. Open WIWIchat in the foreground on each phone. iOS should ask for local network permission on first use.
4. Under Contacts, check that a real device appears in **Devices on Wi-Fi LAN**. Ignore sample contacts Sarah, David etc.
5. Send `Bonjou A` from A to B. Confirm B receives it, and A displays `Accepted` only after an ACK is received.
6. Reply `Bonjou B` from B to A. Disable Wi-Fi on B; confirm A stops showing B online and cannot send.
7. Restore the connection; attempt a send, inspect retry on failure and verify duplicate message IDs are not shown twice.
8. Repeat cross-platform: Android ↔ Android, Android ↔ iPhone, and iPhone ↔ iPhone.

## Protocol for both native implementations

Bonjour type: `_wiwichat._tcp`. Instance name/peer ID: `WIWI-` + 20 lowercase hex digits. TXT `name` is a human-readable nickname.

A single TCP connection carries one line of UTF-8 JSON and one newline-terminated reply:

```json
{"v":1,"type":"message","id":"uuid-v4-here","fromId":"WIWI-abcdef0123456789abcd","fromName":"My phone","text":"Bonjou","sentAt":"2026-11-18T12:00:00.000Z"}
```

ACK:

```json
{"v":1,"type":"ack","id":"uuid-v4-here"}
```

**Security**: Any device on the LAN may pretend to advertise a WIWIchat instance or send a forged message. An ACK reports acceptance by the TCP listener and does not imply persistence by the receiver UI. Implement pairing, authenticated keys, encryption and transactional persistence before a public release.

## Testing status of this delivery

- `node --test` tests for shared JS protocol and history passed in the build environment.
- Syntax parsing succeeded for JavaScript and the Swift source (`swiftc -frontend -parse`); this is **not** an iOS build.
- The native Android plugin and Swift source have **not** been built against actual SDKs here.
- Full `npm install` / Vite build could not complete here because registry access timed out. Muse must run them in the repository with dependencies available.

## Integration safety when using Muse

This zip is built from the original attached Foundation v0.1, **not from the live current GitHub main branch**. If the GitHub repository already contains edits, Muse must fetch `origin/main`, compare before changing anything, and merge file-by-file. Never replace `src/main.js`, `src/style.css`, `package.json` or `README.md` blindly. Preserve actual user changes over the reference zip. Use a feature branch if any conflict exists; review a Pull Request before merging.

See `docs/MUSE_INSTRUCTIONS_KREYOL.txt` and `docs/CHANGELOG_v0.2.md`.
