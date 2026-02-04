/**
 * Derived state for list-focus empty view: showEmpty, fileMissing, cliMissing.
 */
import { focusFileExists } from "./now";
import { useCliMissing } from "./useCliMissing";

export type UseListFocusEmptyStateArgs = {
  items: unknown[] | null;
  error: unknown;
  isLoading: boolean;
  effectivePath: string | null;
};

export function useListFocusEmptyState({
  items,
  error,
  isLoading,
  effectivePath,
}: UseListFocusEmptyStateArgs): {
  showEmpty: boolean;
  fileMissing: boolean;
  cliMissing: boolean | null;
} {
  const hasItems = Array.isArray(items) && items.length > 0;
  const showEmpty = !isLoading && (!!error || !hasItems);
  const fileMissing = !!error && !focusFileExists(effectivePath ?? "");
  const cliMissing = useCliMissing(showEmpty && !!error && !fileMissing);

  return { showEmpty, fileMissing, cliMissing };
}
