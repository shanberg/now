# Search-to-narrow-or-create: research and baby step

## Goal

- **Current:** Two steps for "narrow focus" — choose "Narrow Focus" action, then push to a form and type the query (slash/comma syntax).
- **Target:** User types in the **list search bar**. If the query matches an existing item, they can switch to it (existing behavior). If it matches **no** existing item, we treat it as "create new focus": the query is parsed (same slash/comma grammar as narrow focus), sent to the formatter, and a **live preview of the new tree** is shown in the **detail panel**.
- **Constraint:** Do not break current detail views for the selected action (path, item, action panels).

---

## Raycast List API (relevant)

- **Search bar:** By default the list filters by fuzzy match on `List.Item` `title` and `keywords`. To use the search bar for our own logic we can:
  - Set **`onSearchTextChange={(text) => ...}`** — then Raycast **implicitly sets `filtering` to false** unless we set `filtering={true}`.
  - Use **`filtering={false}`** and control which items are shown (and/or add a synthetic row).
- **`onSelectionChange(id: string | null)`:** When no items match the query, `id` is `null`.
- **Detail:** Each `List.Item` can have a `detail` prop. We currently pass one shared `detail` from `useDetailBySelection`, which picks content based on `effectiveSelectedId` (path / item / action). So we have a single detail content per selection; we must extend that to support "create preview when no match" or "create preview when on Narrow Focus + search text".
- **List.EmptyView:** Shown when there are no (matching) items. We can override it to show a "Create …" CTA and use the same detail area when that state is active.

---

## Current flow (narrow focus)

1. User selects **"Narrow Focus"** in the Actions section.
2. Detail panel shows tree preview with **"add"** action (placeholder line after current).
3. User triggers **Narrow Focus** → `Action.Push` to **AddNestedForm**.
4. User types in the form (e.g. `A, B / C`), submits → `runAdd(nowFilePath, items)` → CLI `add` with same grammar.

**Parsing (core):** `src/operations/treeManipulation.ts` — `createNestedChildren(tree, items)` parses `items` as:

- Split by **`/`** → levels (depth).
- Each level split by **`,`** → siblings at that level.

So the query string is the same as the form field.

---

## Existing pieces we can reuse

- **`buildPreviewMarkdown`** (now-format): takes `items`, `currentKey`, breadcrumb, name, `selectedKey`, `selectedAction`, optional `breadcrumbMaxLength`. For `selectedAction === "add"` it inserts the narrow placeholder after the current line. We can call it with a **synthetic** `items` array (current items + parsed new branch) to get the "tree after add" preview.
- **`detailForCreatePreview(rootName)`** (listFocusDetail): builds a minimal preview (single new item). We need a variant that takes **parsed query → new branch** and either merges with current items or shows a small tree.
- **Display format:** `getItemsList` in now-format returns `[display, key][]`; `display` has leading indent (multiples of `DATA_STR.indent`), then line marker and name. New branch items for preview must follow the same convention so `buildPreviewMarkdown` renders them correctly.

---

## Risks and constraints

1. **Detail source of truth:** Today detail is driven only by **selection** (path / item / action). We must add a second input: **search text**. When do we show "create preview"?
   - Option A: When **selected row is "Narrow Focus"** and **search text is non-empty** → show live preview of current tree + parsed query. (Does not require "no match" yet.)
   - Option B: When **no list item matches** the search (e.g. `onSelectionChange(null)` + non-empty search) → show create preview in detail and optionally a single "Create: &lt;query&gt;" row.
2. **Parsing in the extension:** The grammar lives in core (`createNestedChildren`). The extension does not import core. So we need either:
   - A small **query → JsonItem[]** parser in the extension (duplicate grammar: `/` and `,`), or
   - A function in **now-format** that, given the same `items` string, returns a flat `JsonItem[]` for the new branch (keys and display strings). That would keep a single place for the grammar if we later move it to now-format.
3. **Not breaking detail:** Any new branch (search text, no-match state) must be additive in `buildDetailFromSelection` / `useDetailBySelection`: when we’re in "create preview" mode we return the new markdown; otherwise we keep existing path/item/action detail logic unchanged.

