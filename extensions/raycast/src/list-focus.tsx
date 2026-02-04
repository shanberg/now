import { environment, getPreferenceValues, type LaunchProps } from "@raycast/api";
import { useCallback, useState } from "react";

import { useFocusData } from "./lib/useFocusData";
import { useSwitchTargetPreviews } from "./lib/useSwitchTargetPreviews";
import { useNowPathFromStorage } from "./lib/useNowPath";
import { DEFAULT_SELECTED_ACTION_ID, getDefaultPath } from "./lib/listFocusHelpers";
import {
  ListFocusEmptyView,
  ListFocusListContent,
  ListFocusLoadingView,
} from "./lib/listFocusList";
import { useActionPanels } from "./lib/useActionPanels";
import { useListFocusActionPanelContext } from "./lib/useListFocusActionPanelContext";
import { useListFocusEmptyState } from "./lib/useListFocusEmptyState";
import { useListFocusSelection } from "./lib/useListFocusSelection";
import { useListFocusSections } from "./lib/useListFocusSections";
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

  const currentKey = focus?.key ?? "";
  const { showEmpty, fileMissing, cliMissing } = useListFocusEmptyState({
    items,
    error,
    isLoading,
    effectivePath,
  });

  const { pathSwitchContext, nowInputLabel, pathDescriptorsForList, pathSwitchCallbacks } =
    useListFocusPathSwitch({
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
    effectivePath: effectivePath ?? undefined,
  });

  /** All hooks below must run on every render (Rules of Hooks). Do not add early returns above them. */
  const { selectionIdArrays, detail, effectiveSelectedId } =
    useListFocusSelection({
      pathDescriptorsForList,
      items,
      focus,
      currentKey,
      selectedId,
      defaultSelectedActionId: DEFAULT_SELECTED_ACTION_ID,
      defaultPath,
      appPathForCurrent,
      currentApp,
      switchTargetPreviews,
    });

  /** Stable callback so List doesn't re-sync selection on every render (avoids render loop when arrowing). Only update state when the id actually changes so Raycast re-syncing the same selection doesn't trigger another render. */
  const handleSelectionChange = useCallback((id: string | null | undefined) => {
    const next = id ?? null;
    setSelectedId((prev) => (prev === next ? prev : next));
  }, []);

  const { contextSection, otherSection, runNav } = useListFocusSections({
    hasSwitchOptions: pathDescriptorsForList.length > 0,
    nowInputLabel,
    pathSwitchContext,
    pathSwitchCallbacks,
    pathForMutations,
    refresh,
    applyMutationResult,
  });

  const actionPanelContext = useListFocusActionPanelContext({
    pathForMutations,
    focus,
    currentKey,
    itemsForMove,
    applyMutationResult,
    refresh,
    runNav,
    setSelectedId,
    pathDescriptorsForList,
    pathSwitchCallbacks,
    otherSection,
    contextSection,
  });
  const allSelectionIds = selectionIdArrays.listIds;
  const actionPanelsBySelection = useActionPanels(
    allSelectionIds,
    actionPanelContext,
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
    <ListFocusListContent
      isLoading={isLoading}
      nowInputLabel={nowInputLabel}
      effectiveSelectedId={effectiveSelectedId}
      onSelectionChange={handleSelectionChange}
      detail={detail}
      actionPanelsBySelection={actionPanelsBySelection}
      pathDescriptorsForList={pathDescriptorsForList}
      items={items}
      currentKey={currentKey}
      focus={focus}
    />
  );
}
