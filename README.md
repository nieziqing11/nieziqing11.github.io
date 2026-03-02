# Vocab PWA (scan QR → run on iPhone)

This is a **web app / PWA** version of the vocab spaced-repetition app. It runs on iPhone in Safari immediately, works offline, and supports JSON import/export.

## 1) Host it (fastest: GitHub Pages)
1. Create a GitHub account (if you don’t have one).
2. Create a new repository, e.g. `vocab-pwa`.
3. Upload these files from the `vocab-pwa/` folder:\n   - `index.html`\n   - `app.js`\n   - `styles.css`\n   - `sw.js`\n   - `manifest.webmanifest`\n   - `icon.svg`\n4. In GitHub repo settings → **Pages**:\n   - Source: **Deploy from a branch**\n   - Branch: `main` / root\n5. Wait ~1–2 minutes. Your URL will look like:\n   - `https://YOUR_USERNAME.github.io/vocab-pwa/`

## 2) Generate the QR code
1. Open the hosted site on your PC.\n2. Click **QR** in the top bar.\n3. Scan the QR with your iPhone camera.\n
## 3) Install like an app (optional)
On iPhone: open the site in Safari → Share → **Add to Home Screen**.

## Notes about reminders on iPhone
Web apps can’t reliably schedule daily local notifications without a server. The simple alternative is an iOS Reminder to open the app daily.
