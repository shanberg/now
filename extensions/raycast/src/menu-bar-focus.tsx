import { environment, getPreferenceValues } from "@raycast/api";

import { DATA_STR } from "now-format";
import { focusFileExists } from "./lib/now";
import { getDefaultPath } from "./lib/listFocusHelpers";
import {
  getMenubarTitle,
  getMenubarBreadcrumbDisplay,
  hasFocusTooltip,
} from "./lib/menuBarHelpers";
import { MenuBarEmptyState } from "./lib/menuBarEmptyState";
import { MenuBarFocusView } from "./lib/menuBarFocusView";
import { MenuBarLoadingView } from "./lib/menuBarLoadingView";
import type { MenuBarPreferences } from "./lib/menuBarTypes";
import { useCliMissing } from "./lib/useCliMissing";
import { useFocusData } from "./lib/useFocusData";
import { useMenubarPathSwitchCallbacks } from "./lib/useMenubarPathSwitchCallbacks";
import { useMenubarPinState } from "./lib/useMenubarPinState";
import { useMenubarWatcherSync } from "./lib/useMenubarWatcherSync";
import { useNowPathFromStorage } from "./lib/useNowPath";
import { usePathSwitchContext } from "./lib/usePathSwitchContext";

export default function Command() {
  const prefs = getPreferenceValues<MenuBarPreferences>();
  const defaultPath = getDefaultPath(prefs);

  const {
    nowFilePath,
    setNowFilePath,
    sourceLabel,
    setSourceLabel,
    currentApp,
    appPathForCurrent,
    pathReady,
    appPathsJson,
    refreshPathFromStorage,
    refreshPathFromStorageWithApp,
    setUseGlobal,
    setLastResolvedPath,
    addAppPathMapping,
  } = useNowPathFromStorage({
    defaultPath,
    appSpecificNowFiles: prefs.appSpecificNowFiles,
  });

  const {
    pinnedPath,
    effectiveNowPath,
    setPinnedPathStorage,
    clearMenubarPin,
  } = useMenubarPinState(nowFilePath);

  // When menubar is opened (click or background), assume display is correct: read only from cache; never fetch.
  const { focus, errorMessage, isLoading, refresh, applyMutationResult } =
    useFocusData(pathReady ? effectiveNowPath : null, null, {
      cacheOnly: true,
    });

  const { pathSwitchContext, nowInputLabel } = usePathSwitchContext({
    activePath: effectiveNowPath,
    defaultPath,
    appPathForCurrent,
    currentApp,
  });

  const pathSwitchCallbacks = useMenubarPathSwitchCallbacks({
    setUseGlobal,
    refreshPathFromStorage,
    setLastResolvedPath,
    addAppPathMapping,
    defaultPath,
    appPathForCurrent,
    currentApp,
    clearMenubarPin,
    setNowFilePath,
    setSourceLabel,
    refresh,
  });

  const cliMissing = useCliMissing(focus === null && !isLoading);

  const isUsingAppFile = nowFilePath !== defaultPath;

  useMenubarWatcherSync({
    pathReady,
    defaultPath,
    appPathsJson,
    appSpecificNowFiles: prefs.appSpecificNowFiles,
    supportPath: environment.supportPath,
    assetsPath: environment.assetsPath,
    updateOneThing: prefs.updateOneThing,
    focusText: focus?.focus,
    refreshPathFromStorage,
    refreshPathFromStorageWithApp,
    refresh,
  });

  if (!pathReady || isLoading) {
    return <MenuBarLoadingView />;
  }

  if (!focus) {
    const fileMissing = !focusFileExists(effectiveNowPath);
    return (
      <MenuBarEmptyState
        effectiveNowPath={effectiveNowPath}
        nowInputLabel={nowInputLabel}
        pathSwitchContext={pathSwitchContext}
        pathSwitchCallbacks={pathSwitchCallbacks}
        pinnedPath={pinnedPath}
        setPinnedPathStorage={setPinnedPathStorage}
        clearMenubarPin={clearMenubarPin}
        fileMissing={fileMissing}
        cliMissing={cliMissing === true}
        errorMessage={errorMessage}
        refresh={refresh}
      />
    );
  }

  const rawTitle = `${DATA_STR.focus} ${focus.focus || "—"}`;
  const title = getMenubarTitle(rawTitle, prefs.menubarTruncateLength);
  const titleWithPin = pinnedPath ? `${title} 📌` : title;
  const displayBreadcrumb = getMenubarBreadcrumbDisplay(
    focus.breadcrumb,
    prefs.breadcrumbMaxLength,
  );
  return (
    <MenuBarFocusView
      titleWithPin={titleWithPin}
      tooltip={hasFocusTooltip(
        displayBreadcrumb,
        title,
        isUsingAppFile,
        sourceLabel,
      )}
      displayBreadcrumb={displayBreadcrumb}
      focus={focus}
      effectiveNowPath={effectiveNowPath}
      nowInputLabel={nowInputLabel}
      pinnedPath={pinnedPath}
      setPinnedPathStorage={setPinnedPathStorage}
      clearMenubarPin={clearMenubarPin}
      pathSwitchContext={pathSwitchContext}
      pathSwitchCallbacks={pathSwitchCallbacks}
      applyMutationResult={applyMutationResult}
      refresh={refresh}
    />
  );
}
