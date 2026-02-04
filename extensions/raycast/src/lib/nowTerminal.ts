/**
 * Terminal.app integration: install script, open with now status/tui.
 */
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/** Install script URL (run in Terminal so sudo works). */
export const NOW_INSTALL_SCRIPT_URL =
  "https://raw.githubusercontent.com/shanberg/now/main/dist/install.sh";

/**
 * Opens Terminal.app and runs the now install script (curl | bash).
 * The script may prompt for sudo. Resolves when Terminal has been opened.
 */
export async function runNowInstallInTerminal(): Promise<void> {
  const cmd = `curl -fsSL ${NOW_INSTALL_SCRIPT_URL} | bash`;
  const scriptArg = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const doScript = `tell application "Terminal" to do script "${scriptArg}"`;
  await execAsync(
    `osascript -e 'tell application "Terminal" to activate' -e ${JSON.stringify(doScript)}`,
  );
}

/**
 * Opens Terminal.app and runs `NOW_FILE=<path> now status` so the user can see the CLI output/error.
 * Use when the extension can't read the focus file (e.g. PATH differs from Terminal).
 */
export async function openTerminalWithNowStatus(
  nowFilePath: string,
): Promise<void> {
  const escaped = nowFilePath.replace(/'/g, "'\\''");
  const cmd = `export NOW_FILE='${escaped}' && now status`;
  const scriptArg = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const doScript = `tell application "Terminal" to do script "${scriptArg}"`;
  await execAsync(
    `osascript -e 'tell application "Terminal" to activate' -e ${JSON.stringify(doScript)}`,
  );
}

/**
 * Opens Terminal.app and runs `NOW_FILE=<path> now tui` to start the interactive TUI.
 */
export async function openTerminalWithNowTui(
  nowFilePath: string,
): Promise<void> {
  const escaped = nowFilePath.replace(/'/g, "'\\''");
  const cmd = `export NOW_FILE='${escaped}' && now tui`;
  const scriptArg = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const doScript = `tell application "Terminal" to do script "${scriptArg}"`;
  await execAsync(
    `osascript -e 'tell application "Terminal" to activate' -e ${JSON.stringify(doScript)}`,
  );
}
