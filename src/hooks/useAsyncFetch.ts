import { useEffect, useState } from "react";

export function useAsyncFetch<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchFunction();
        if (isMounted) {
          setData(result);
        }
      } catch (e) {
        if (isMounted) {
          setError(e as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return [data, loading, error] as const;
}
