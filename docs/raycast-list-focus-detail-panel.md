# List-focus detail panel: contract

## Principle

**The detail view always shows a live, formatted preview of the future state implied by the current selection.**

- **Live**: Uses current data (items, focus, path) and, when relevant, the current search query. No cached or stale preview from another selection.
- **Formatted**: Renders via the shared formatter (e.g. `buildPreviewMarkdown` from now-format) so the tree and placeholders match CLI and editor behavior.
- **Future state**: The content answers “what would the list/file look like if I confirm this selection?” (e.g. after Switch, Add, Complete, Dive in, Create from search).
- **Query when relevant**: For selections that depend on the search bar (Narrow Focus with query, Create from search), the preview includes the parsed query so the user sees the exact tree that would be created.

## What each selection shows

| Selection | Future state preview |
|-----------|----------------------|
| **Switch** (another item) | Tree with that item as focus (▶). |
| **Narrow Focus** (action-add) | Tree with “add” placeholder after current; if search query is non-empty, tree with current + parsed new branch and first new item as next focus. |
| **Create from search** | Tree with current + parsed query as new branch (same as above when query present); otherwise current tree + short hint. |
| **Other actions** (complete, later, edit, wrap, dive-in) | Tree with the action’s placeholder/indicator (e.g. ✓ for complete, placeholder line for add/later, etc.). |
| **Path** (switch-global, switch-app) | Target file’s current tree (state after switching to that file). |
| **Create app file** | Minimal “new file” tree with one focus item. |

## Implementation

- **Single source**: One detail content per list view, computed from `effectiveSelectedId` and `searchText` in `listFocusDetail.tsx` (`buildDetailFromSelection`).
- **No fallback to unrelated preview**: If the primary selection cannot be rendered (e.g. missing path), fall back to the default selection’s preview, not a generic or off-context view.
- **Query in context**: `searchText` is passed through and used whenever the selection is “action-add” or “create-from-search” so the preview stays in sync with the search bar.
