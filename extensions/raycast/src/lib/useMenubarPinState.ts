/**
 * Menu-bar pinned path state: localStorage + effective path.
 */
import { useLocalStorage } from "@raycast/utils";
import { NOW_MENUBAR_PINNED_PATH_KEY } from "./now";

export type UseMenubarPinStateResult = {
  pinnedPath: string | null;
  effectiveNowPath: string;
  setPinnedPathStorage: (value: string) => void;
  clearMenubarPin: () => void;
};

export function useMenubarPinState(
  nowFilePath: string,
): UseMenubarPinStateResult {
  const { value: pinnedPathStorage, setValue: setPinnedPathStorage } =
    useLocalStorage<string>(NOW_MENUBAR_PINNED_PATH_KEY, "");

  const pinnedPath =
    typeof pinnedPathStorage === "string" && pinnedPathStorage.trim() !== ""
      ? pinnedPathStorage.trim()
      : null;

  const effectiveNowPath = pinnedPath ?? nowFilePath;
  const clearMenubarPin = () => void setPinnedPathStorage("");

  return {
    pinnedPath,
    effectiveNowPath,
    setPinnedPathStorage,
    clearMenubarPin,
  };
}
