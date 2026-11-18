# WIWIchat Foundation v0.1

Ionic Core + Vanilla JavaScript + Vite + Capacitor foundation. Dark-first responsive SMS-style UI, official Ionicons, Inter typography, chats, contacts, settings, conversation demo, localStorage demo messages, attachment filename demo, theme switch.

## Preview in Chrome

Requirements: Node.js 20.19+ or compatible with Vite 7, npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Native project (later, when you have access to native build tooling)

```bash
npx cap add android
npx cap add ios
npm run build
npx cap sync
```

Android builds need Android SDK tooling. iOS native builds normally require macOS/Xcode or a suitable remote Mac build service. Do not assume both platforms support the same peer-to-peer Wi-Fi APIs.

## What is NOT implemented

No LAN discovery, socket messaging, Wi-Fi Direct, native permissions, end-to-end encryption, push notifications, identity authentication, or actual file transfers. Connection status and online contacts are illustrative. Messages saved to localStorage are a browser-only demo, not a secure production database. Replace with native SQLite and a defined peer messaging protocol later.

## Architecture next

Keep network service behind a JavaScript interface; implement platform-specific Capacitor native plugins for LAN discovery and transport, plus separate emergency transports. Add robust message IDs, acknowledgements, deduplication, persistence, encryption, and device pairing before release.
