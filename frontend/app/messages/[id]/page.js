"use client";
import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { MessageSkeleton } from "../../../components/Skeleton";
import { SendIcon, AlertTriangleIcon } from "../../../components/Icons";

export default function MessagesPage({ params }) {
  const { id } = use(params);
  const auth = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const data = await api(`/requests/${id}/messages`, { auth: true });
      setMessages(data);
    } catch (e) {
      setError(e.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.user) load(true);
    const interval = setInterval(() => {
      if (auth?.user) load(false);
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (auth?.loading) return null;

  if (!auth?.user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-slate-500 text-sm">Please log in to view conversation.</p>
      </div>
    );
  }

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api(`/requests/${id}/messages`, { method: "POST", auth: true, body: { text } });
      setText("");
      await load(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/inbox"
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold transition-colors"
          >
            &larr;
          </Link>
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Direct Exchange Chat</h2>
            <p className="text-[11px] text-slate-400">Encrypted 1-on-1 neighborhood channel</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-xs text-rose-800">
          <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Message Stream Box */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 h-[420px] overflow-y-auto flex flex-col gap-3 shadow-xs">
        {loading ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="m-auto text-center p-6 text-slate-400">
            <div className="text-3xl mb-2">👋</div>
            <p className="font-medium text-slate-700 text-sm">Start the conversation</p>
            <p className="text-xs text-slate-400 mt-0.5">Introduce yourself and coordinate details.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === auth.user.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${
                  isMe ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-tr-xs shadow-xs"
                      : "bg-slate-100 text-slate-900 rounded-tl-xs"
                  }`}
                >
                  <p>{m.text}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {isMe ? "You" : m.sender_name}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message to your neighbor..."
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-xs"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs disabled:opacity-60"
        >
          <SendIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}

