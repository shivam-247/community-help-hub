"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "./api";
export function usePagedResource(path, { auth = true, pageSize = 20 } = {}) {
  const [page, setPage] = useState(1),
    [items, setItems] = useState([]),
    [hasMore, setHasMore] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const reload = useCallback(() => setRetry((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api(
      `${path}${path.includes("?") ? "&" : "?"}page=${page}&page_size=${pageSize}`,
      { auth, pagination: true, signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setItems(data.items);
          setHasMore(data.has_more);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, auth, page, pageSize, retry]);
  return { page, setPage, items, setItems, hasMore, loading, error, reload };
}
