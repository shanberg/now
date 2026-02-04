/**
 * Deeplinks for Raycast commands. Shared by list-focus and menu-bar-focus.
 */
import { createDeeplink } from "@raycast/utils";
import { LaunchType } from "@raycast/api";

/** Deeplink to open list-focus with the given now file path as context. */
export function focusListDeeplink(nowFilePath: string): string {
  return createDeeplink({
    command: "list-focus",
    context: { path: nowFilePath },
  });
}

/** Deeplink to trigger menu-bar-focus in the background (used by watcher). */
export function menuBarBackgroundDeeplink(): string {
  return createDeeplink({
    command: "menu-bar-focus",
    launchType: LaunchType.Background,
  });
}
