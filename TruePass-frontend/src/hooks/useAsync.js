import { useCallback, useEffect, useRef, useState } from 'react';

// Tiny data-loading hook: runs an async function on mount and whenever `deps` change.
// Returns { data, loading, error, reload }. Stale responses are ignored.
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const counter = useRef(0);

  const run = useCallback(async (silent = false) => {
    const id = ++counter.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (id === counter.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id === counter.current) setState({ data: null, loading: false, error });
    }
  }, []);

  useEffect(() => {
    run();
    return () => {
      counter.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: run };
}
