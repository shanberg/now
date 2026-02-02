/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Focus file path - Path to your .now.md focus file. Use ~ for home (e.g. ~/.now/focus.now.md). */
  "focusFilePath": string
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

