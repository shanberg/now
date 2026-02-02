# Now Changelog

## [List–menubar mutation flow] - 2025-02-02

- **CLI:** Mutation commands (`complete`, `add`, `later`, `edit`, `switch`, `wrap`, `move`) accept `--emit-json` as the last argument and print one line of JSON `{ focus, items }` to stdout after the mutation. Enables the extension to update UI without re-reading the file.
- **Extension list:** After a mutation, the list updates state from the CLI result (when non-null) and writes the shared focus cache; it no longer calls refresh/getJsonFocus after its own mutations. Fallback: when the CLI does not support `--emit-json` or returns invalid JSON, the list still calls refresh once.
- **Extension menubar:** Finish This updates state from the mutation result when non-null and writes cache; otherwise falls back to getJsonFocus. When the menubar is opened, if the shared cache is fresh (updated within 60s), it uses cache only and does not read the file.
- **Focus cache:** Cache entries now include optional `items` so list and menubar can stay in sync after mutations without re-reading the file.

## [Extension cleanup Phase 2] - 2025-02-02

- **lib/now.ts:** Deduplicated app-map key resolution: added `getAppMapKey(map, app)`; `getAppPathForCurrentApp` and `resolveNowFilePathForApp` now use it.
- **lib/now.ts + nowStorage.ts:** Exported `parseJsonToRecord` from now; nowStorage imports it and no longer defines a local copy.
- **lib/now.ts:** Extracted `normalizeAppleScriptPath(raw)` from `getCurrentDocumentPath`; path normalization (file://, colon-to-slash) lives in the helper.

## [Extension cleanup] - 2025-02-02

- **list-focus:** Switch to Document/App now use only `refreshPathFromStorage()` after setting lastResolvedPath (removed direct `setSourceLabel` / `setNowFilePath`); path and label stay in sync via hook.
- **lib/now.ts:** Refactored `getDocPathForCurrentDocument` into helpers `findExactMatch`, `pickBestByPathSimilarity`, `pickBestByFilenameSimilarity`; behavior unchanged, tests pass.
- **menu-bar-focus:** Extracted `PathActionsMenuSection` for Create/Switch path actions; used in both no-focus and has-focus branches (single implementation).

## [Store alignment and UI polish] - {PR_MERGE_DATE}

- Remove root command `navigationTitle` (use Raycast default)
- Add command subtitles "Now" for store search context
- Use Title Case for action and section titles per Raycast guidelines
- Add CHANGELOG for store version history

## [Initial version] - 2025-02-02

- Menu bar: show current now focus, refresh on interval, click for actions
- Focus List: view focusable items, set focus, complete, copy, refresh
- Preferences: focus file path, app-specific Now files, document-specific resolution, One Thing integration, truncation options
