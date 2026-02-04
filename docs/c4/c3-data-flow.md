# C3 – Data flow (path → effective path → focus)

How path resolution, effective path (with pinning), and focus data connect. Focus cache is the sync point between list and menu bar. List effective path = `pinnedPath ?? nowFilePath` (in-session); menubar effective path = `menubarPinned ?? nowFilePath` (menubar pin from LocalStorage).

```mermaid
flowchart LR
  subgraph Inputs["Inputs"]
    Prefs[Preferences<br/>default path]
    LS[(LocalStorage)]
    App[Frontmost app]
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
