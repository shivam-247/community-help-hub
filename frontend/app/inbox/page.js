"use client";
import { Text as UIMessage } from "../../lib/i18n";

import PageHeader from "../../components/PageHeader";
import { useEffect, useState } from "react";
import Pagination from "../../components/Pagination";
import RecoveryPanel from "../../components/RecoveryPanel";
import BadgeTier from "../../components/BadgeTier";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { InboxItemSkeleton } from "../../components/Skeleton";
import { useToast } from "../../components/ToastProvider";
import {
  MessageSquareIcon,
  PhoneIcon,
  CheckIcon,
  XIcon,
  StarIcon,
  AlertTriangleIcon,
} from "../../components/Icons";

export default function InboxPage() {
  const auth = useAuth();
  const notify = useToast();
  const [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false);
  const [tab, setTab] = useState("incoming");
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setError("");
      const data = await api(`/inbox/${tab}?page=${page}&page_size=20`, {
        auth: true,
        pagination: true,
      });
      if (tab === "incoming") setIncoming(data.items);
      else setSent(data.items);
      setHasMore(data.has_more);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const value = new URLSearchParams(location.search).get("tab");
    if (["incoming", "sent"].includes(value)) setTab(value);
  }, []);
  useEffect(() => {
    if (auth?.user) load();
  }, [auth?.user, tab, page]);

  if (auth?.loading) return <p role="status"><UIMessage>Loading your inbox…</UIMessage></p>;
  if (error && !loading)
    return <RecoveryPanel message={error} onRetry={load} />;

  if (!auth?.user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="bg-surface border border-line/90 rounded-xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-brand-soft text-brand flex items-center justify-center mx-auto text-xl mb-3"></div>
          <h2 className="font-bold text-ink text-lg mb-1"><UIMessage>
            Log in to view your inbox
          </UIMessage></h2>
          <p className="text-xs text-ink-muted mb-5"><UIMessage>
            Manage conversations and responses to community posts.
          </UIMessage></p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center py-2.5 px-5 rounded-xl text-xs font-semibold bg-brand-solid hover:bg-brand-solid text-on-brand shadow-xs transition-colors"
          ><UIMessage>
            Go to Login
          </UIMessage></Link>
        </div>
      </div>
    );
  }

  const act = async (requestId, action) => {
    setBusyId(requestId);
    try {
      await api(`/requests/${requestId}`, {
        method: "PATCH",
        auth: true,
        body: { action },
      });
      await load();
      notify(
        action === "accept"
          ? "Request accepted. You can now message your neighbor."
          : "Request rejected.",
      );
      window.dispatchEvent(new Event("chh-inbox-updated"));
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const pendingIncomingCount = incoming.filter(
    (r) => r.status === "Pending",
  ).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        eyebrow="A hello goes a long way"
        title="Communication Center"
        description="Follow your requests, reply to neighbours, and keep each exchange moving."
      />

      {/* Modern Segmented Navigation Tabs */}
      <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-1.5">
        <button
          aria-pressed={tab === "incoming"}
          onClick={() => {
            setPage(1);
            setTab("incoming");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            tab === "incoming"
              ? "bg-brand-soft text-brand"
              : "bg-surface border border-line text-ink-soft hover:text-ink"
          }`}
        >
          <span><UIMessage>My requests</UIMessage></span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              tab === "incoming"
                ? "bg-surface-muted text-ink-muted"
                : "bg-surface-muted text-ink-soft"
            }`}
          >
            {incoming.length}
          </span>
          {pendingIncomingCount > 0 && (
            <span className="bg-danger-soft text-danger text-[10px] font-bold px-1.5 py-0.5 rounded-full ">
              {pendingIncomingCount}<UIMessage> new
            </UIMessage></span>
          )}
        </button>

        <button
          aria-pressed={tab === "sent"}
          onClick={() => {
            setPage(1);
            setTab("sent");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            tab === "sent"
              ? "bg-brand-soft text-brand"
              : "bg-surface border border-line text-ink-soft hover:text-ink"
          }`}
        >
          <span><UIMessage>My responses</UIMessage></span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              tab === "sent"
                ? "bg-surface-muted text-ink-muted"
                : "bg-surface-muted text-ink-soft"
            }`}
          >
            {sent.length}
          </span>
        </button>
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger-soft rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-danger">
          <AlertTriangleIcon className="w-4 h-4 text-danger shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <p className="text-sm text-ink-muted"><UIMessage>
        Counts show the conversations on this page.
      </UIMessage></p>
      {/* Content Area with Skeletons */}
      {loading ? (
        <div className="space-y-4">
          <InboxItemSkeleton />
          <InboxItemSkeleton />
          <InboxItemSkeleton />
        </div>
      ) : tab === "incoming" ? (
        incoming.length === 0 ? (
          <div className="bg-surface border border-line/90 rounded-xl p-10 text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-surface-muted text-ink-muted flex items-center justify-center mx-auto text-xl mb-3"></div>
            <h3 className="font-bold text-ink text-sm mb-1"><UIMessage>
              No incoming responses yet
            </UIMessage></h3>
            <p className="text-xs text-ink-muted max-w-sm mx-auto"><UIMessage>
              When a neighbor offers to help on one of your posts, their message
              and credentials will appear right here.
            </UIMessage></p>
          </div>
        ) : (
          <div className="space-y-4">
            {incoming.map((r) => {
              const initial = r.requester_name
                ? r.requester_name.charAt(0).toUpperCase()
                : "U";
              return (
                <div
                  key={r.id}
                  className="bg-surface border border-line rounded-3xl p-5 shadow-xs hover:border-line transition-all space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-1"><UIMessage>
                        Response to post
                      </UIMessage></span>
                      <Link
                        href={`/post/${r.post_id}`}
                        className="font-bold text-ink text-sm hover:text-brand transition-colors"
                      >
                        {r.post_title} &rarr;
                      </Link>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        r.status === "Accepted"
                          ? "bg-success-soft text-success border-success-soft"
                          : r.status === "Pending"
                            ? "bg-warning-soft text-warning border-warning-soft"
                            : "bg-surface-muted text-ink-soft border-line"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  {/* Requester profile info */}
                  <div className="flex items-center gap-2.5 text-xs text-ink-soft">
                    <div className="w-7 h-7 rounded-full bg-brand-soft text-brand font-bold flex items-center justify-center text-[11px]">
                      {initial}
                    </div>
                    <span className="font-semibold text-ink">
                      {r.requester_name}
                    </span>
                    <span>·</span>
                    <span className="text-warning font-semibold inline-flex items-center gap-0.5">
                      <StarIcon className="w-3 h-3" />
                      {r.requester_rating
                        ? r.requester_rating.toFixed(1)
                        : "0.0"}
                    </span>
                    <span>·</span>
                    <span className="bg-surface-muted text-ink-soft px-2 py-0.5 rounded-md font-medium text-[10px]">
                      <BadgeTier tier={r.requester_badge} />
                    </span>
                  </div>

                  {/* Message body */}
                  <div className="bg-surface-muted border border-line rounded-xl p-3.5 text-xs text-ink-soft leading-relaxed">
                    {r.message}
                  </div>

                  {r.chat_closed && <p className="text-sm text-success"><UIMessage>Conversation closed</UIMessage></p>}
                  {/* Action row */}
                  <div className="flex items-center justify-between pt-1">
                    {r.status === "Pending" && (
                      <div className="flex items-center gap-2">
                        <button
                          disabled={busyId === r.id}
                          onClick={() => act(r.id, "accept")}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-solid hover:brightness-110 text-on-brand transition-colors shadow-xs"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                          <span><UIMessage>Accept Offer</UIMessage></span>
                        </button>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => act(r.id, "reject")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-ink-soft hover:text-ink hover:bg-surface-muted border border-line transition-colors"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                          <span><UIMessage>Decline</UIMessage></span>
                        </button>
                      </div>
                    )}

                    {r.status === "Accepted" && !r.chat_closed && (
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/messages/${r.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-solid hover:bg-brand-solid text-on-brand transition-colors shadow-xs"
                        >
                          <MessageSquareIcon className="w-3.5 h-3.5" />
                          <span><UIMessage>Open Chat</UIMessage></span>
                        </Link>
                        {r.requester_contact && (
                          <span className="inline-flex items-center gap-1 text-xs text-ink-soft bg-surface-muted px-2.5 py-1 rounded-lg">
                            <PhoneIcon className="w-3 h-3 text-ink-muted" />
                            {r.requester_contact}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : sent.length === 0 ? (
        <div className="bg-surface border border-line/90 rounded-xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-surface-muted text-ink-muted flex items-center justify-center mx-auto text-xl mb-3"></div>
          <h3 className="font-bold text-ink text-sm mb-1"><UIMessage>No offers sent</UIMessage></h3>
          <p className="text-xs text-ink-muted max-w-sm mx-auto mb-4"><UIMessage>
            Browse the public feed to find neighbors in your area looking for
            help, tools, or skills.
          </UIMessage></p>
          <Link
            href="/noticeboard"
            className="inline-flex items-center justify-center py-2 px-4 rounded-xl text-xs font-semibold bg-brand-solid text-on-brand"
          ><UIMessage>
            Browse Noticeboard
          </UIMessage></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sent.map((r) => (
            <div
              key={r.id}
              className="bg-surface border border-line rounded-3xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-1"><UIMessage>
                    Your offer on
                  </UIMessage></span>
                  <Link
                    href={`/post/${r.post_id}`}
                    className="font-bold text-ink text-sm hover:text-brand transition-colors"
                  >
                    {r.post_title} &rarr;
                  </Link>
                </div>

                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    r.status === "Accepted"
                      ? "bg-success-soft text-success border-success-soft"
                      : r.status === "Pending"
                        ? "bg-warning-soft text-warning border-warning-soft"
                        : "bg-surface-muted text-ink-soft border-line"
                  }`}
                >
                  {r.status}
                </span>
              </div>

              <p className="text-xs text-ink-muted"><UIMessage>
                To post owner:</UIMessage>{" "}
                <strong className="text-ink">{r.owner_name}</strong>
              </p>

              <div className="bg-surface-muted border border-line rounded-xl p-3.5 text-xs text-ink-soft leading-relaxed">
                {r.message}
              </div>

              {r.chat_closed && <p className="text-sm text-success"><UIMessage>Conversation closed</UIMessage></p>}
              <div className="pt-1">
                {r.status === "Pending" && (
                  <p className="text-xs text-warning font-medium"><UIMessage>
                    Waiting for </UIMessage>{r.owner_name}<UIMessage> to review and accept your offer.
                  </UIMessage></p>
                )}
                {r.status === "Rejected" && (
                  <p className="text-xs text-ink-muted"><UIMessage>
                    This offer was not accepted. Thank you for offering your
                    help!
                  </UIMessage></p>
                )}
                {r.status === "Accepted" && !r.chat_closed && (
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/messages/${r.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-solid hover:bg-brand-solid text-on-brand transition-colors shadow-xs"
                    >
                      <MessageSquareIcon className="w-3.5 h-3.5" />
                      <span><UIMessage>Open Chat</UIMessage></span>
                    </Link>
                    {r.owner_contact && (
                      <span className="inline-flex items-center gap-1 text-xs text-ink-soft bg-surface-muted px-2.5 py-1 rounded-lg">
                        <PhoneIcon className="w-3 h-3 text-ink-muted" />
                        {r.owner_contact}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <Pagination
          page={page}
          hasMore={hasMore}
          onPage={setPage}
          label="conversations"
        />
      )}
    </div>
  );
}
