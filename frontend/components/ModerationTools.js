"use client";
import { Text as UIMessage } from "../lib/i18n";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Input, Label } from "./ui";
import { useToast } from "./ToastProvider";
import Pagination from "./Pagination";

export function MemberControls({ member, administrator, onSaved }) {
  const toast = useToast();
  const [plan, setPlan] = useState(member.plan || "free"), [days, setDays] = useState(30);
  const [note, setNote] = useState(""), [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false), [feedback, setFeedback] = useState("");
  useEffect(() => { setPlan(member.plan || "free"); }, [member.plan]);
  const protectedAccount = member.id === administrator.id || member.role === "super_admin" || (administrator.role !== "super_admin" && member.role !== "user");
  async function apply(path, body) {
    setBusy(true); setFeedback("");
    try {
      await api(`/admin/users/${member.id}/${path}`, { method: path === "delete" ? "POST" : "PATCH", auth: true, body });
      setFeedback("Change saved in the moderation audit trail."); toast("Change saved in the moderation audit trail."); setNote(""); setConfirmation(""); onSaved?.();
    } catch (e) { setFeedback(e.message); } finally { setBusy(false); }
  }
  return <details className="mt-3 text-left min-w-52">
    <summary className="text-brand cursor-pointer min-h-11 flex items-center"><UIMessage>Manage plan & account</UIMessage></summary>
    <div className="space-y-3 py-3 max-w-xs">
      <p className="text-xs"><UIMessage>Account: </UIMessage><strong>{member.account_state || "active"}</strong><UIMessage> · Plan: </UIMessage><strong>{member.plan || "free"}</strong></p>
      <Label htmlFor={`member-note-${member.id}`}><UIMessage>Reason for this change</UIMessage></Label>
      <Input id={`member-note-${member.id}`} value={note} onChange={e=>setNote(e.target.value)} minLength={10} maxLength={1000} placeholder="Record the reason for this action" />
      <Label htmlFor={`member-plan-${member.id}`}><UIMessage>Assign plan</UIMessage></Label>
      <select id={`member-plan-${member.id}`} className="filter-control" value={plan} onChange={e=>setPlan(e.target.value)}><option value="free"><UIMessage>Free</UIMessage></option><option value="plus"><UIMessage>Plus</UIMessage></option><option value="society"><UIMessage>Society</UIMessage></option></select>
      <Label htmlFor={`member-days-${member.id}`}><UIMessage>Grant validity (days)</UIMessage></Label>
      <Input id={`member-days-${member.id}`} type="number" min={1} max={366} value={days} onChange={e=>setDays(e.target.value)} />
      <p className="text-xs text-ink-muted"><UIMessage>Staff grants are not payments. No paid invoice will be created.</UIMessage></p>
      <Button variant="outline" loading={busy} disabled={note.trim().length < 10 || Number(days) < 1 || Number(days) > 366 || (member.account_state && member.account_state !== "active")} onClick={()=>apply("plan", { plan, days: Number(days), note })}><UIMessage>Save plan grant</UIMessage></Button>
      {!protectedAccount && member.account_state !== "deleted" && <Button variant="danger" loading={busy} disabled={note.trim().length < 10} onClick={()=>apply("restriction", { state: member.account_state === "suspended" ? "active" : "suspended", note })}><UIMessage>{member.account_state === "suspended" ? "Restore account access" : "Suspend account access"}</UIMessage></Button>}
      {!protectedAccount && administrator.role === "super_admin" && member.account_state !== "deleted" && <details className="border-t border-line pt-3">
        <summary className="min-h-11 text-danger cursor-pointer"><UIMessage>Delete account</UIMessage></summary>
        <p className="text-xs"><UIMessage>Public posts and personal profile data are removed. Sign-in is disabled. Minimal billing, exchange and case records remain. This cannot be undone.</UIMessage></p>
        <Label htmlFor={`delete-confirm-${member.id}`}><UIMessage>Type DELETE to confirm</UIMessage></Label>
        <Input id={`delete-confirm-${member.id}`} value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" />
        <Button variant="danger" loading={busy} disabled={confirmation !== "DELETE" || note.trim().length < 10} onClick={()=>apply("delete", { confirmation, note })}><UIMessage>Permanently delete account</UIMessage></Button>
      </details>}
      {feedback && <p role="status" className="text-xs">{feedback}</p>}
    </div>
  </details>;
}

