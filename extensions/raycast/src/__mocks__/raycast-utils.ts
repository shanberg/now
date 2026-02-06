/**
 * Stub for @raycast/utils in tests. Real implementation is replaced by vi.mock in test files.
 */
export function useLocalStorage<T>(
  _key: string,
  _defaultValue: T,
): { value: T; setValue: (v: T) => Promise<void>; isLoading: boolean } {
  return {
    value: _defaultValue,
    setValue: async () => { },
    isLoading: false,
  };
}

export function useCachedPromise<T, U>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- test stub signature
  fn: (arg: U) => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- test stub signature
  deps: unknown[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- test stub signature
  opts?: { execute?: boolean },
): {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  revalidate: () => void;
  mutate: (p: Promise<T>, opts?: unknown) => Promise<unknown>;
} {
  return {
    data: undefined,
    error: undefined,
    isLoading: false,
    revalidate: () => { },
    mutate: async () => { },
  };
}
