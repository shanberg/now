/**
 * Form and list sub-screens for list-focus: Add, Later, Edit, Wrap, Move target.
 */
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { memo, useEffect, useRef, useState } from "react";
import {
  getPreviewMarkdownForMove,
  runAdd,
  runEdit,
  runLater,
  runMove,
  runWrap,
  type JsonItem,
  type MutationResult,
} from "./now";

export type MutationFormProps = {
  nowFilePath: string;
  applyMutationResult: (result: MutationResult) => Promise<void>;
  refresh: () => void | Promise<void>;
};

export function AddNestedForm({
  nowFilePath,
  applyMutationResult,
  refresh,
}: MutationFormProps) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add"
            icon={Icon.Plus}
            onSubmit={async (values: { items: string }) => {
              const items = (values.items ?? "").trim();
              if (!items) {
                await showToast(Toast.Style.Failure, "Enter at least one item");
                return;
              }
              try {
                const result = await runAdd(nowFilePath, items);
                if (result) await applyMutationResult(result);
                else await refresh();
                await showToast(Toast.Style.Success, "Added");
                pop();
              } catch (e) {
                await showToast(Toast.Style.Failure, "Failed", String(e));
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="items"
        title="Items"
        placeholder="Item 1, Item 2 / Sub"
        info="Comma-separated or use / for nesting"
      />
    </Form>
  );
}

export function LaterForm({
  nowFilePath,
  applyMutationResult,
  refresh,
}: MutationFormProps) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Later"
            icon={Icon.Plus}
            onSubmit={async (values: { items: string }) => {
              const items = (values.items ?? "").trim();
              if (!items) {
                await showToast(Toast.Style.Failure, "Enter at least one item");
                return;
              }
              try {
                const result = await runLater(nowFilePath, items);
                if (result) await applyMutationResult(result);
                else await refresh();
                await showToast(Toast.Style.Success, "Added");
                pop();
              } catch (e) {
                await showToast(Toast.Style.Failure, "Failed", String(e));
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="items"
        title="Items"
        placeholder="Item 1, Item 2 / Sub"
        info="Comma-separated or use / for nesting (follow-up siblings)"
      />
    </Form>
  );
}

export function EditForm({
  nowFilePath,
  currentName,
  applyMutationResult,
  refresh,
}: MutationFormProps & { currentName: string }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Edit"
            icon={Icon.TextCursor}
            onSubmit={async (values: { newName: string }) => {
              const newName = (values.newName ?? "").trim();
              if (!newName) {
                await showToast(Toast.Style.Failure, "Enter a name");
                return;
              }
              try {
                const result = await runEdit(nowFilePath, newName);
                if (result) await applyMutationResult(result);
                else await refresh();
                await showToast(Toast.Style.Success, "Updated");
                pop();
              } catch (e) {
                await showToast(Toast.Style.Failure, "Failed", String(e));
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newName"
        title="New name"
        info="Edit the current focus description"
        defaultValue={currentName}
        placeholder="Focus description"
      />
    </Form>
  );
}

export function WrapForm({
  nowFilePath,
  applyMutationResult,
  refresh,
}: MutationFormProps) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Wrap"
            icon={Icon.ArrowUp}
            onSubmit={async (values: { parentName: string }) => {
              const parentName = (values.parentName ?? "").trim();
              if (!parentName) {
                await showToast(Toast.Style.Failure, "Enter parent name");
                return;
              }
              try {
                const result = await runWrap(nowFilePath, parentName);
                if (result) await applyMutationResult(result);
                else await refresh();
                await showToast(Toast.Style.Success, "Wrapped");
                pop();
              } catch (e) {
                await showToast(Toast.Style.Failure, "Failed", String(e));
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="parentName"
        title="New parent name"
        placeholder="Parent focus"
      />
    </Form>
  );
}

type MoveTargetListProps = {
  nowFilePath: string;
  currentKey: string;
  items: JsonItem[];
  applyMutationResult: (result: MutationResult) => Promise<void>;
  refresh: () => void | Promise<void>;
};

function MoveTargetListInner({
  nowFilePath,
  currentKey,
  items,
  applyMutationResult,
  refresh,
}: MoveTargetListProps) {
  const { pop } = useNavigation();
  const targets = items.filter((item) => item.key !== currentKey);
  const [selectedTargetKey, setSelectedTargetKey] = useState<string | null>(
    null,
  );
  const [movePreviewCache, setMovePreviewCache] = useState<
    Record<string, string>
  >({});
  const [lastShownMarkdown, setLastShownMarkdown] = useState<string>("");
  const preloadStartedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (targets.length > 0 && selectedTargetKey === null) {
      setSelectedTargetKey(targets[0].key);
    }
  }, [targets, selectedTargetKey]);

  useEffect(() => {
    const toPreload = targets.slice(0, 5).map((item) => item.key);
    toPreload.forEach((key) => {
      if (preloadStartedRef.current.has(key)) return;
      preloadStartedRef.current.add(key);
      getPreviewMarkdownForMove(nowFilePath, key).then((md) => {
        setMovePreviewCache((prev) => ({ ...prev, [key]: md }));
      });
    });
  }, [targets, nowFilePath]);

  const cachedMarkdownForSelected = selectedTargetKey
    ? movePreviewCache[selectedTargetKey]
    : undefined;
  useEffect(() => {
    if (!selectedTargetKey) return;
    if (cachedMarkdownForSelected !== undefined) {
      setLastShownMarkdown(cachedMarkdownForSelected);
      return;
    }
    let cancelled = false;
    getPreviewMarkdownForMove(nowFilePath, selectedTargetKey).then((md) => {
      if (!cancelled) {
        setMovePreviewCache((prev) => ({ ...prev, [selectedTargetKey]: md }));
        setLastShownMarkdown(md);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [nowFilePath, selectedTargetKey, cachedMarkdownForSelected]);

  return (
    <List
      navigationTitle="Move to…"
      searchBarPlaceholder="Select new parent"
      isShowingDetail
      selectedItemId={selectedTargetKey ?? targets[0]?.key ?? undefined}
      onSelectionChange={(id) => setSelectedTargetKey(id ?? null)}
    >
      {targets.map((item) => {
        const markdown =
          movePreviewCache[item.key] ??
          (selectedTargetKey === item.key ? lastShownMarkdown : null);
        return (
          <List.Item
            key={item.key}
            id={item.key}
            title={item.display.trim()}
            detail={
              <List.Item.Detail
                markdown={
                  markdown ??
                  "Select a target to preview the tree after the move."
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Move Here"
                  icon={Icon.ArrowRight}
                  onAction={async () => {
                    try {
                      const result = await runMove(nowFilePath, item.key);
                      if (result) await applyMutationResult(result);
                      else await refresh();
                      await showToast(Toast.Style.Success, "Moved");
                      pop();
                    } catch (e) {
                      await showToast(Toast.Style.Failure, "Failed", String(e));
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export const MoveTargetList = memo(MoveTargetListInner);
