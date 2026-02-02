import {
  getPreferenceValues,
  MenuBarExtra,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  createFocusFile,
  focusFileExists,
  getJsonFocus,
  isNowOnPath,
  NOW_INSTALL_URL,
  openTerminalWithNowStatus,
  resolveNowFilePath,
  runNowInstallInTerminal,
} from "./lib/now";

interface Preferences {
  focusFilePath: string;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const nowFilePath = resolveNowFilePath(prefs.focusFilePath);
  const [focus, setFocus] = useState<{
    focus: string;
    breadcrumb: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cliMissing, setCliMissing] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJsonFocus(nowFilePath).then((result) => {
      if (!cancelled) {
        setFocus(
          result.data
            ? { focus: result.data.focus, breadcrumb: result.data.breadcrumb }
            : null,
        );
        setErrorMessage(result.error ?? null);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [nowFilePath]);

  useEffect(() => {
    if (focus !== null) {
      setCliMissing(null);
      return;
    }
    if (!isLoading) {
      isNowOnPath().then((onPath) => setCliMissing(!onPath));
    }
  }, [focus, isLoading]);

  if (isLoading) {
    return (
      <MenuBarExtra isLoading tooltip="Now focus">
        <MenuBarExtra.Item title="Loading…" />
      </MenuBarExtra>
    );
  }

  if (!focus) {
    const fileMissing = !focusFileExists(nowFilePath);
    return (
      <MenuBarExtra
        tooltip={
          fileMissing
            ? "No focus file at path"
            : cliMissing
              ? "now CLI not installed"
              : errorMessage ?? "Could not read focus file"
        }
      >
        <MenuBarExtra.Item title="No focus" />
        {fileMissing ? (
          <MenuBarExtra.Item
            title="Create Focus File"
            onAction={async () => {
              try {
                await createFocusFile(nowFilePath);
                // Brief delay so the file is flushed before the CLI reads it
                await new Promise((r) => setTimeout(r, 100));
                const result = await getJsonFocus(nowFilePath);
                if (result.data) {
                  setFocus({
                    focus: result.data.focus,
                    breadcrumb: result.data.breadcrumb,
                  });
                }
              } catch {
                // Keep empty state
              }
            }}
          />
        ) : null}
        {cliMissing === true ? (
          <>
            <MenuBarExtra.Item
              title="Install Now CLI in Terminal…"
              onAction={async () => {
                try {
                  await runNowInstallInTerminal();
                } catch {
                  await open(NOW_INSTALL_URL);
                }
              }}
            />
            <MenuBarExtra.Item
              title="Open Install Instructions…"
              onAction={() => open(NOW_INSTALL_URL)}
            />
          </>
        ) : !fileMissing ? (
          <MenuBarExtra.Item
            title="Run 'now status' in Terminal…"
            onAction={async () => {
              try {
                await openTerminalWithNowStatus(nowFilePath);
              } catch {
                // Keep empty state
              }
            }}
          />
        ) : null}
        <MenuBarExtra.Item
          title="Open Extension Preferences…"
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra>
    );
  }

  const title = focus.focus || "—";
  return (
    <MenuBarExtra title={title} tooltip={focus.breadcrumb || title}>
      <MenuBarExtra.Item title={focus.focus || "—"} />
      {focus.breadcrumb ? <MenuBarExtra.Item title={focus.breadcrumb} /> : null}
      <MenuBarExtra.Item
        title="Open Extension Preferences…"
        onAction={openExtensionPreferences}
      />
    </MenuBarExtra>
  );
}
