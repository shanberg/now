import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  createFocusFile,
  focusFileExists,
  getJsonFocus,
  getJsonItems,
  isNowOnPath,
  JsonFocus,
  JsonItem,
  NOW_INSTALL_URL,
  openTerminalWithNowStatus,
  openTerminalWithNowTui,
  resolveNowFilePath,
  runAdd,
  runComplete,
  runDown,
  runDiveIn,
  runEdit,
  runLater,
  runMove,
  runNext,
  runNowInstallInTerminal,
  runPrevious,
  runSwitch,
  runUp,
  runWrap,
} from "./lib/now";
import { DATA_STR } from "now-format";

interface Preferences {
  focusFilePath: string;
}

const PLACEHOLDER = "______";

/** Leading indent from a display string (uses same convention as now-format getItemsList). */
function getIndent(display: string): string {
  const raw = display.replace(/\s+@\s*$/, "").trimEnd();
  const m = raw.match(/^(\s*)/);
  return m ? m[1] : "";
}

/**
 * Index of the item that would be next in focus after completing the current item.
 * Matches selectNewCurrentAfterRemoval: previous sibling's last leaf, else next sibling's first leaf, else parent.
 */
function getNextFocusIndex(
  items: JsonItem[],
  currentIndex: number,
): number | null {
  if (currentIndex < 0 || currentIndex >= items.length) return null;
  const currentDepth = getIndent(items[currentIndex].display).length;
  // Previous sibling's last leaf: walk back, first with same depth
  for (let j = currentIndex - 1; j >= 0; j--) {
    const d = getIndent(items[j].display).length;
    if (d === currentDepth) return j;
    if (d < currentDepth) break;
  }
  // Next sibling's first leaf: walk forward, first with same depth
  for (let j = currentIndex + 1; j < items.length; j++) {
    const d = getIndent(items[j].display).length;
    if (d === currentDepth) return j;
    if (d < currentDepth) break;
  }
  // Parent: walk back, first with depth one level up
  const parentDepth = currentDepth - DATA_STR.indent.length;
  if (parentDepth < 0) return null;
  for (let j = currentIndex - 1; j >= 0; j--) {
    if (getIndent(items[j].display).length === parentDepth) return j;
  }
  return null;
}

/** Builds markdown showing all items with indentation, current focus and selected item (▶), and command-specific placeholders/indicators. */
function detailMarkdown(
  items: JsonItem[],
  currentKey: string,
  breadcrumb: string,
  selectedKey: string | null,
  selectedId: string | null,
): string {
  const currentIndex = items.findIndex((i) => i.key === currentKey);
  const currentIndent =
    currentIndex >= 0 ? getIndent(items[currentIndex].display) : "";
  const nextFocusIndex =
    selectedId === "action-complete" && currentIndex >= 0
      ? getNextFocusIndex(items, currentIndex)
      : null;

  let lines = items.map((item, index) => {
    const raw = item.display.replace(/\s+@\s*$/, "").trimEnd();
    const isCurrent = item.key === currentKey;
    const isSelected = selectedKey !== null && item.key === selectedKey;
    const isNextFocus = nextFocusIndex !== null && index === nextFocusIndex;
    let line = raw;
    if (isCurrent) {
      if (selectedId === "action-complete") {
        line = raw.replace(/^(\s*)(.*)$/, "$1$2 ✓");
      } else {
        line = raw.replace(/^(\s*)(.*)$/, "$1▶ $2");
      }
      if (selectedId === "action-edit") {
        line = line.replace(/^(\s*)(.*)$/, "$1$2 ✎");
      }
    } else if (isNextFocus && selectedId === "action-complete") {
      line = raw.replace(/^(\s*)(.*)$/, "$1▶ $2");
    } else if (isSelected) {
      line = raw.replace(/^(\s*)(.*)$/, "$1▶ $2");
    }
    return line;
  });

  if (selectedId === "action-add" && currentIndex >= 0) {
    const placeholder = `${currentIndent}${DATA_STR.indent}${PLACEHOLDER} ▶`;
    lines = [
      ...lines.slice(0, currentIndex + 1),
      placeholder,
      ...lines.slice(currentIndex + 1),
    ];
  }

  if (selectedId === "action-later" && currentIndex >= 0) {
    const placeholder = `${currentIndent}${PLACEHOLDER} ▶`;
    lines = [
      ...lines.slice(0, currentIndex + 1),
      placeholder,
      ...lines.slice(currentIndex + 1),
    ];
  }

  if (selectedId === "action-wrap" && currentIndex >= 0) {
    const wrapParent = `${currentIndent}${PLACEHOLDER}`;
    const currentLine = lines[currentIndex];
    const indentedCurrent = currentLine.replace(
      /^(\s*)(.*)$/,
      `${DATA_STR.indent}$1$2`,
    );
    lines = [
      ...lines.slice(0, currentIndex),
      wrapParent,
      indentedCurrent,
      ...lines.slice(currentIndex + 1),
    ];
  }

  const header = breadcrumb ? `${breadcrumb}\n\n` : "";
  return header + "```\n" + lines.join("\n") + "\n```";
}

