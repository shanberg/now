/**
 * List-focus React Context: type, provider, and consumer hook only.
 * Separate file so hooks can import useListFocusContext without circular deps.
 * Uses createElement to avoid JSX (this file is .ts).
 */
import { createContext, createElement, useContext } from "react";
import type { PathActionDescriptor, PathSwitchContext } from "./pathContext";
import type { PathSwitchCallbacks } from "./pathSwitchActions";
import type { JsonFocus, JsonItem } from "./now";
import type { MutationResult } from "./now";
import type { FocusDataResult } from "./focusDataResult";

export type ListFocusContextValue = {
  pathForMutations: string;
  focus: JsonFocus | null;
  items: JsonItem[] | null;
  itemsForMove: JsonItem[];
  currentKey: string;
  refresh: () => void | Promise<void>;
  applyMutationResult: (result: MutationResult) => Promise<void>;
  pathSwitchContext: PathSwitchContext;
  pathSwitchCallbacks: PathSwitchCallbacks;
  pathDescriptorsForList: PathActionDescriptor[];
  nowInputLabel: string;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  defaultSelectedActionId: string;
  defaultPath: string;
  appPathForCurrent: string | null;
  currentApp: { name: string; bundleId?: string } | null;
  switchTargetPreviews: Record<string, FocusDataResult>;
  isLoading: boolean;
  searchText: string;
  setSearchText: React.Dispatch<React.SetStateAction<string>>;
};

const ListFocusContext = createContext<ListFocusContextValue | null>(null);

export function ListFocusProvider({
  value,
  children,
}: {
  value: ListFocusContextValue;
  children: React.ReactNode;
}) {
  return createElement(ListFocusContext.Provider, { value }, children);
}

export function useListFocusContext(): ListFocusContextValue {
  const ctx = useContext(ListFocusContext);
  if (ctx == null) {
    throw new Error("useListFocusContext must be used inside ListFocusProvider");
  }
  return ctx;
}
