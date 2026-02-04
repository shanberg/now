# C4 architecture diagrams

[C4 model](https://c4model.com/) diagrams for the Now codebase.

| Diagram | Description |
|--------|-------------|
| [c1-context.md](./c1-context.md) | **System context** — Users, Now system (CLI + Extension), and external systems (Raycast, Terminal, filesystem, One Thing, watcher). |
| [c2-containers.md](./c2-containers.md) | **Containers** — CLI (Deno), Raycast Extension, now-format package, watcher; how they relate and where they read/write. |
| [c3-extension-components.md](./c3-extension-components.md) | **Extension components** — Path resolution, path context UI, focus data hooks, focus cache, and CLI/file bridge. |
| [c3-data-flow.md](./c3-data-flow.md) | **Data flow** — Path resolution → effective path (pinning) → focus data and focus cache. |

Diagrams are Mermaid. They render in GitHub, many Markdown viewers, and VS Code (with a Mermaid extension).
