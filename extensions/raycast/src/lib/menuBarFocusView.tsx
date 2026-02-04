/**
 * Menu-bar view when focus exists: title, breadcrumb, complete action, pin section, More.
 */
import {
  Icon,
  MenuBarExtra,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { runComplete } from "./now";
import { focusListDeeplink } from "./raycastDeeplinks";
import { PathSwitchActionsMenuBar } from "./pathSwitchActions";
import { MenuBarMoreSubmenu } from "./menuBarMoreSubmenu";
import type { PathSwitchContext } from "./pathContext";
import type { PathSwitchCallbacks } from "./pathSwitchActions";
import type { JsonFocus, MutationResult } from "./now";

export type MenuBarFocusViewProps = {
  titleWithPin: string;
  tooltip: string;
  displayBreadcrumb: string;
  focus: JsonFocus;
  effectiveNowPath: string;
  nowInputLabel: string;
  pinnedPath: string | null;
  setPinnedPathStorage: (path: string) => void;
  clearMenubarPin: () => void;
  pathSwitchContext: PathSwitchContext;
  pathSwitchCallbacks: PathSwitchCallbacks;
  applyMutationResult: (result: MutationResult) => Promise<void>;
  refresh: () => void | Promise<void>;
};

export function MenuBarFocusView({
  titleWithPin,
  tooltip,
  displayBreadcrumb,
  focus,
  effectiveNowPath,
  nowInputLabel,
  pinnedPath,
  setPinnedPathStorage,
  clearMenubarPin,
  pathSwitchContext,
  pathSwitchCallbacks,
  applyMutationResult,
  refresh,
}: MenuBarFocusViewProps) {
  return (
    <MenuBarExtra title={titleWithPin} tooltip={tooltip}>
      <MenuBarExtra.Section>
        {displayBreadcrumb ? (
          <MenuBarExtra.Item title={displayBreadcrumb} />
        ) : null}
        <MenuBarExtra.Item
          icon={Icon.Checkmark}
          title={focus.focus || "—"}
          onAction={async () => {
            try {
              const result = await runComplete(effectiveNowPath);
              if (result) {
                await applyMutationResult(result);
              } else {
                await refresh();
              }
              await showToast(Toast.Style.Success, "Completed");
            } catch (e) {
              await showToast(
                Toast.Style.Failure,
                "Failed to complete",
                String(e),
              );
            }
          }}
          alternate={
            <MenuBarExtra.Item
              title="Open Focus List"
              icon={Icon.List}
              onAction={() => open(focusListDeeplink(effectiveNowPath))}
            />
          }
        />
      </MenuBarExtra.Section>
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
      </MenuBarExtra.Section>
      <MenuBarMoreSubmenu effectiveNowPath={effectiveNowPath} />
    </MenuBarExtra>
  );
}
