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

- **Show in menu bar** – Shows the current focus in the menu bar. When you edit any registered now file (in an editor or via the CLI), a small watcher process signals an update: if the menu is open, the command refreshes in-process (no relaunch); if the menu is closed, the watcher opens the menu bar via deeplink so the title updates. When you complete an item in the Focus List (or any mutation writes the file), the watcher detects the file change and opens the menu bar via deeplink so the title updates even when the menu is closed.
- **Focus List** – List of all focusable items with the current focus selected. Groups: **Actions** (narrow focus, finish, add followup, edit, wrap, move), **now file** (create a Now file for the current app or document when one doesn’t exist), **Switch** (set focus on an item). Action panel includes “Using: …” to switch between Global / Document / App file; switching updates the list and previews to the selected file.

The menu bar and list share the same active file (global / document / app) and the same focus state. The active path is stored in LocalStorage; focus state (current focus, breadcrumb, items per path) is in a shared disk cache (Raycast Cache API), so when you complete or add an item in either place, the other shows the same focus the next time you open it. When the now CLI supports `--emit-json`, mutations update the UI from the CLI result without re-reading the file; otherwise the extension falls back to one refresh after the mutation.

The watcher is started automatically so it can be active as soon as the extension is loaded: a background command (**Ensure Watcher**) runs on an interval (every 5 minutes), and the menu bar or Focus List also start it when you open them (if the health check fails). It is a small native Swift binary (`assets/now-watcher`) that watches your default and app/document-mapped now files and observes app activation (so switching apps can trigger a refresh). On file change or app switch it writes to a "dirty" file (so the menu bar can refresh in-process when open) and opens the menu-bar deeplink with `launchType=background` (so the bar title can update without bringing Raycast to the front). The **Show in menu bar** command also has a 2m background interval as a fallback. The watcher may keep running after you quit Raycast; it does not run when Raycast has never been used in a session. You can enable or disable the background refresh for **Ensure Watcher** and **Show in menu bar** in each command’s preferences.

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

To rebuild the native watcher binary after editing `assets/NowWatcher.swift`, run `npm run build:watcher` in this directory (requires Xcode / Swift).
