# State management and memoization cleanup (Raycast extension)

## Current problems

### 1. Prop drilling and giant “context” objects

`list-focus.tsx` threads the same logical context through many layers:

- **Path**: `nowFilePath`, `effectivePath`, `pathForMutations`, `pathReady`, `pathSwitchContext`, `pathDescriptorsForList`, `pathSwitchCallbacks`, `nowInputLabel`
- **Focus data**: `focus`, `items`, `itemsForMove`, `refresh`, `applyMutationResult`, `setPinnedPath`
- **Selection**: `selectedId`, `setSelectedId`, `effectiveSelectedId`, `selectionIdArrays`, `detail`
- **Sections**: `contextSection`, `otherSection`, `runNav`

These are passed into 6+ hooks and then into `ListFocusListContent`, `ListFocusEmptyView`, and action panel builders. There is no React Context; everything is “context” in the sense of a big bag of props.

**Consequence**: Any hook that needs “the list focus context” takes 10+ arguments. `useListFocusActionPanelContext` returns a single memoized object with 10+ fields so it can be passed into `useActionPanels`. That object’s identity changes whenever any of those fields change, so action panels and list content re-render often. Memoization is used to stabilize, but the surface area is large.

### 2. useFocusData is doing too much

- **Four modes** in one hook: `sync_first_paint`, `cache_only`, `fresh_cache`, `fetch`. List uses fetch (with optional sync first paint); menu bar uses cache-only. The “fresh cache” path (read cache, skip fetch if fresh) adds a lot of state and branches.
- **useFocusDataCacheState** holds 5 pieces of state: `cacheOnlyData`, `cacheOnlyLoading`, `cacheCheckDone`, `hasFreshCache`, `freshCacheData` (+ setters). Most of that exists to support the fresh-cache mode.
- **useFocusDataSurface** composes `useCachedPromise` with several `useMemo`s (`executeFetch`, `syncFirstPaint`, `dataSurface`) and callbacks. The dependency arrays are long and easy to get wrong.
- **Effect** that writes to focus cache depends on `data?.items?.map((i) => i.key).join(",")` (and other primitives) to avoid unnecessary writes. That’s brittle and forces careful dependency hygiene.

**Consequence**: Hard to reason about when data comes from cache vs fetch, and when the menu bar and list stay in sync. A lot of memoization exists just to keep this hook’s return value and internal state consistent.

### 3. Redundant or low-value memoization

- **`itemsForMove = useMemo(() => items ?? [], [items])`** in list-focus: same reference as `items` when non-null; when `items` changes, you want to re-run anyway. Can be `items ?? []` at the call site or dropped.
- **usePathSwitchCallbacks** wraps three `useCallback`s in `useMemo(() => ({ ... }), [switchToGlobal, switchToApp, createForApp])`. The object is only used as a dependency; the callbacks are already stable. Returning a plain object is fine unless a consumer is doing `context === prevContext`.
- **useListFocusActionPanelContext**: Two nested `useMemo`s (mutationFormProps, then full context) with 10+ dependencies. Any change to path, focus, items, or callbacks recreates the whole context and invalidates `useActionPanels`. This is the main “everything re-renders” trigger.

### 4. Hooks must run unconditionally

Because of Rules of Hooks, list-focus cannot early-return before calling `useListFocusSelection`, `useListFocusSections`, `useListFocusActionPanelContext`, `useActionPanels`. So we pay the cost of all selection/section/panel logic even when we’re about to render `ListFocusLoadingView` or `ListFocusEmptyView`. That increases the number of hooks and state that “always run.”

### 5. Duplication between list and menu bar

- List: `useListFocusPathSwitch` → `usePathSwitchContext` + `usePathSwitchCallbacks`.
- Menu bar: `usePathSwitchContext` + `useMenubarPathSwitchCallbacks`.

Path *context* is shared; path *callbacks* are different (list pins path and sets selection; menu bar doesn’t). The split is reasonable but the “path switch” concept is spread across multiple hooks and types, which adds cognitive load.

---

## Cleanup plan (prioritized)

### Phase 1: Reduce prop drilling with React Context (list-focus)

**Goal**: One or two contexts so list-focus doesn’t pass 15+ props through multiple hooks and components.

