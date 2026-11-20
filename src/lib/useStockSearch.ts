import { useEffect, useState } from "react";
import axiosInstance from "./axiosInstance";
import type { SearchResultItem } from "../types/api";

type SearchResponse = {
  query: string;
  items: SearchResultItem[];
  failed: boolean;
};

export function useStockSearch(input: string) {
  const query = input.trim();
  const canSearch = query.length >= 2 || /^[a-z]$/i.test(query);
  const [response, setResponse] = useState<SearchResponse | null>(null);

  useEffect(() => {
    setResponse(null);
    if (!canSearch) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.get<{ items: SearchResultItem[] }>("/search", {
          params: { q: query },
          signal: controller.signal,
          suppressErrorToast: true,
        });
        if (!controller.signal.aborted) {
          setResponse({ query, items: data.items ?? [], failed: false });
        }
      } catch {
        if (!controller.signal.aborted) {
          setResponse({ query, items: [], failed: true });
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, canSearch]);

  const current = response?.query === query ? response : null;
  return {
    canSearch,
    loading: canSearch && !current,
    failed: current?.failed ?? false,
    results: current?.items ?? [],
  };
}
