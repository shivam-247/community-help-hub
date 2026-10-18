"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import { api } from "../../lib/api";
import { Button, Card, Badge } from "../../components/ui";
import { ErrorMessage } from "../../components/FormFeedback";
export default function NotificationsPage() {
  const [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false);
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  async function load() {
    setLoading(true);
    try {
      const data = await api(`/notifications?page=${page}&page_size=20`, {
        auth: true,
        pagination: true,
      });
      setRows(data.items);
      setHasMore(data.has_more);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [page]);
  async function read(id) {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH", auth: true });
      setRows((items) =>
        items.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex justify-between gap-3 items-center">
        <h1 className="text-3xl font-semibold">Notifications</h1>
        <Button variant="outline" disabled={loading} onClick={load}>
          Refresh
        </Button>
      </header>
      <ErrorMessage message={error} />
      {error && <Button onClick={load}>Try again</Button>}
      {loading ? (
        <p role="status">Loading updates…</p>
      ) : error ? null : rows.length ? (
        <ul className="space-y-3">
          {rows.map((n) => (
            <li key={n.id}>
              <Card className="p-5 flex gap-4">
                <Bell className="size-5 text-brand shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-3">
                    <h2 className="font-semibold">{n.title}</h2>
                    {!n.read && <Badge>New</Badge>}
                  </div>
                  <p className="text-sm text-ink-muted mt-2">{n.body}</p>
                  <div className="flex gap-3 items-center mt-3">
                    <Button asChild variant="ghost" onClick={() => read(n.id)}>
                      <Link href={n.href}>View update</Link>
                    </Button>
                    {!n.read && (
                      <Button variant="ghost" onClick={() => read(n.id)}>
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="You’re all caught up"
          description="Responses and exchange updates will appear here."
        />
      )}
      {!loading && (
        <Pagination
          page={page}
          hasMore={hasMore}
          onPage={setPage}
          label="notifications"
        />
      )}
    </div>
  );
}
