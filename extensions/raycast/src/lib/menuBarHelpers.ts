/**
 * Helpers for menu-bar-focus: title truncation and breadcrumb display.
 */
import { truncateBreadcrumb } from "now-format";

/** Parse menubar truncate length preference; 0 means no truncation. */
export function getMenubarTitle(
  rawTitle: string,
  menubarTruncateLengthPref: string | undefined,
): string {
  const truncateLen = Math.max(
    0,
    parseInt(menubarTruncateLengthPref ?? "0", 10) || 0,
  );
  if (truncateLen > 0 && rawTitle.length > truncateLen) {
    return rawTitle.slice(0, truncateLen) + "…";
  }
  return rawTitle;
}

/** Parse breadcrumb max length preference and truncate focus breadcrumb; 0 means no breadcrumb. */
export function getMenubarBreadcrumbDisplay(
  breadcrumb: string | undefined,
  breadcrumbMaxLengthPref: string | undefined,
): string {
  const raw = (breadcrumbMaxLengthPref ?? "64").trim() || "64";
  const parsed = parseInt(raw, 10);
  const max = Number.isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  if (max > 0 && breadcrumb) {
    return truncateBreadcrumb(breadcrumb, max);
  }
  return breadcrumb ?? "";
}

/** Tooltip when focus is shown: breadcrumb/title, optionally with (sourceLabel). */
export function hasFocusTooltip(
  displayBreadcrumb: string,
  title: string,
  isUsingAppFile: boolean,
  sourceLabel: string,
): string {
  return isUsingAppFile
    ? `${displayBreadcrumb || title} (${sourceLabel})`
    : displayBreadcrumb || title;
}
