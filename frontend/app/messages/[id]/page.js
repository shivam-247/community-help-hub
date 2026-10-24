"use client";
import { Text as UIMessage, LocalizedElement as UIElement } from "../../../lib/i18n";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import SafetyMenu from "../../../components/SafetyMenu";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { Button, Input } from "../../../components/ui";

export default function MessagesPage({ params }) {
  const { id } = use(params), auth = useAuth();
  const [messages, setMessages] = useState([]), [text, setText] = useState("");
  const [state, setState] = useState(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [hasOlder, setHasOlder] = useState(false), [attempt, setAttempt] = useState(0);
  const [connection, setConnection] = useState("Connecting…");
  const closed = useRef(false), stream = useRef(null), end = useRef(null);
  const historyView = useRef(false), followEnd = useRef(true);
  function closeConversation(next = {}) {
    closed.current = true;
    stream.current?.close();
    setState(current => ({ ...current, ...next, closed: true }));
    setMessages([]);
    setText("");
    setHasOlder(false);
    setError("");
    setConnection("Closed");
  }
  useEffect(() => {
    if (!auth?.user) return;
    let cancelled = false;
    closed.current = false;
    historyView.current = false;
    followEnd.current = true;
    setState(null);
    setMessages([]);
    setLoading(true);
    setError("");
    async function checkState() {
      try {
        const next = await api(`/requests/${id}/state`, { auth: true });
        if (cancelled) return null;
        if (next.closed) closeConversation(next);
        else setState(next);
        return next;
      } catch (e) {
        if (!cancelled) {
          if ([403, 410].includes(e.status)) closeConversation();
          else setError(e.message);
        }
        return null;
      }
    }
    async function connect() {
      const next = await checkState();
      if (!next || next.closed || cancelled) { if (!cancelled) setLoading(false); return; }
      try {
        const data = await api(`/requests/${id}/messages?page_size=20`, { auth: true, pagination: true });
        if (cancelled || closed.current) return;
        setMessages(data.items);
        setHasOlder(data.has_more);
        const source = new EventSource(`/api/backend/requests/${id}/events?after=${data.items.at(-1)?.id || 0}`);
        stream.current = source;
        source.onopen = () => { if (!cancelled && !closed.current) setConnection("Live"); };
        source.addEventListener("exchange_closed", () => { if (!cancelled) closeConversation(); });
        source.onmessage = event => {
          if (cancelled || closed.current || historyView.current) return;
          try {
            const message = JSON.parse(event.data);
            setMessages(rows => [...new Map([...rows, message].map(m => [m.id, m])).values()].sort((a,b) => a.id-b.id).slice(-50));
          } catch { setError("A message could not be loaded. Refresh this conversation."); }
        };
        source.onerror = () => { if (!cancelled && !closed.current) { setConnection("Reconnecting…"); checkState(); } };
      } catch (e) {
        if (!cancelled) { if (e.status === 410) closeConversation(); else setError(e.message); }
      } finally { if (!cancelled) setLoading(false); }
    }
    connect();
    // Polling also closes the other tab when a proxy buffers or interrupts SSE.
    const timer = setInterval(() => { if (!document.hidden && !closed.current) checkState(); }, 3000);
    const focus = () => { if (!closed.current) checkState(); };
    window.addEventListener("focus", focus);
    return () => { cancelled = true; clearInterval(timer); stream.current?.close(); window.removeEventListener("focus", focus); };
  }, [id, auth?.user?.id, attempt]);
  useEffect(() => { if (!historyView.current && followEnd.current) end.current?.scrollIntoView({ block: "nearest" }); }, [messages]);

  async function send(event) {
    event.preventDefault();
    if (busy || closed.current || !text.trim()) return;
    setBusy(true);
    try {
      const message = await api(`/requests/${id}/messages`, { method: "POST", auth: true, body: { text } });
      if (!closed.current) { followEnd.current = true; if (historyView.current) setAttempt(n=>n+1); else setMessages(rows => [...new Map([...rows, message].map(m => [m.id,m])).values()]); setText(""); setError(""); }
    } catch (e) { if (e.status === 410) closeConversation(); else setError(e.message); }
    finally { setBusy(false); }
  }
  async function complete() {
    setBusy(true);
    try {
      const result = await api(`/requests/${id}/complete`, { method: "POST", auth: true, body: {} });
      if (result.completed) closeConversation();
      else setState(current => ({ ...current, confirmed: true }));
      await auth.refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function older() {
    if (!messages.length || closed.current) return;
    setBusy(true);
    try {
      const data = await api(`/requests/${id}/messages?before_id=${messages[0].id}&page_size=20`, { auth: true, pagination: true });
      if (!closed.current) { historyView.current = true; followEnd.current = false; setMessages(data.items); setHasOlder(data.has_more); }
    } catch (e) { if (e.status === 410) closeConversation(); else setError(e.message); }
    finally { setBusy(false); }
  }
  if (auth?.loading) return <p role="status"><UIMessage>Loading your conversation…</UIMessage></p>;
  if (!auth?.user) return <p><Link href="/login"><UIMessage>Sign in</UIMessage></Link><UIMessage> to view your conversation.</UIMessage></p>;
  return <section className="max-w-2xl mx-auto space-y-5">
    <div className="flex items-center justify-between gap-3">
      <div><Link href="/inbox" className="inline-flex min-h-11 items-center text-brand underline"><UIMessage>Back to inbox</UIMessage></Link>
        <h1 className="text-2xl font-semibold"><UIMessage>Direct exchange chat</UIMessage></h1>
        <p role="status" className="text-sm text-ink-muted"><UIMessage>{connection}</UIMessage></p></div>
      {state?.peer_id && <SafetyMenu conversationId={id} ownerId={state.peer_id} />}
    </div>
    {state?.closed ? <div className="rounded-3xl border border-line bg-surface p-6 space-y-4" role="status">
      <h2 className="text-lg font-semibold"><UIMessage>Conversation closed</UIMessage></h2>
      <p><UIMessage>This chat is no longer available. When both neighbours confirm completion, messages are removed and sending is disabled for both people.</UIMessage></p>
      {state.post_id && <Link href={`/post/${state.post_id}`} className="inline-flex min-h-11 items-center text-brand underline"><UIMessage>View exchange and review your neighbour</UIMessage></Link>}
    </div> : <>
      {error && <div role="alert" className="text-danger rounded-xl bg-danger-soft p-4">{error}</div>}
      {!loading && state && <Button variant="outline" disabled={busy} onClick={() => setAttempt(n=>n+1)}><UIMessage>Latest messages / retry</UIMessage></Button>}
      {loading ? <p role="status"><UIMessage>Loading your conversation…</UIMessage></p> : !state ? <Button onClick={() => setAttempt(n=>n+1)}><UIMessage>Retry conversation</UIMessage></Button> : <>
        {hasOlder && <Button variant="outline" disabled={busy} onClick={older}><UIMessage>Older messages</UIMessage></Button>}
        <UIElement as="div" onScroll={event => { const el = event.currentTarget; followEnd.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 48; }} role="log" aria-label="Conversation messages" aria-live="polite" tabIndex={0} className="chat-thread h-[380px] overflow-y-auto rounded-3xl border border-line p-4 space-y-3">
          {!messages.length && <p className="text-ink-muted"><UIMessage>Introduce yourself and coordinate your exchange here.</UIMessage></p>}
          {messages.map(m => <div key={m.id} className={`rounded-xl p-3 max-w-[85%] break-anywhere ${m.sender_id === auth.user.id ? "ml-auto bg-brand-soft text-brand" : "bg-surface-muted text-ink"}`}><p className="text-xs mb-1">{m.sender_id === auth.user.id ? "You" : m.sender_name}</p><p>{m.text}</p></div>)}
          <div ref={end} />
        </UIElement>
        <form onSubmit={send} className="flex gap-2"><Input aria-label="Message to your neighbour" value={text} onChange={e=>setText(e.target.value)} disabled={busy} maxLength={4000} placeholder="Type a message…" /><Button type="submit" disabled={busy || !text.trim()}><UIMessage>Send message</UIMessage></Button></form>
        <div className="rounded-3xl border border-line bg-surface p-5 space-y-3">
          <p className="text-sm"><UIMessage>Both neighbours must confirm completion. Then this chat closes, its messages are removed, and each person earns 10 credits once.</UIMessage></p>
          {state.confirmed ? <p role="status" className="text-success"><UIMessage>Your confirmation is saved. Waiting for your neighbour.</UIMessage></p> : <Button variant="outline" loading={busy} onClick={complete}><UIMessage>Confirm exchange completed</UIMessage></Button>}
        </div>
      </>}
    </>}
  </section>;
}
