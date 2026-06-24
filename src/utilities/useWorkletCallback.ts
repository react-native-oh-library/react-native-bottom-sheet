import { useCallback, type DependencyList } from 'react';

/**
 * Reanimated 4 compatibility shim for the removed `useWorkletCallback`.
 *
 * The callback passed to this hook must include `'worklet';` as its first
 * statement so the worklets Babel plugin can compile it for the UI thread.
 */
export function useWorkletCallback<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
  deps: DependencyList = []
) {
  return useCallback(fn, deps);
}
