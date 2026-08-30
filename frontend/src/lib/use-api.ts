import { useEffect, useState } from "react";

/**
 * Minimal async-data hook used by the client pages. It fetches from the Pragyan
 * backend API once (and on dependency changes) and surfaces loading/error/data.
 */
export function useApiData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    // State is only updated inside the async callbacks below (never
    // synchronously in the effect body) to avoid cascading renders. When the
    // fetched params change across renders, callers force a remount via a
    // `key` so a fresh instance starts from the loading state.
    fetcher()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading: !data && !error };
}
