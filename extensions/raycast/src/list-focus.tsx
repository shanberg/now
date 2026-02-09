import {
  environment,
  getPreferenceValues,
  type LaunchProps,
} from "@raycast/api";
import { useMemo, useState } from "react";

import { useFocusData } from "./lib/useFocusData";
import { useSwitchTargetPreviews } from "./lib/useSwitchTargetPreviews";
import { useNowPathFromStorage } from "./lib/useNowPath";
import {
  DEFAULT_SELECTED_ACTION_ID,
  getDefaultPath,
} from "./lib/listFocusHelpers";
import {
  ListFocusEmptyView,
  ListFocusLoadingView,
} from "./lib/listFocusList";
import {
  ListFocusContent,
  ListFocusProvider,
  type ListFocusContextValue,
} from "./lib/listFocusContext";
import { useListFocusEmptyState } from "./lib/useListFocusEmptyState";
import { useListFocusPathSwitch } from "./lib/useListFocusPathSwitch";
import { useListFocusWatcherSync } from "./lib/useListFocusWatcherSync";
import type {
  ListFocusLaunchContext,
  ListFocusPreferences,
} from "./lib/listFocusTypes";

export default function Command(
  props: LaunchProps<{ launchContext?: ListFocusLaunchContext }>,
) {
  const prefs = getPreferenceValues<ListFocusPreferences>();
  const defaultPath = getDefaultPath(prefs);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const initialPinnedPath = props.launchContext?.path ?? null;

  const {
    nowFilePath,
    currentApp,
    appPathForCurrent,
    pathReady,
    appPathsJson,
    refreshPathFromStorage,
    setUseGlobal,
    setLastResolvedPath,
    addAppPathMapping,
  } = useNowPathFromStorage({
    defaultPath,
    appSpecificNowFiles: prefs.appSpecificNowFiles,
  });

  const {
    focus,
    items,
    error,
    errorMessage,
    isLoading,
    refresh,
    applyMutationResult,
    setPinnedPath,
    effectivePath,
  } = useFocusData(pathReady ? nowFilePath : null, initialPinnedPath);

  const itemsForMove = items ?? [];

  const currentKey = focus?.key != null ? String(focus.key) : "";
  const { showEmpty, fileMissing, cliMissing } = useListFocusEmptyState({
    items,
    error,
    isLoading,
    effectivePath,
  });

  const {
    pathSwitchContext,
    nowInputLabel,
    pathDescriptorsForList,
    pathSwitchCallbacks,
  } = useListFocusPathSwitch({
    activePath: effectivePath,
    defaultPath,
    appPathForCurrent,
    currentApp,
    setUseGlobal,
    setLastResolvedPath,
    refreshPathFromStorage,
    setPinnedPath,
    addAppPathMapping,
    applyMutationResult,
    refresh,
    setSelectedId,
  });

  /** Path used for all mutations and forms; pinned so it does not flip when frontmost app changes. */
  const pathForMutations = effectivePath ?? nowFilePath ?? "";

  const switchTargetPreviews = useSwitchTargetPreviews(
    pathReady,
    pathSwitchContext,
  );

  useListFocusWatcherSync({
    pathReady,
    defaultPath,
    appPathsJson,
    appSpecificNowFiles: prefs.appSpecificNowFiles,
    supportPath: environment.supportPath,
    assetsPath: environment.assetsPath,
    updateOneThing: prefs.updateOneThing,
    focusText: focus?.focus,
  });

  const listContextValue: ListFocusContextValue = useMemo(
    () => ({
      pathForMutations,
      focus,
      items,
      itemsForMove,
      currentKey,
      refresh,
      applyMutationResult,
      pathSwitchContext,
      pathSwitchCallbacks,
      pathDescriptorsForList,
      nowInputLabel,
      selectedId,
      setSelectedId,
      defaultSelectedActionId: DEFAULT_SELECTED_ACTION_ID,
      defaultPath,
      appPathForCurrent,
      currentApp,
      switchTargetPreviews,
      isLoading,
      searchText,
      setSearchText,
    }),
    [
      pathForMutations,
      focus,
      items,
      itemsForMove,
      currentKey,
      refresh,
      applyMutationResult,
      pathSwitchContext,
      pathSwitchCallbacks,
      pathDescriptorsForList,
      nowInputLabel,
      selectedId,
      setSelectedId,
      defaultPath,
      appPathForCurrent,
      currentApp,
      switchTargetPreviews,
      isLoading,
    ],
  );

  if (!pathReady) {
    return <ListFocusLoadingView />;
  }

  if (showEmpty) {
    return (
      <ListFocusEmptyView
        isLoading={isLoading}
        fileMissing={fileMissing}
        cliMissing={cliMissing === true}
        error={!!error}
        errorMessage={errorMessage}
        nowInputLabel={nowInputLabel}
        pathSwitchContext={pathSwitchContext}
        pathSwitchCallbacks={pathSwitchCallbacks}
        pathForMutations={pathForMutations}
        refresh={refresh}
        applyMutationResult={applyMutationResult}
      />
    );
  }

  return (
    <ListFocusProvider value={listContextValue}>
      <ListFocusContent />
    </ListFocusProvider>
  );
}