export function SafetyCases({ activity = false }) {
  const [rows, setRows] = useState([]), [page, setPage] = useState(1), [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [notes, setNotes] = useState({}), [busy, setBusy] = useState(null), [attempt, setAttempt] = useState(0);
  useEffect(() => { setPage(1); }, [activity]);
  useEffect(() => {
    let active = true; setLoading(true); setError("");
    api(`/admin/${activity ? "activity" : "user-reports"}?page=${page}&page_size=20`, { auth: true, pagination: true }).then(data => {
      if (active) { setRows(data.items); setMore(data.has_more); }
    }).catch(e=>{ if(active) setError(e.message); }).finally(()=>{ if(active) setLoading(false); });
    return () => { active = false; };
  }, [activity, page, attempt]);
  async function review(row, status) {
    setBusy(row.id); setError("");
    try { await api(`/admin/user-reports/${row.id}`, { method: "PATCH", auth: true, body: { status, note: notes[row.id] || "" } }); setAttempt(n=>n+1); }
    catch (e) { setError(e.message); } finally { setBusy(null); }
  }
  return <section className="space-y-4">
    <h2 className="text-xl font-semibold"><UIMessage>{activity ? "Moderation audit trail" : "User safety reports"}</UIMessage></h2>
    <p className="text-sm text-ink-muted"><UIMessage>{activity ? "Staff actions record the actor, target member, date and reason. Passwords and verification codes are excluded." : "Review the case and member history before acting. Use Users to restrict access. A report is a concern, not proof of wrongdoing."}</UIMessage></p>
    {loading && <p role="status"><UIMessage>Loading records…</UIMessage></p>}
    {error && <div role="alert" className="text-danger">{error}<Button variant="outline" onClick={()=>setAttempt(n=>n+1)}><UIMessage>Retry records</UIMessage></Button></div>}
    {!loading && !error && !rows.length && <p><UIMessage>No records on this page.</UIMessage></p>}
    {rows.map(row=><article key={row.id} className="rounded-2xl border border-line bg-surface p-5 space-y-3">
      {activity ? <><h3 className="font-semibold">{row.action}</h3><p className="text-sm"><UIMessage>Moderator #</UIMessage>{row.actor_id}<UIMessage> · Member #</UIMessage>{row.target_id} · {new Date(row.created_at).toLocaleString()}</p><p className="break-words text-sm">{row.note}</p></> : <>
        <h3 className="font-semibold">{row.case_id} · {row.target_name}</h3>
        <p className="text-sm text-ink-muted"><UIMessage>Reported by </UIMessage>{row.reporter_name} · {new Date(row.created_at).toLocaleString()} · {row.status}</p>
        <p className="text-sm break-words">{row.reason}</p>
        <p className="text-xs"><UIMessage>Member #</UIMessage>{row.target_id}<UIMessage> · Account </UIMessage>{row.account_state}{row.request_id ? ` · Conversation #${row.request_id}` : ""}{row.post_id ? ` · Post #${row.post_id}` : ""}</p>
        {row.reviewer_note && <p className="text-sm"><UIMessage>Reviewer note: </UIMessage>{row.reviewer_note}</p>}
        <Label htmlFor={`case-note-${row.id}`}><UIMessage>Review note</UIMessage></Label>
        <Input id={`case-note-${row.id}`} value={notes[row.id] || ""} onChange={e=>setNotes(n=>({...n,[row.id]:e.target.value}))} maxLength={1000} placeholder="Evidence checked and action taken" />
        <div className="flex gap-3 flex-wrap">{["Reviewed", "Actioned"].map(status=><Button key={status} variant="outline" loading={busy === row.id} disabled={(notes[row.id] || "").trim().length < 10} onClick={()=>review(row,status)}><UIMessage>Mark </UIMessage>{status.toLowerCase()}</Button>)}</div>
      </>}
    </article>)}
    <Pagination page={page} hasMore={more} onPage={setPage} label="safety records" />
  </section>;
}
