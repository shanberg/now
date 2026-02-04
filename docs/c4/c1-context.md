# C1 – System Context

High-level view of the Now system and its users and external systems. The extension reads `.now.md` directly when possible (fast path) and invokes the CLI for mutations and when direct read fails.

```mermaid
flowchart TB
  subgraph Users
    U1[User]
  end
  subgraph External["External systems"]
    R[Raycast]
    T[Terminal]
    FS[(Filesystem<br/>.now.md)]
    OT[One Thing]
    W[Watcher process]
  end
  subgraph Now["Now system"]
    CLI[Now CLI]
    Ext[Raycast Extension]
  end
  U1 -->|commands, tui| CLI
  U1 -->|list, menubar| R
  R --> Ext
  Ext -->|NOW_FILE, json, init, mutations| CLI
  Ext -->|read .now.md| FS
  CLI -->|read/write| FS
  CLI --> T
  Ext -->|deeplink| OT
  Ext -->|ensure, config| W
  W -->|dirty file| Ext
```
