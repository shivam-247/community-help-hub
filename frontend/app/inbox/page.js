"use client";
import { useEffect, useState } from "react";
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
  AlertTriangleIcon
} from "../../components/Icons";

export default function InboxPage() {
  const auth = useAuth();
  const notify = useToast();
  const [tab, setTab] = useState("incoming");
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [inc, snt] = await Promise.all([
        api("/inbox/incoming", { auth: true }),
        api("/inbox/sent", { auth: true }),
      ]);
      setIncoming(inc);
      setSent(snt);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.user) load();
  }, [auth?.user]);

  if (auth?.loading) return null;

  if (!auth?.user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl mb-3">
            📥
          </div>
          <h2 className="font-bold text-slate-900 text-lg mb-1">Log in to view your inbox</h2>
          <p className="text-xs text-slate-500 mb-5">
            Manage conversations and responses to community posts.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center py-2.5 px-5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const act = async (requestId, action) => {
    setBusyId(requestId);
    try {
      await api(`/requests/${requestId}`, { method: "PATCH", auth: true, body: { action } });
      await load();
      notify(action === "accept" ? "Request accepted. You can now message your neighbor." : "Request rejected.");
      window.dispatchEvent(new Event("chh-inbox-updated"));
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const pendingIncomingCount = incoming.filter((r) => r.status === "Pending").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Communication Center</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review incoming requests for your posts, and keep track of your active offers to help neighbors.
        </p>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setTab("incoming")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            tab === "incoming"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Incoming Requests</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            tab === "incoming" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-600"
          }`}>
            {incoming.length}
          </span>
          {pendingIncomingCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              {pendingIncomingCount} new
            </span>
          )}
        </button>

        <button
          onClick={() => setTab("sent")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            tab === "sent"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Sent Offers</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            tab === "sent" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-600"
          }`}>
            {sent.length}
          </span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-rose-800">
          <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Content Area with Skeletons */}
      {loading ? (
        <div className="space-y-4">
          <InboxItemSkeleton />
          <InboxItemSkeleton />
          <InboxItemSkeleton />
        </div>
      ) : tab === "incoming" ? (
        incoming.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-xl mb-3">
              📬
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">No incoming responses yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When a neighbor offers to help on one of your posts, their message and credentials will appear right here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incoming.map((r) => {
              const initial = r.requester_name ? r.requester_name.charAt(0).toUpperCase() : "U";
              return (
                <div
                  key={r.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-indigo-200 transition-all space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Response to post
                      </span>
                      <Link
                        href={`/post/${r.post_id}`}
                        className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors"
                      >
                        {r.post_title} &rarr;
                      </Link>
                    </div>

                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      r.status === "Accepted"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : r.status === "Pending"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  {/* Requester profile info */}
                  <div className="flex items-center gap-2.5 text-xs text-slate-600">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px]">
                      {initial}
                    </div>
                    <span className="font-semibold text-slate-900">{r.requester_name}</span>
                    <span>·</span>
                    <span className="text-amber-500 font-semibold inline-flex items-center gap-0.5">
                      <StarIcon className="w-3 h-3" />
                      {r.requester_rating ? r.requester_rating.toFixed(1) : "0.0"}
                    </span>
                    <span>·</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium text-[10px]">
                      {r.requester_badge || "Neighbor"}
                    </span>
                  </div>

                  {/* Message body */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed">
                    {r.message}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-1">
                    {r.status === "Pending" && (
                      <div className="flex items-center gap-2">
                        <button
                          disabled={busyId === r.id}
                          onClick={() => act(r.id, "accept")}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                          <span>Accept Offer</span>
                        </button>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => act(r.id, "reject")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}

                    {r.status === "Accepted" && (
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/messages/${r.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
                        >
                          <MessageSquareIcon className="w-3.5 h-3.5" />
                          <span>Open Chat</span>
                        </Link>
                        {r.requester_contact && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <PhoneIcon className="w-3 h-3 text-slate-400" />
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
        <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-xl mb-3">
            📤
          </div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">No offers sent</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Browse the public feed to find neighbors in your area looking for help, tools, or skills.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center py-2 px-4 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
          >
            Browse Noticeboard
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sent.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Your offer on
                  </span>
                  <Link
                    href={`/post/${r.post_id}`}
                    className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors"
                  >
                    {r.post_title} &rarr;
                  </Link>
                </div>

                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  r.status === "Accepted"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : r.status === "Pending"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {r.status}
                </span>
              </div>

              <p className="text-xs text-slate-500">
                To post owner: <strong className="text-slate-800">{r.owner_name}</strong>
              </p>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed">
                {r.message}
              </div>

              <div className="pt-1">
                {r.status === "Pending" && (
                  <p className="text-xs text-amber-600 font-medium">
                    ⏳ Waiting for {r.owner_name} to review and accept your offer.
                  </p>
                )}
                {r.status === "Rejected" && (
                  <p className="text-xs text-slate-500">
                    This offer was not accepted. Thank you for offering your help!
                  </p>
                )}
                {r.status === "Accepted" && (
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/messages/${r.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
                    >
                      <MessageSquareIcon className="w-3.5 h-3.5" />
                      <span>Open Chat</span>
                    </Link>
                    {r.owner_contact && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <PhoneIcon className="w-3 h-3 text-slate-400" />
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

    </div>
  );
}
