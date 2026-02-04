/**
 * Shared "More" submenu for menu-bar-focus: Open Focus List, Open in Editor, Preferences.
 */
import {
  Icon,
  MenuBarExtra,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { focusListDeeplink } from "./raycastDeeplinks";

export function MenuBarMoreSubmenu({
  effectiveNowPath,
}: {
  effectiveNowPath: string;
}) {
  return (
    <MenuBarExtra.Submenu title="More" icon={Icon.Gear}>
      <MenuBarExtra.Item
        title="Open Focus List"
        icon={Icon.List}
        onAction={() => open(focusListDeeplink(effectiveNowPath))}
      />
      <MenuBarExtra.Item
        title="Open in Editor"
        icon={Icon.Document}
        onAction={() => open(effectiveNowPath)}
      />
      <MenuBarExtra.Item
        title="Open Extension Preferences…"
        onAction={openExtensionPreferences}
      />
    </MenuBarExtra.Submenu>
  );
}
