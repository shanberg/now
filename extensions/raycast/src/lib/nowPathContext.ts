/**
 * Path context resolution: app → Now file path, resolveNowPathFromContext.
 * Depends on nowParse, nowPath.
 */
import { parseJsonToRecord } from "./nowParse";
import { resolveNowFilePath } from "./nowPath";

function getAppMapKey(
  map: Record<string, string>,
  app: { bundleId?: string; name: string },
): string | null {
  if (app.bundleId != null && map[app.bundleId] !== undefined)
    return app.bundleId;
  if (app.name && map[app.name] !== undefined) return app.name;
  return null;
}

/**
 * Returns the resolved Now file path for the given app if it exists in the merged app map, else null.
 * Use for "app path for current" sidebar/labels; for the path to use, call resolveNowFilePathForApp.
 */
export function getAppPathForCurrentApp(
  mergedAppJson: string,
  app: { bundleId?: string; name: string } | null,
): string | null {
  if (!app) return null;
  const map = parseJsonToRecord(mergedAppJson);
  const key = getAppMapKey(map, app);
  return key ? resolveNowFilePath(map[key]) : null;
}

export type ResolveNowPathResult = {
  path: string;
  sourceLabel: string;
  appPathForCurrent: string | null;
};

function pathResult(
  path: string,
  sourceLabel: string,
  appPathForCurrent: string | null,
): ResolveNowPathResult {
  return { path, sourceLabel, appPathForCurrent };
}

/**
 * Resolves which Now file path to use given the frontmost app and an optional JSON mapping.
 * Keys are matched against app.bundleId then app.name; values are paths (passed through resolveNowFilePath).
 * Returns defaultPath (resolved) if mapping is empty/invalid or no key matches.
 */
export function resolveNowFilePathForApp(
  defaultPath: string,
  mappingJson: string | undefined,
  app: { bundleId?: string; name: string },
): string {
  if (!mappingJson || typeof mappingJson !== "string")
    return resolveNowFilePath(defaultPath);
  const map = parseJsonToRecord(mappingJson);
  const key = getAppMapKey(map, app);
  const raw = key ? map[key] : defaultPath;
  return resolveNowFilePath(raw);
}

/**
 * Suggested Now file path for an app: ~/.now/<SanitizedName>.now.md
 */
export function suggestedNowPathForApp(app: { name: string }): string {
  const sanitized = app.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const name = sanitized || "app";
  return `~/.now/${name}.now.md`;
}

/**
 * Single place for base + app resolution. Order: useGlobal → app → last used → default.
 */
export function resolveNowPathFromContext(options: {
  defaultPath: string;
  useGlobal: boolean;
  mergedAppJson: string;
  app: { bundleId?: string; name: string } | null;
  lastResolvedPath: string | null;
}): ResolveNowPathResult {
  const { defaultPath, useGlobal, mergedAppJson, app, lastResolvedPath } =
    options;
  const appPathForCurrent = getAppPathForCurrentApp(mergedAppJson, app);

  if (useGlobal) return pathResult(defaultPath, "Global", appPathForCurrent);
  if (app) {
    const path = resolveNowFilePathForApp(defaultPath, mergedAppJson, app);
    const sourceLabel = path !== defaultPath ? `${app.name} — ${path}` : "Global";
    return pathResult(path, sourceLabel, appPathForCurrent);
  }
  if (lastResolvedPath) {
    return pathResult(
      lastResolvedPath,
      `Last used — ${lastResolvedPath}`,
      null,
    );
  }
  return pathResult(defaultPath, "Global", appPathForCurrent);
}
