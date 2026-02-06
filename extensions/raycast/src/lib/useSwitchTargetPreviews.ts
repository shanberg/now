/**
 * Fetches focus data for path-switch targets so the list-focus detail panel can show previews.
 */
import { useEffect, useMemo, useState } from "react";
import { pathSwitchContextSwitchTargetPaths } from "./pathContext";
import type { PathSwitchContext } from "./pathContext";
import { fetchFocusData } from "./useFocusData";
import type { FocusDataResult } from "./useFocusData";

export function useSwitchTargetPreviews(
  pathReady: boolean,
  pathSwitchContext: PathSwitchContext,
): Record<string, FocusDataResult> {
  const [previews, setPreviews] = useState<Record<string, FocusDataResult>>({});

  const switchTargetPaths = useMemo(
    () => pathSwitchContextSwitchTargetPaths(pathSwitchContext),
    [pathSwitchContext],
  );
  // Stable signature so effects don't refire when context object identity changes.
  const switchTargetSignature = switchTargetPaths.join("\n");

  useEffect(() => {
    if (!pathReady) return;
    let cancelled = false;
    // Reset when switch targets change so we don't show stale previews for old paths.
    setPreviews({});
    switchTargetPaths.forEach((path) => {
      fetchFocusData(path).then((result) => {
        if (!cancelled) {
          setPreviews((prev) => ({ ...prev, [path]: result }));
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pathReady, switchTargetSignature]);

  return previews;
}
