'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/utils';

/**
 * Loads GET `path` from the admin API. `setData` lets a page apply its own
 * create/update/delete results without refetching; `reload` refetches.
 */
export function useApiData<T>(path: string) {
  const { api } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<T>(path)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data, setData, error, loading, reload };
}
