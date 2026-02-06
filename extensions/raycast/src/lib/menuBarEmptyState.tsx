/**
 * Menu-bar empty state: no focus file or CLI missing / error.
 */
import { Icon, MenuBarExtra, open, showToast, Toast } from "@raycast/api";
import {
  createFocusFile,
  NOW_INSTALL_URL,
  openTerminalWithNowStatus,
  runNowInstallInTerminal,
  runSwitch,
} from "./now";
import { emptyStateTooltip } from "./listFocusHelpers";
import { PathSwitchActionsMenuBar } from "./pathSwitchActions";
import { MenuBarMoreSubmenu } from "./menuBarMoreSubmenu";
import type { PathSwitchContext } from "./pathContext";
import type { PathSwitchCallbacks } from "./pathSwitchActions";

export type MenuBarEmptyStateProps = {
  effectiveNowPath: string;
  nowInputLabel: string;
  pathSwitchContext: PathSwitchContext;
  pathSwitchCallbacks: PathSwitchCallbacks;
  pinnedPath: string | null;
  setPinnedPathStorage: (path: string) => void;
  clearMenubarPin: () => void;
  fileMissing: boolean;
  cliMissing: boolean;
  errorMessage: string | null | undefined;
  refresh: () => void | Promise<void>;
};

export function MenuBarEmptyState({
  effectiveNowPath,
  nowInputLabel,
  pathSwitchContext,
  pathSwitchCallbacks,
  pinnedPath,
  setPinnedPathStorage,
  clearMenubarPin,
  fileMissing,
  cliMissing,
  errorMessage,
  refresh,
}: MenuBarEmptyStateProps) {
  const handleCreateFocusFile = async () => {
    try {
      await createFocusFile(effectiveNowPath);
      await runSwitch(effectiveNowPath, "0");
      await new Promise((r) => setTimeout(r, 100));
      await refresh();
    } catch (e) {
      await showToast(
        Toast.Style.Failure,
        "Failed to create focus file",
        String(e),
      );
    }
  };

  const handleInstallCli = async () => {
    try {
      await runNowInstallInTerminal();
    } catch (e) {
      await showToast(
        Toast.Style.Failure,
        "Could not open Terminal for install",
        String(e),
      );
      await open(NOW_INSTALL_URL);
    }
  };

  const handleRunStatusInTerminal = async () => {
    try {
      await openTerminalWithNowStatus(effectiveNowPath);
    } catch (e) {
      await showToast(
        Toast.Style.Failure,
        "Could not open Terminal",
        String(e),
      );
    }
  };

  return (
    <MenuBarExtra
      tooltip={emptyStateTooltip(fileMissing, cliMissing, errorMessage ?? null)}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={nowInputLabel} />
        {pinnedPath ? (
          <MenuBarExtra.Item
            title="Unpin focus"
            icon={Icon.PinDisabled}
            onAction={() => clearMenubarPin()}
          />
        ) : (
          <MenuBarExtra.Item
            title="Pin focus on current file"
            icon={Icon.Pin}
            onAction={() => setPinnedPathStorage(effectiveNowPath)}
          />
        )}
        <PathSwitchActionsMenuBar
          context={pathSwitchContext}
          callbacks={pathSwitchCallbacks}
        />
        <MenuBarExtra.Item title="No focus" />
        {fileMissing ? (
          <MenuBarExtra.Item
            title="Create Focus File"
            onAction={handleCreateFocusFile}
          />
        ) : null}
        {cliMissing ? (
          <>
            <MenuBarExtra.Item
              title="Install Now CLI in Terminal…"
              onAction={handleInstallCli}
            />
            <MenuBarExtra.Item
              title="Open Install Instructions…"
              onAction={() => open(NOW_INSTALL_URL)}
            />
          </>
        ) : !fileMissing ? (
          <MenuBarExtra.Item
            title="Run 'now status' in Terminal…"
            onAction={handleRunStatusInTerminal}
          />
        ) : null}
      </MenuBarExtra.Section>
      <MenuBarMoreSubmenu effectiveNowPath={effectiveNowPath} />
    </MenuBarExtra>
  );
}
