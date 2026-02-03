import { useEffect, useState } from "react";
import { isNowOnPath } from "./now";

/**
 * Returns whether the now CLI is missing from PATH when we should show that state.
 * When `shouldCheck` is false, returns null (and clears any previous result).
 * When `shouldCheck` is true, runs `isNowOnPath()` and returns !onPath (true = CLI missing).
 * Used by list-focus (empty + error + file exists) and menu-bar-focus (no focus + not loading).
 */
export function useCliMissing(shouldCheck: boolean): boolean | null {
  const [cliMissing, setCliMissing] = useState<boolean | null>(null);

  useEffect(() => {
    if (!shouldCheck) {
      setCliMissing(null);
      return;
    }
    let cancelled = false;
    isNowOnPath().then((onPath) => {
      if (!cancelled) setCliMissing(!onPath);
    });
    return () => {
      cancelled = true;
    };
  }, [shouldCheck]);

  return cliMissing;
}
