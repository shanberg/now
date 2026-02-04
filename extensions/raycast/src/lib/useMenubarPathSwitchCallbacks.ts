/**
 * Path-switch callbacks for menu-bar-focus.
 */
import { createMenubarPathSwitchCallbacks } from "./menuBarPathSwitch";
import type { MenubarPathSwitchDeps } from "./menuBarPathSwitch";
import type { PathSwitchCallbacks } from "./pathSwitchActions";

export function useMenubarPathSwitchCallbacks(
  deps: MenubarPathSwitchDeps,
): PathSwitchCallbacks {
  return createMenubarPathSwitchCallbacks(deps);
}
