/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Focus file path - Path to your .now.md focus file. Use ~ for home (e.g. ~/.now/focus.now.md). */
  "focusFilePath": string,
  /** Update One Thing - When enabled, open the One Thing menu bar app with the current focus (one-thing:?text=…). Requires the One Thing extension installed. */
  "updateOneThing": boolean,
  /** App-specific Now files - Optional JSON mapping from app bundle ID or name to Now file path. When set, the menubar (and list when opened) uses the path for the frontmost app. Example: {"com.apple.Terminal": "~/.now/term.now.md"}. */
  "appSpecificNowFiles"?: string,
  /** Menubar truncate length - Truncate the focus text in the menu bar to this many characters (0 = no truncation). */
  "menubarTruncateLength"?: string,
  /** Breadcrumb max length - Max characters for breadcrumb; truncation is from the center. 0 = no limit. */
  "breadcrumbMaxLength": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `menu-bar-focus` command */
  export type MenuBarFocus = ExtensionPreferences & {}
  /** Preferences accessible in the `list-focus` command */
  export type ListFocus = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `menu-bar-focus` command */
  export type MenuBarFocus = {}
  /** Arguments passed to the `list-focus` command */
  export type ListFocus = {}
}

