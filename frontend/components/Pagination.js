"use client";
import { Button } from "./ui";
export default function Pagination({
  page,
  hasMore,
  onPage,
  loading = false,
  total,
  label = "results",
}) {
  if (page === 1 && !hasMore) return null;
  return (
    <nav
      aria-label={`${label} pages`}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
    >
      <Button
        variant="outline"
        disabled={loading || page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous page
      </Button>
      <p role="status" className="text-sm text-ink-muted">
        Page {page}
        {typeof total === "number" ? ` · ${total} ${label}` : ""}
      </p>
      <Button
        variant="outline"
        disabled={loading || !hasMore}
        onClick={() => onPage(page + 1)}
      >
        Next page
      </Button>
    </nav>
  );
}
