/**
 * One Thing app sync: open one-thing: URL when focus text changes (if preference enabled).
 * Used by list-focus to update the One Thing menu bar app.
 */
import { useEffect, useRef } from "react";
import { open } from "@raycast/api";
import { getOneThingUrl } from "./now";

export function useOneThingSync(
  enabled: boolean | undefined,
  focusText: string | undefined,
): void {
  const hasDeferred = useRef(false);

  useEffect(() => {
    if (!enabled || !focusText) return;
    if (hasDeferred.current) {
      open(getOneThingUrl(focusText));
    } else {
      hasDeferred.current = true;
    }
  }, [enabled, focusText]);
}
