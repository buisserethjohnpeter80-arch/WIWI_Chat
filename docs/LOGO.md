# WIWIchat logo — two separate assets, each in its own place

Approved design (user, 2026-11-18): white bold **W** with a small blue
Wi-Fi symbol above it, in a dark rounded square — plus the **WIWIchat**
wordmark (WIWI white, chat blue, blue swoosh underneath).

The icon and the wordmark are kept **separate** and used each where it
belongs. Never bake the wordmark into the icon, and never use the icon
as a substitute for the wordmark.

## Files

| File | What it is | Used where |
|---|---|---|
| `assets/icon.svg` | The W icon only (SVG source) | Android launcher icon — `@capacitor/assets generate` reads this |
| `assets/splash.svg` | Splash: icon centred on dark `#080c15` | Android splash screen — `@capacitor/assets generate` reads this |
| `assets/wordmark.svg` | The WIWIchat text only (SVG source) | Brand use outside the app (web, print). Renders in browsers; do not rasterise it with ImageMagick (its SVG text renderer is broken) |
| `public/logo-icon.svg` | Copy of the icon, served at `/logo-icon.svg` | App header + onboarding hero (`<img class="brand-icon">`) |
| `public/wordmark.svg` | Copy of the wordmark, served at `/wordmark.svg` | Splash / about screens that need the text as an image |

The rendered PNG references (1024 icon, wordmark, 1080x1920 splash) live
in the workspace under `wiwichat-logo/`; PNGs are not committed because
the snapshot push only accepts UTF-8 files — the SVGs are the source of
truth and the PNGs are regenerated from them.

## In the app

- **Header:** icon image + live text `WIWI<span>chat</span>` (text, not
  an image, so it stays crisp and translatable).
- **Onboarding hero:** large icon image only; the title is live text.
- **Favicon:** `/logo-icon.svg` (`index.html`).
- **Android:** run `npm run assets` (`npx @capacitor/assets generate`)
  after `npx cap add android` and before `npx cap sync android` — the
  GitHub workflow does this. The icon is also the app icon on the phone
  home screen.

## Colours

- Dark background: `#080c15` → `#05080f` (icon gradient `#101a2c` → `#05080f`)
- Blue: `#168fff` — the app accent (Wi-Fi, "chat", swoosh)
- White: `#ffffff` (W, "WIWI")
