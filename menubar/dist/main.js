"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const DEFAULT_FOCUS_PATH = "~/.now/focus.now.md";
const POLL_INTERVAL_MS = 60000;
function resolveFocusFilePath(raw) {
    const home = process.env.HOME ?? "";
    const expanded = raw.replace(/^~(?=\/|$)/, home);
    return (0, path_1.resolve)(expanded);
}
function getFocusFilePath() {
    return resolveFocusFilePath(process.env.NOW_FILE ?? DEFAULT_FOCUS_PATH);
}
async function getFocus(nowFilePath) {
    try {
        const { stdout } = await execFileAsync("now", ["json", "focus"], { encoding: "utf-8", env: { ...process.env, NOW_FILE: nowFilePath } });
        return JSON.parse(stdout.trim());
    }
    catch {
        return null;
    }
}
let tray = null;
let pollTimer = null;
async function updateTray(nowFilePath) {
    if (!tray)
        return;
    const focus = await getFocus(nowFilePath);
    const title = focus?.focus ?? "—";
    const tooltip = focus?.breadcrumb ? `${focus.breadcrumb} / ${title}` : title;
    tray.setToolTip(tooltip);
    const focusFileExists = (0, fs_1.existsSync)(nowFilePath);
    const template = [
        { label: title, enabled: false },
        { type: "separator" },
        {
            label: "Open focus file",
            click: () => {
                electron_1.shell.openPath(nowFilePath).catch(() => { });
            },
            enabled: focusFileExists,
        },
        {
            label: "Run now status in Terminal",
            click: () => {
                const script = `NOW_FILE=${JSON.stringify(nowFilePath)} now status`;
                (0, child_process_1.execFile)("osascript", [
                    "-e",
                    `tell application "Terminal" to do script ${JSON.stringify(script)}`,
                ]);
            },
        },
        { type: "separator" },
        { label: "Quit", role: "quit" },
    ];
    tray.setContextMenu(electron_1.Menu.buildFromTemplate(template));
}
function schedulePoll(nowFilePath) {
    if (pollTimer)
        clearInterval(pollTimer);
    pollTimer = setInterval(() => updateTray(nowFilePath), POLL_INTERVAL_MS);
}
electron_1.app.whenReady().then(async () => {
    if (process.platform === "darwin") {
        electron_1.app.dock?.hide();
    }
    const iconPath = (0, path_1.join)(__dirname, "..", "assets", "icon.png");
    const icon = electron_1.nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
        tray = new electron_1.Tray(electron_1.nativeImage.createEmpty());
    }
    else {
        tray = new electron_1.Tray(icon.resize({ width: 22, height: 22 }));
    }
    const nowFilePath = getFocusFilePath();
    await updateTray(nowFilePath);
    schedulePoll(nowFilePath);
});
electron_1.app.on("quit", () => {
    if (pollTimer)
        clearInterval(pollTimer);
});
