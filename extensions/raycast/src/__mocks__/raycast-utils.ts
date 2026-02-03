/**
 * Stub for @raycast/utils in tests. Real implementation is replaced by vi.mock in test files.
 */
export function useLocalStorage<T>(_key: string, _defaultValue: T): { value: T; setValue: (v: T) => Promise<void>; isLoading: boolean } {
  return {
    value: _defaultValue,
    setValue: async () => { },
    isLoading: false,
  };
}

export function useCachedPromise<T, U>(
  _fn: (arg: U) => Promise<T>,
  _deps: unknown[],
  _opts?: { execute?: boolean },
): { data: T | undefined; error: Error | undefined; isLoading: boolean; revalidate: () => void; mutate: (p: Promise<T>, opts?: unknown) => Promise<unknown> } {
  return {
    data: undefined,
    error: undefined,
    isLoading: false,
    revalidate: () => { },
    mutate: async () => { },
  };
}
