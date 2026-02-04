/**
 * Path and filename similarity helpers for path matching.
 * Pure functions; no dependency on now CLI or storage.
 */
import { resolve } from "path";

/**
 * Path similarity for directory paths: number of leading path segments that match.
 * Higher = closer (same project root). Used when matching by filename and picking closest path.
 */
export function pathSimilarity(dirA: string, dirB: string): number {
  const a = resolve(dirA).split("/").filter(Boolean);
  const b = resolve(dirB).split("/").filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * Filename similarity: 0–1 score from Levenshtein distance (1 = identical).
 * Used when matching by path and picking closest filename.
 */
export function filenameSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
    }
  }
  return d[m][n];
}
