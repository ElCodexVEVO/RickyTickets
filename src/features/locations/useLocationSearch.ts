import { useEffect, useState } from "react";
import { searchLocations, type LocationResult } from "./search";
export function useLocationSearch(query: string, enabled: boolean) {
  const [state, setState] = useState<{
    results: LocationResult[];
    loading: boolean;
    error: string;
  }>({ results: [], loading: false, error: "" });
  useEffect(() => {
    if (!enabled || query.trim().length < 3) {
      setState({ results: [], loading: false, error: "" });
      return;
    }
    const abort = new AbortController();
    setState({ results: [], loading: true, error: "" });
    const timer = window.setTimeout(() => {
      void searchLocations(query, abort.signal)
        .then((results) => {
          if (!abort.signal.aborted)
            setState({ results, loading: false, error: "" });
        })
        .catch((error) => {
          if (!abort.signal.aborted)
            setState({
              results: [],
              loading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "No se pudo buscar esta ubicación.",
            });
        });
    }, 800);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [query, enabled]);
  return state;
}
