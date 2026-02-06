# C3 – Data flow (path → effective path → focus)

How path resolution, effective path (with pinning), and focus data connect. Focus cache is the sync point between list and menu bar. List effective path = `pinnedPath ?? nowFilePath` (in-session); menubar effective path = `menubarPinned ?? nowFilePath` (menubar pin from LocalStorage).

**App context for path resolution** comes from two places: (1) **Frontmost app** — when the command is already open, `getFrontmostApplication()` is used. (2) **Dirty file** — when the menu bar is opened (including via the watcher’s deeplink after file change or app switch), it reads the dirty file once on mount; if the write is recent (&lt;60s) and includes `app`, it calls `refreshPathFromStorageWithApp(app)` so the correct file is shown even though Raycast may now be frontmost. The Swift watcher writes `{ ts, app? }` to the dirty file on each trigger.

```mermaid
flowchart LR
  subgraph Inputs["Inputs"]
    Prefs[Preferences<br/>default path]
    LS[(LocalStorage)]
    App[Frontmost app]
    Dirty[(dirty file<br/>watcher writes app)]
  end
  subgraph Resolution["Path resolution"]
    Resolve[resolveNowPathFromContext]
    useNowPath[useNowPathFromStorage]
  end
  subgraph Effective["Effective path"]
    NowPath[nowFilePath]
    ListEff[list effective path]
    MBEff[menubar effective path]
  end
  subgraph FocusData["Focus data"]
    Fetch[fetchFocusData / useCachedPromise]
    CacheRead[useFocusDataCacheState]
    ApplyMut[applyMutationResult]
  end
  subgraph Cache["Focus cache"]
    FC[(path to entry)]
  end
  Prefs --> useNowPath
  LS --> useNowPath
  App --> useNowPath
  Dirty -->|menu bar only<br/>refreshPathFromStorageWithApp| useNowPath
  useNowPath --> Resolve
  Resolve --> NowPath
  NowPath --> ListEff
  NowPath --> MBEff
  LS -->|menubar pin| MBEff
  ListEff --> Fetch
  ListEff --> CacheRead
  MBEff --> CacheRead
  FC --> CacheRead
  Fetch --> FC
  ApplyMut --> FC
```
