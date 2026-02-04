/**
 * Menu-bar loading state (path resolving or focus loading).
 */
import { MenuBarExtra } from "@raycast/api";

export function MenuBarLoadingView() {
  return (
    <MenuBarExtra isLoading tooltip="Now focus">
      <MenuBarExtra.Item title="Loading…" />
    </MenuBarExtra>
  );
}
