# Now – Raycast Extension

Shows your [now](https://github.com/shanberg/now) CLI focus in the menu bar and in a list with actions (set focus, complete, copy).

This extension follows [Raycast extension standards](https://developers.raycast.com/information/file-structure): `package.json` manifest with `$schema`, `src/` entry points per command, `assets/` for icons, `eslint.config.js` (flat config), and `.prettierrc`.

## Requirements

- [now](https://github.com/shanberg/now) CLI installed and on your PATH (e.g. via the repo’s `dist/install.sh`)
- A focus file (e.g. `~/.now/focus.now.md`)

## Setup

1. In Raycast: **Extensions** → **Add Extension** → **Import** and select the `extensions/raycast` folder (or run `npm run dev` in this folder for development).
2. Open the extension’s preferences and set **Focus file path** to your `.now.md` file (e.g. `~/.now/focus.now.md`). `~` is expanded to your home directory.

## Commands

- **Show in menu bar** – Shows the current focus in the menu bar; refreshes on an interval. Click for a short menu.
- **Focus List** – List of all focusable items with the current focus selected. Actions: Set as Focus, Complete (when current), Copy Title, Refresh.

## Development

```bash
cd extensions/raycast
npm install
npm run dev
```

Then run the commands from Raycast. Ensure `now` is on PATH and your focus file path preference is set.
