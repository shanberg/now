/**
 * Fetches focus data for path-switch targets so the list-focus detail panel can show previews.
 */
import { useEffect, useState } from "react";
import { pathSwitchContextSwitchTargetPaths } from "./pathContext";
import type { PathSwitchContext } from "./pathContext";
import { fetchFocusData } from "./useFocusData";
import type { FocusDataResult } from "./useFocusData";

export function useSwitchTargetPreviews(
  pathReady: boolean,
  pathSwitchContext: PathSwitchContext,
): Record<string, FocusDataResult> {
  const [previews, setPreviews] = useState<Record<string, FocusDataResult>>({});

  useEffect(() => {
    if (!pathReady) return;
    const targets = pathSwitchContextSwitchTargetPaths(pathSwitchContext);
    let cancelled = false;
    targets.forEach((path) => {
      fetchFocusData(path).then((result) => {
        if (!cancelled) {
          setPreviews((prev) => ({ ...prev, [path]: result }));
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pathReady, pathSwitchContext]);

  return previews;
}