---

## Recommended baby step

**Step: Live preview in detail when "Narrow Focus" is selected and the user has typed in the search bar.**

- Do **not** change list filtering or add a synthetic "Create" row yet.
- Do **not** assume "no match = create" yet.
- Do:
  1. **Wire search bar text into state**
     - In the list command, add **`onSearchTextChange`** and store the value (e.g. in context or state passed into `ListFocusContent`). If we use `onSearchTextChange`, set **`filtering={true}`** explicitly if we want to keep built-in filtering for now; otherwise the list will show all items and we can use the search text only for the detail.
  2. **Pass search text into the detail pipeline**
     - Add `searchText: string` to whatever feeds `useDetailBySelection` / `buildDetailFromSelection` (e.g. context or props).
  3. **Parse query → new branch (JsonItem[])**
     - Implement a small parser (extension or now-format): `parseNarrowQuery(query: string) => JsonItem[]` using the same rules: split by `/`, then by `,`; build flat list with `display` (indent + line marker + name) and unique keys (e.g. `"new-0"`, `"new-1"`). Use `DATA_STR.indent` and the same display convention as `getItemsList`.
  4. **Merge and show preview**
     - In the detail builder, when **selection is "action-add"** and **searchText is non-empty**:
       - Parse `searchText` → new branch items.
       - Merge with current items: insert new branch after the current item (indent = current indent + one level); keys must not clash (e.g. prefix new keys).
       - Call **`buildPreviewMarkdown(mergedItems, currentKey, breadcrumb, currentItemName, firstNewItemKey, null)`** (or keep `selectedAction === "add"` and pass the merged list so the first new item is shown as next focus).
       - Return **`<List.Item.Detail markdown={…} />`** for this case.
     - When selection is "action-add" and searchText is empty, keep **current** behavior (existing add-placeholder preview).

Result: same list behavior and selection behavior; the only change is that when the user selects "Narrow Focus" and types in the search bar, the detail panel shows a live preview of the tree as if they had submitted that query. That de-risks formatter integration and preview path without touching "no match" or filtering.

---

## Next steps (after this baby step)

1. **Custom filtering:** Set `filtering={false}`, filter list items by search (e.g. fuzzy on title), so that "no match" is well-defined.
2. **No-match → create:** When no item matches and search is non-empty, show a single row (e.g. "Create: &lt;query&gt;") and use the same preview in the detail; optionally allow submitting from that row (one-step create).
3. **Submit from list:** When the user confirms (e.g. Enter on the "Create" row or on "Narrow Focus" with search text), call `runAdd(nowFilePath, searchText)` and close or refresh.

---

## Files to touch (baby step)

- **List + search state:** `list-focus.tsx` and/or `listFocusList.tsx` — add `onSearchTextChange`, state, pass `searchText` into provider or `ListFocusListContent`.
- **Context:** `listFocusContextState.ts` / `listFocusContext.tsx` — add `searchText` (and optional setter) to context if we want it available to detail/actions.
- **Detail:** `listFocusDetail.tsx` — in `buildDetailFromSelection`, when selection is action "add" and `searchText` is non-empty, compute merged items, call `buildPreviewMarkdown`, return detail. Add or use a `parseNarrowQuery` helper (either in this file, a new `listFocusNarrowQuery.ts`, or in now-format).
- **Parsing:** New helper (extension or now-format): `parseNarrowQuery(query: string) => JsonItem[]` and a small `mergeItemsForAddPreview(currentItems, currentKey, newBranchItems)` that returns the flat list with correct indent and keys.

---

## Summary

- **Idea:** One search bar: match → switch; no match → create, with live preview in the detail panel using the same slash/comma grammar and formatter.
- **Baby step:** Don’t change "no match" or list filtering yet. Only add: (1) search bar → state, (2) when selection is "Narrow Focus" and search text non-empty, show live tree preview in the detail using parsed query + `buildPreviewMarkdown`. This validates the preview path and keeps existing behavior intact.
