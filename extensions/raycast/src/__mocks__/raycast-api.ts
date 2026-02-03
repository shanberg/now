/**
 * Stub for @raycast/api in tests. Real implementation is replaced by vi.mock in test files.
 */
export function getFrontmostApplication(): Promise<{ name: string; bundleId?: string } | null> {
  return Promise.resolve(null);
}

export function getCurrentDocumentPath(): Promise<string | null> {
  return Promise.resolve(null);
}
