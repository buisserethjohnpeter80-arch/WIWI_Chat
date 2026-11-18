# WIWIchat v0.2 change log

Added:
- `src/lanProtocol.js` protocol/validation and stable device identity format
- `src/lanService.js` app-facing Capacitor bridge and peer state
- `src/lanStore.js` local separate LAN history, status, deduplication
- `plugins/wiwi-lan/` Android Java and iOS Swift native mDNS/TCP plugin with npm local package
- `scripts/configure-ios-privacy.mjs` idempotent Info.plist change
- `tests/*.test.js` node tests for protocol and local storage

Modified relative to attached v0.1:
- `src/main.js`: real peer list/status, LAN contact/chat, compose with ACK/failure/retry, demo isolation, nickname UI
- `src/style.css`: small additional styles, legacy design untouched
- `package.json`: plugin local file dependency, `test`, `check`, and iOS privacy scripts
- `README.md`: actual implementation notes and truthful limitations
- `index.html`: removed Google Fonts CDN links, so WIWIchat does not request fonts over the internet; system sans-serif fallback is used offline

Unchanged relative to attached v0.1:
- `vite.config.js`, `capacitor.config.json`

Do not copy this zip straight over a diverged GitHub main without a three-way file comparison.
