# Now – Raycast Extension

Shows your [now](https://github.com/shanberg/now) CLI focus in the menu bar and in a list with actions (set focus, complete, copy).

This extension follows [Raycast extension standards](https://developers.raycast.com/information/file-structure): `package.json` manifest with `$schema`, `src/` entry points per command, `assets/` for icons, `eslint.config.js` (flat config), and `.prettierrc`.

## Requirements

- [now](https://github.com/shanberg/now) CLI installed and on your PATH (e.g. via the repo’s `dist/install.sh`)
- A focus file (e.g. `~/.now/focus.now.md`)

## Setup

1. In Raycast: **Extensions** → **Add Extension** → **Import** and select the `extensions/raycast` folder (or run `npm run dev` in this folder for development).
2. Open the extension’s preferences and set **Focus file path** to your `.now.md` file (e.g. `~/.now/focus.now.md`). `~` is expanded to your home directory.

3. (Optional) **App-specific Now files**: JSON mapping from app bundle ID or name to a Now file path. The menu bar and list use the path for the frontmost app when set. You can also create and switch between files from the menu (e.g. "Create Now File for [App]" or "Use app file").

4. (Optional) **Document-specific Now files**: Use "Create Now File for [filename]" (the menu shows the current document's file name) to tie the frontmost app’s current document to a Now file. If you rename or move the document, the extension suggests the same Now file by matching filename first, then path (closest match).

## Commands

- **Show in menu bar** – Shows the current focus in the menu bar. When you complete an item in the Focus List, the list opens the menubar command via deeplink so the title updates immediately; background refresh (every 1 minute) keeps it in sync when you change focus elsewhere. You can enable/disable background refresh or see last run in the command’s preferences.
- **Focus List** – List of all focusable items with the current focus selected. Groups: **Actions** (narrow focus, finish, add followup, edit, wrap, move), **now file** (create a Now file for the current app or document when one doesn’t exist), **Switch** (set focus on an item). Action panel includes “Using: …” to switch between Global / Document / App file; switching updates the list and previews to the selected file.

The menu bar and list share the same active file (global / document / app) and the same focus state: both read and write a shared LocalStorage cache, so when you complete or add an item in either place, the other shows the same focus the next time you open it. When the now CLI supports `--emit-json`, mutations update the UI from the CLI result without re-reading the file; otherwise the extension falls back to one refresh after the mutation.

## Document resolution

When you use **Create Now File for [filename]**, the extension stores a mapping from the frontmost app’s document path to a Now file path. That map is used to decide which Now file to suggest for the current document. Resolution happens in three steps (filename is the primary key, path is secondary):

1. **Exact match** — The current document path (after normalization) equals a stored document path → use that Now file.
2. **By filename** — If no exact match, among stored entries with the **same filename** as the current document, the extension picks the one whose **directory path** is closest to the current document’s directory → use that Now file. (Covers “file moved to another folder.”)
3. **By path** — If still no match, among stored entries in the **same directory** as the current document, it picks the one whose **filename** is closest to the current filename → use that Now file. (Covers “file renamed in same folder.”)

When a suggested match is found (step 2 or 3), the extension offers **Use document file** so you can switch to that Now file without re-creating the mapping. Paths are normalized (e.g. `./` or trailing slash) so small path differences still match.

## Code quality

Use [Valknut](https://github.com/valknut-org/valknut) (e.g. as an MCP server in Cursor with `path` set to your project) to validate code quality on the same codebase you’re focusing with now.

## Development

```bash
cd extensions/raycast
npm install
npm run dev
```

Then run the commands from Raycast. Ensure `now` is on PATH and your focus file path preference is set.
