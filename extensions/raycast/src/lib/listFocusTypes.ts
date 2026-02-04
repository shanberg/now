/**
 * Types for list-focus command: preferences, launch context.
 */

/** List no longer opens the menubar after mutations; that caused extension reload. Menubar reads from focus cache when opened. */
export interface ListFocusPreferences {
  focusFilePath: string;
  updateOneThing?: boolean;
  appSpecificNowFiles?: string;
  breadcrumbMaxLength?: string;
}

export type ListFocusLaunchContext = { path?: string };