- Introduce **ListFocusContext** (or split into **PathContext** + **FocusDataContext** if you prefer smaller contexts) in list-focus.
- Provide: path (effectivePath, pathForMutations, pathReady), focus data (focus, items, refresh, applyMutationResult, setPinnedPath), path switch (pathSwitchContext, pathSwitchCallbacks, pathDescriptorsForList, nowInputLabel), selection (selectedId, setSelectedId, effectiveSelectedId, detail), and any other shared state.
- Refactor so that:
  - `useListFocusSections`, `useListFocusActionPanelContext`, and `useActionPanels` (or the components that use them) **read from context** instead of receiving 10+ args.
  - `ListFocusListContent`, `ListFocusEmptyView`, and action panel builders get minimal props (e.g. only what’s not in context) or get everything from context.
- Keep **path resolution** and **focus data fetching** at the top level (same as now); only the *consumption* moves into context.

**Result**: list-focus.tsx becomes: resolve path → load focus data → provide context → render list/empty/loading. Fewer hook arguments and fewer giant memoized objects passed down.

### Phase 2: Simplify useFocusData modes

**Goal**: Fewer code paths and less cache state.

- **Option A – Remove fresh_cache**: If menu bar only needs “cache only” when opened, drop `maxCacheAgeMs` and the “fresh cache” path from useFocusData. Then useFocusData has:
  - **List**: fetch (with optional sync first paint from cache for instant first paint).
  - **Menu bar**: cache-only (no fetch).
  That lets you remove from useFocusDataCacheState: `cacheCheckDone`, `hasFreshCache`, `freshCacheData`, `setFreshCacheData`, and the entire “fresh check” flow. useFocusDataCacheState would only handle cache-only reads (e.g. for menu bar).
- **Option B – Keep fresh_cache but isolate it**: If you want “use cache when fresh” elsewhere, implement that in a separate hook or a single place that composes useFocusData, rather than inside the same hook with four modes.

Also:

- Simplify the **effect** that writes to focus cache: e.g. depend on `dataSurface.currentData` (or a stable “version” of it) and do a shallow or key-based comparison inside the effect to decide whether to write, instead of listing `data?.items?.map(...).join(",")` in the dependency array.

**Result**: useFocusData and useFocusDataCacheState have fewer branches and less state; behavior is easier to reason about.

### Phase 3: Trim redundant memoization

**Goal**: Keep memoization only where it prevents real re-render or reference issues.

- **itemsForMove**: Remove `useMemo`; use `items ?? []` where needed (e.g. in `useListFocusActionPanelContext` or via context).
- **usePathSwitchCallbacks**: Return a plain object `{ switchToGlobal, switchToApp, createForApp }`; only add back `useMemo` if you measure that the object identity is causing unnecessary re-renders (e.g. in a child that does `context === prevContext`).
- **useListFocusActionPanelContext**: Once list-focus uses context, this hook can consume context and build the action panel context object. Consider a single `useMemo` with a smaller set of “actual” dependencies (e.g. pathForMutations, focus, currentKey, items, and stable callback refs), or move “build action panel from context” into a component that subscribes to context and passes a stable context object to `useActionPanels` only when the relevant slice of context changes.
- **useListFocusSections**: contextSection and otherSection could be computed inside a component that reads from context, so they’re not passed through multiple layers; then memoization can be scoped to that component if needed.

**Result**: Fewer useMemo/useCallback with long dependency lists; same behavior, simpler code.

### Phase 4 (optional): Conditional rendering to avoid unnecessary hook runs

**Goal**: Don’t run selection/section/action-panel hooks when showing loading or empty.

- Split the command into a small “router” component that only does path + focus data (and maybe path switch), then:
  - If `!pathReady` → render loading (no selection/section/panel hooks).
  - If empty state → render empty view (optionally with a minimal set of hooks for empty-view actions only).
  - Otherwise → render a **ListFocusContent** component that calls `useListFocusSelection`, `useListFocusSections`, `useListFocusActionPanelContext`, `useActionPanels` and the list.
- This respects Rules of Hooks (each branch has a fixed hook order) while avoiding running heavy hooks when they’re not needed.

**Result**: Slightly less work on loading/empty; clearer separation between “loading”, “empty”, and “list” code paths.

---

## Summary

| Problem | Direction |
|--------|-----------|
| Prop drilling, 10+ arg hooks | React Context for list-focus (Phase 1) |
| useFocusData too complex (4 modes, 5 cache state vars) | Simplify to fetch vs cache-only; trim useFocusDataCacheState (Phase 2) |
| Redundant / oversized memoization | Remove itemsForMove useMemo; simplify path callbacks and action panel context memo (Phase 3) |
| All hooks run even for loading/empty | Optional: split command into router + ListFocusContent (Phase 4) |

Start with **Phase 1** (context) so that later phases don’t have to thread so many props through memoized hooks. Then **Phase 2** (useFocusData) and **Phase 3** (memoization) can be done in small steps with tests and manual verification after each change.
