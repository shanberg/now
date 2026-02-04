# C3 – Extension components (path + focus data)

Components inside the Raycast extension: path resolution, path context UI, focus data hooks, shared cache, and CLI/file bridge. Path resolution is implemented by `resolveNowPathFromContext` in `now.ts`; `useNowPathFromStorage` calls it and reads/writes LocalStorage.

```mermaid
flowchart TB
  subgraph Commands["Commands"]
    LF[list-focus]
    MB[menu-bar-focus]
  end
  subgraph Path["Path"]
    useNowPath[useNowPathFromStorage]
    pathCtx[pathContext.ts]
    pathActions[pathSwitchActions]
  end
  subgraph Data["Focus data"]
    useFD[useFocusData]
    useFDCS[useFocusDataCacheState]
    surface[focusDataSurface]
  end
  subgraph Storage["Shared storage"]
    LS[(LocalStorage<br/>useGlobal, app/doc paths,<br/>lastResolved, menubar pin)]
    FC[(Focus cache<br/>path to focus, breadcrumb, items)]
  end
  subgraph Bridge["CLI / file"]
    now[now.ts]
  end
  LF --> useNowPath
  MB --> useNowPath
  useNowPath --> LS
  useNowPath -->|resolveNowPathFromContext| now
  pathCtx --> now
  LF --> useFD
  MB --> useFD
  useFD --> useFDCS
  useFD --> surface
  useFDCS --> FC
  useFD --> now
  useFD --> FC
  pathCtx --> pathActions
  useNowPath --> pathCtx
  LF --> pathActions
  MB --> pathActions
  NowCLI[Now CLI]
  NowFS[(.now.md files)]
  now --> NowCLI
  now --> NowFS
```
