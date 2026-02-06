/**
 * Shared async flows for switching Now file paths (list-focus + menu-bar-focus).
 *
 * Goal: one canonical ordering of storage writes → UI pin/label → CLI switch → refresh/caches.
 */
import { runSwitch, type MutationResult } from "./now";

export type PerformSwitchToPathArgs = {
  /** Absolute path to the target now file (already resolved). */
  path: string;
  /** When true, set useGlobal; when false, set app/last-used mode. */
  useGlobal: boolean;
  setUseGlobal: (useGlobal: boolean) => Promise<void>;

  /** Optional: persist last resolved path when switching. */
  setLastResolvedPath?: (path: string) => Promise<void>;
  /** Optional: re-run path resolution after storage changes. */
  refreshPathFromStorage?: () => Promise<void>;

  /** Run before invoking the CLI `now switch` (e.g. pin/label updates). */
  beforeRunSwitch?: () => void | Promise<void>;
  /** Run after CLI switch + refresh/apply mutation (e.g. selection reset). */
  afterSwitched?: () => void | Promise<void>;

  /** Called when the CLI returns a MutationResult; list-focus uses this to optimistically update cache. */
  applyMutationResult?: (result: MutationResult) => Promise<void>;
  /** Fallback refresh when CLI doesn't return a result (or applyMutationResult not provided). */
  refresh: () => void | Promise<void>;
};

/**
 * Canonical "switch to a specific path" transaction.
 *
 * Storage writes (useGlobal + optional lastResolvedPath) happen first; optional path-resolution refresh runs next;
 * UI pin/label callbacks run before the CLI switch; then we run `now switch`; finally we apply mutation or refresh.
 */
export async function performSwitchToPath(
  args: PerformSwitchToPathArgs,
): Promise<void> {
  await args.setUseGlobal(args.useGlobal);
  if (args.setLastResolvedPath) await args.setLastResolvedPath(args.path);
  if (args.refreshPathFromStorage) await args.refreshPathFromStorage();

  if (args.beforeRunSwitch) await args.beforeRunSwitch();

  const result = await runSwitch(args.path, "0");
  if (result && args.applyMutationResult) {
    await args.applyMutationResult(result);
  } else {
    await args.refresh();
  }

  if (args.afterSwitched) await args.afterSwitched();
}