function AddNestedForm({
  nowFilePath,
  refresh,
}: {
  nowFilePath: string;
  refresh: () => Promise<void>;
}) {
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
                await runAdd(nowFilePath, items);
                await showToast(Toast.Style.Success, "Added");
                await refresh();
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

function LaterForm({
  nowFilePath,
  refresh,
}: {
  nowFilePath: string;
  refresh: () => Promise<void>;
}) {
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
                await runLater(nowFilePath, items);
                await showToast(Toast.Style.Success, "Added");
                await refresh();
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

function EditForm({
  nowFilePath,
  currentName,
  refresh,
}: {
  nowFilePath: string;
  currentName: string;
  refresh: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Edit"
            icon={Icon.Pencil}
            onSubmit={async (values: { newName: string }) => {
              const newName = (values.newName ?? "").trim();
              if (!newName) {
                await showToast(Toast.Style.Failure, "Enter a name");
                return;
              }
              try {
                await runEdit(nowFilePath, newName);
                await showToast(Toast.Style.Success, "Updated");
                await refresh();
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

function WrapForm({
  nowFilePath,
  refresh,
}: {
  nowFilePath: string;
  refresh: () => Promise<void>;
}) {
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
                await runWrap(nowFilePath, parentName);
                await showToast(Toast.Style.Success, "Wrapped");
                await refresh();
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

function MoveTargetList({
  nowFilePath,
  currentKey,
  items,
  refresh,
}: {
  nowFilePath: string;
  currentKey: string;
  items: JsonItem[];
  refresh: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const targets = items.filter((item) => item.key !== currentKey);
  return (
    <List navigationTitle="Move to…" searchBarPlaceholder="Select new parent">
      {targets.map((item) => (
        <List.Item
          key={item.key}
          id={item.key}
          title={item.display.trim()}
          actions={
            <ActionPanel>
              <Action
                title="Move Here"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  try {
                    await runMove(nowFilePath, item.key);
                    await showToast(Toast.Style.Success, "Moved");
                    await refresh();
                    pop();
                  } catch (e) {
                    await showToast(Toast.Style.Failure, "Failed", String(e));
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function useFocusData(nowFilePath: string) {
  const [focus, setFocus] = useState<JsonFocus | null>(null);
  const [items, setItems] = useState<JsonItem[] | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    setErrorMessage(null);
    const [focusResult, itemsResult] = await Promise.all([
      getJsonFocus(nowFilePath),
      getJsonItems(nowFilePath),
    ]);
    setFocus(focusResult.data ?? null);
    setItems(itemsResult.data ?? null);
    if (focusResult.data === null && itemsResult.data === null) {
      setError(true);
      setErrorMessage(
        focusResult.error ?? itemsResult.error ?? null,
      );
    }
    setIsLoading(false);
  }, [nowFilePath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { focus, items, error, errorMessage, isLoading, refresh };
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const nowFilePath = resolveNowFilePath(prefs.focusFilePath);
  const { focus, items, error, errorMessage, isLoading, refresh } =
    useFocusData(nowFilePath);
  const [cliMissing, setCliMissing] = useState<boolean | null>(null);

  const currentKey = focus?.key ?? "";
  const hasItems = Array.isArray(items) && items.length > 0;
  const showEmpty = !isLoading && (error || !hasItems);
  const fileMissing = error && !focusFileExists(nowFilePath);

  useEffect(() => {
    if (!showEmpty || !error || fileMissing) {
      setCliMissing(null);
      return;
    }
    isNowOnPath().then((onPath) => setCliMissing(!onPath));
  }, [showEmpty, error, fileMissing]);

  if (showEmpty) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title={
            fileMissing
              ? "No focus file at path"
              : error
                ? cliMissing
                  ? "now CLI not installed"
                  : "Could not read focus file"
                : "No focusable items"
          }
          description={
            fileMissing
              ? "Create a new focus file to get started."
              : cliMissing
                ? "Install the now CLI to use this extension."
                : error
                  ? errorMessage ?? "Check path and format, or run 'now status' in Terminal to see the CLI error."
                  : "Set your focus file path in extension preferences and ensure the now CLI is installed."
          }
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              {fileMissing ? (
                <Action
                  title="Init"
                  icon={Icon.Plus}
                  onAction={async () => {
                    try {
                      await createFocusFile(nowFilePath);
                      await showToast(
                        Toast.Style.Success,
                        "Focus file created",
                      );
                      // Defer refresh so the view can update (avoids stale UI)
                      await new Promise((r) => setTimeout(r, 100));
                      await refresh();
                    } catch (e) {
                      await showToast(
                        Toast.Style.Failure,
                        "Failed to create file",
                        String(e),
                      );
                    }
                  }}
                />
              ) : null}
              {cliMissing === true ? (
                <>
                  <Action
                    title="Install Now CLI in Terminal"
                    icon={Icon.Download}
                    onAction={async () => {
                      try {
                        await runNowInstallInTerminal();
                        await showToast(
                          Toast.Style.Success,
                          "Terminal opened — complete install there, then Refresh",
                        );
                      } catch (e) {
                        await showToast(
                          Toast.Style.Failure,
                          "Could not open Terminal",
                          String(e),
                        );
                      }
                    }}
                  />
                  <Action
                    title="Open Install Instructions in Browser"
                    icon={Icon.Globe}
                    onAction={() => open(NOW_INSTALL_URL)}
                  />
                </>
              ) : error && !fileMissing ? (
                <Action
                  title="Status"
                  icon={Icon.Terminal}
                  onAction={async () => {
                    try {
                      await openTerminalWithNowStatus(nowFilePath);
                      await showToast(
                        Toast.Style.Success,
                        "Terminal opened — check output, then Refresh",
                      );
                    } catch (e) {
                      await showToast(
                        Toast.Style.Failure,
                        "Could not open Terminal",
                        String(e),
                      );
                    }
                  }}
                />
              ) : null}
              <Action
                title="Tui"
                icon={Icon.Terminal}
                onAction={async () => {
                  try {
                    await openTerminalWithNowTui(nowFilePath);
                    await showToast(Toast.Style.Success, "Terminal opened");
                  } catch (e) {
                    await showToast(
                      Toast.Style.Failure,
                      "Could not open Terminal",
                      String(e),
                    );
                  }
                }}
              />
              <Action.Open
                title="Open in Editor"
                icon={Icon.Document}
                target={nowFilePath}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  await refresh();
                }}
              />
              <Action
                title="Open Extension Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const itemKeys = new Set((items ?? []).map((i) => i.key));
  const selectedKeyInTree =
    selectedId !== null && itemKeys.has(selectedId) ? selectedId : null;
  const markdown = detailMarkdown(
    items ?? [],
    currentKey,
    focus?.breadcrumb ?? "",
    selectedKeyInTree,
    selectedId,
  );
  const detail = <List.Item.Detail markdown={markdown} />;
  const siblingCount = focus?.siblingCount ?? 0;
  const isLeaf = focus?.isLeaf ?? true;
  const isRoot = focus?.isRoot ?? true;

  const otherSection = (
    <ActionPanel.Section title="Other">
      <Action
        title="Tui"
        icon={Icon.Terminal}
        onAction={async () => {
          try {
            await openTerminalWithNowTui(nowFilePath);
            await showToast(Toast.Style.Success, "Terminal opened");
          } catch (e) {
            await showToast(
              Toast.Style.Failure,
              "Could not open Terminal",
              String(e),
            );
          }
        }}
      />
      <Action.Open
        title="Open in Editor"
        icon={Icon.Document}
        target={nowFilePath}
      />
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
    </ActionPanel.Section>
  );

  const runNav = async (
    fn: () => Promise<void>,
    label: string,
  ) => {
    try {
      await fn();
      await showToast(Toast.Style.Success, label);
      await refresh();
    } catch (e) {
      await showToast(Toast.Style.Failure, label, String(e));
    }
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Focus List"
      searchBarPlaceholder="Search items"
      selectedItemId={
        currentKey && items?.some((i) => i.key === currentKey)
          ? currentKey
          : undefined
      }
      onSelectionChange={(id) => setSelectedId(id ?? null)}
    >
      <List.Section title="Actions">
        <List.Item
          id="action-add"
          title="Narrow focus"
          icon={Icon.Plus}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.Push
                title="Narrow focus"
                icon={Icon.Plus}
                target={
                  <AddNestedForm
                    nowFilePath={nowFilePath}
                    refresh={refresh}
                  />
                }
              />
              {otherSection}
            </ActionPanel>
          }
        />
        <List.Item
          id="action-complete"
          title="Finish this"
          icon={Icon.Checkmark}
          detail={detail}
          actions={
            <ActionPanel>
              <Action
                title="Finish this"
                icon={Icon.Checkmark}
                onAction={async () =>
                  runNav(() => runComplete(nowFilePath), "Completed")
                }
              />
              {otherSection}
            </ActionPanel>
          }
        />
        <List.Item
          id="action-later"
          title="Add followup"
          icon={Icon.Plus}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add followup"
                icon={Icon.Plus}
                target={
                  <LaterForm
                    nowFilePath={nowFilePath}
                    refresh={refresh}
                  />
                }
              />
              {otherSection}
            </ActionPanel>
          }
        />
        {focus ? (
          <List.Item
            id="action-edit"
            title="Edit"
            icon={Icon.Pencil}
            detail={detail}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  target={
                    <EditForm
                      nowFilePath={nowFilePath}
                      currentName={focus.focus}
                      refresh={refresh}
                    />
                  }
                />
                {otherSection}
              </ActionPanel>
            }
          />
        ) : null}
        <List.Item
          id="action-wrap"
          title="Wrap"
          icon={Icon.ArrowUp}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.Push
                title="Wrap"
                icon={Icon.ArrowUp}
                target={
                  <WrapForm
                    nowFilePath={nowFilePath}
                    refresh={refresh}
                  />
                }
              />
              {otherSection}
            </ActionPanel>
          }
        />
        <List.Item
          id="action-move"
          title="Move"
          icon={Icon.ArrowRight}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.Push
                title="Move"
                icon={Icon.ArrowRight}
                target={
                  <MoveTargetList
                    nowFilePath={nowFilePath}
                    currentKey={currentKey}
                    items={items ?? []}
                    refresh={refresh}
                  />
                }
              />
              {otherSection}
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Navigation">
        {!isLeaf ? (
          <List.Item
            id="action-dive-in"
            title="Dive in"
            icon={Icon.ChevronDown}
            detail={detail}
            actions={
              <ActionPanel>
                <Action
                  title="Dive in"
                  icon={Icon.ChevronDown}
                  onAction={() =>
                    runNav(() => runDiveIn(nowFilePath), "Dived in")
                  }
                />
                {otherSection}
              </ActionPanel>
            }
          />
        ) : null}
        {siblingCount > 0 ? (
          <>
            <List.Item
              id="action-next"
              title="Next"
              icon={Icon.ChevronRight}
              detail={detail}
              actions={
                <ActionPanel>
                  <Action
                    title="Next"
                    icon={Icon.ChevronRight}
                    onAction={() =>
                      runNav(() => runNext(nowFilePath), "Next")
                    }
                  />
                  {otherSection}
                </ActionPanel>
              }
            />
            <List.Item
              id="action-previous"
              title="Previous"
              icon={Icon.ChevronLeft}
              detail={detail}
              actions={
                <ActionPanel>
                  <Action
                    title="Previous"
                    icon={Icon.ChevronLeft}
                    onAction={() =>
                      runNav(() => runPrevious(nowFilePath), "Previous")
                    }
                  />
                  {otherSection}
                </ActionPanel>
              }
            />
          </>
        ) : null}
        {!isLeaf ? (
          <List.Item
            id="action-down"
            title="Down"
            icon={Icon.ChevronDown}
            detail={detail}
            actions={
              <ActionPanel>
                <Action
                  title="Down"
                  icon={Icon.ChevronDown}
                  onAction={() =>
                    runNav(() => runDown(nowFilePath), "Down")
                  }
                />
                {otherSection}
              </ActionPanel>
            }
          />
        ) : null}
        {!isRoot ? (
          <List.Item
            id="action-up"
            title="Up"
            icon={Icon.ChevronUp}
            detail={detail}
            actions={
              <ActionPanel>
                <Action
                  title="Up"
                  icon={Icon.ChevronUp}
                  onAction={() =>
                    runNav(() => runUp(nowFilePath), "Up")
                  }
                />
                {otherSection}
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>
      <List.Section title="Setup">
        <List.Item
          id="action-init"
          title="Init"
          icon={Icon.Document}
          detail={detail}
          actions={
            <ActionPanel>
              <Action
                title="Init"
                icon={Icon.Document}
                onAction={async () => {
                  try {
                    await createFocusFile(nowFilePath);
                    await showToast(Toast.Style.Success, "Focus file ready");
                    await refresh();
                  } catch (e) {
                    await showToast(
                      Toast.Style.Failure,
                      "Init failed",
                      String(e),
                    );
                  }
                }}
              />
              {otherSection}
            </ActionPanel>
          }
        />
        <List.Item
          id="action-status"
          title="Status"
          icon={Icon.Terminal}
          detail={detail}
          actions={
            <ActionPanel>
              <Action
                title="Status"
                icon={Icon.Terminal}
                onAction={async () => {
                  try {
                    await openTerminalWithNowStatus(nowFilePath);
                    await showToast(Toast.Style.Success, "Terminal opened");
                  } catch (e) {
                    await showToast(
                      Toast.Style.Failure,
                      "Could not open Terminal",
                      String(e),
                    );
                  }
                }}
              />
              {otherSection}
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Switch">
        {items?.map((item) => {
          const isCurrent = item.key === currentKey;
          return (
            <List.Item
              key={item.key}
              id={item.key}
              title={item.display.trim()}
              icon={isCurrent ? Icon.Star : undefined}
              detail={detail}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Focus">
                    <Action
                      title="Switch"
                      icon={Icon.Star}
                      onAction={async () => {
                        try {
                          await runSwitch(nowFilePath, item.key);
                          await showToast(Toast.Style.Success, "Focus updated");
                          await refresh();
                        } catch (e) {
                          await showToast(
                            Toast.Style.Failure,
                            "Failed to set focus",
                            String(e),
                          );
                        }
                      }}
                    />
                    {isCurrent ? (
                      <Action
                        title="Finish this"
                        icon={Icon.Checkmark}
                        onAction={async () => {
                          try {
                            await runComplete(nowFilePath);
                            await showToast(
                              Toast.Style.Success,
                              "Completed",
                            );
                            await refresh();
                          } catch (e) {
                            await showToast(
                              Toast.Style.Failure,
                              "Failed to complete",
                              String(e),
                            );
                          }
                        }}
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Actions">
                    <Action.Push
                      title="Narrow focus"
                      icon={Icon.Plus}
                      target={
                        <AddNestedForm
                          nowFilePath={nowFilePath}
                          refresh={refresh}
                        />
                      }
                    />
                    <Action.Push
                      title="Add followup"
                      icon={Icon.Plus}
                      target={
                        <LaterForm
                          nowFilePath={nowFilePath}
                          refresh={refresh}
                        />
                      }
                    />
                    {focus ? (
                      <Action.Push
                        title="Edit"
                        icon={Icon.Pencil}
                        target={
                          <EditForm
                            nowFilePath={nowFilePath}
                            currentName={focus.focus}
                            refresh={refresh}
                          />
                        }
                      />
                    ) : null}
                    <Action.Push
                      title="Wrap"
                      icon={Icon.ArrowUp}
                      target={
                        <WrapForm
                          nowFilePath={nowFilePath}
                          refresh={refresh}
                        />
                      }
                    />
                    <Action.Push
                      title="Move"
                      icon={Icon.ArrowRight}
                      target={
                        <MoveTargetList
                          nowFilePath={nowFilePath}
                          currentKey={currentKey}
                          items={items ?? []}
                          refresh={refresh}
                        />
                      }
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Navigation">
                    {!isLeaf ? (
                      <Action
                        title="Dive in"
                        icon={Icon.ChevronDown}
                        onAction={() =>
                          runNav(() => runDiveIn(nowFilePath), "Dived in")
                        }
                      />
                    ) : null}
                    {siblingCount > 0 ? (
                      <>
                        <Action
                          title="Next"
                          icon={Icon.ChevronRight}
                          onAction={() =>
                            runNav(() => runNext(nowFilePath), "Next")
                          }
                        />
                        <Action
                          title="Previous"
                          icon={Icon.ChevronLeft}
                          onAction={() =>
                            runNav(() => runPrevious(nowFilePath), "Previous")
                          }
                        />
                      </>
                    ) : null}
                    {!isLeaf ? (
                      <Action
                        title="Down"
                        icon={Icon.ChevronDown}
                        onAction={() =>
                          runNav(() => runDown(nowFilePath), "Down")
                        }
                      />
                    ) : null}
                    {!isRoot ? (
                      <Action
                        title="Up"
                        icon={Icon.ChevronUp}
                        onAction={() =>
                          runNav(() => runUp(nowFilePath), "Up")
                        }
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Title"
                      content={item.display.replace(/\s+@\s*$/, "").trim()}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Other">
                    <Action
                      title="Tui"
                      icon={Icon.Terminal}
                      onAction={async () => {
                        try {
                          await openTerminalWithNowTui(nowFilePath);
                          await showToast(
                            Toast.Style.Success,
                            "Terminal opened",
                          );
                        } catch (e) {
                          await showToast(
                            Toast.Style.Failure,
                            "Could not open Terminal",
                            String(e),
                          );
                        }
                      }}
                    />
                    <Action.Open
                      title="Open in Editor"
                      icon={Icon.Document}
                      target={nowFilePath}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={refresh}
                    />
                    <Action
                      title="Open Extension Preferences"
                      onAction={openExtensionPreferences}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
