"use client";
import { Text as UIMessage } from "../lib/i18n";

import { createContext, useContext, useEffect, useState } from "react";
import { Ellipsis, Flag, EyeOff } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useLanguage } from "../lib/i18n";
import { api } from "../lib/api";
import {
  Button,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  Label,
} from "./ui";
const SafetyContext = createContext({
  hidden: [],
  hide: () => {},
  restore: () => {},
});
export function SafetyProvider({ children }) {
  const { user } = useAuth();
  const [hidden, setHidden] = useState([]);
  const key = `chh-hidden-v1-${user?.id || "guest"}`;
  useEffect(() => {
    try {
      const ids = JSON.parse(sessionStorage.getItem(key) || "[]");
      setHidden(
        Array.isArray(ids) ? ids.filter(Number.isInteger).slice(-500) : [],
      );
    } catch {
      setHidden([]);
    }
  }, [key]);
  function save(ids) {
    setHidden(ids);
    try {
      sessionStorage.setItem(key, JSON.stringify(ids));
    } catch {}
  }
  return (
    <SafetyContext.Provider
      value={{
        hidden,
        hide: (id) => save([...new Set([...hidden, id])].slice(-500)),
        restore: () => save([]),
      }}
    >
      {children}
    </SafetyContext.Provider>
  );
}
export const useSafety = () => useContext(SafetyContext);
export default function SafetyMenu({ postId, conversationId, ownerId }) {
  const { user } = useAuth(), { hide } = useSafety(), { t } = useLanguage();
  const [open, setOpen] = useState(false), [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [caseId, setCaseId] = useState("");
  const reportKey = `${postId || "member"}-${conversationId || ownerId || "report"}`;
  async function report(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api(postId ? `/posts/${postId}/report` : `/users/${ownerId}/report`, {
        method: "POST", auth: true, body: { reason: reason.trim(),

          ...(conversationId ? { request_id: Number(conversationId) } : {}) },
      });
      setCaseId(result.case_id || "Report received");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    <Button className="safety-trigger" variant="ghost" size="icon" aria-label={t("Safety options")} onClick={() => setOpen(true)}><Ellipsis aria-hidden="true" /></Button>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent>
      <SheetTitle><UIMessage>Report a safety concern</UIMessage></SheetTitle>
      <SheetDescription><UIMessage>Tell the moderation team about spam, harassment, impersonation or an unsafe exchange. Reports are reviewed; they do not automatically ban a member.</UIMessage></SheetDescription>
      <div className="space-y-5 pt-6">
        {postId && <Button variant="outline" onClick={() => { hide(postId); setOpen(false); }}><EyeOff aria-hidden="true" className="size-4" /><UIMessage>Hide on this device</UIMessage></Button>}
        {caseId ? <p role="status" className="text-success"><UIMessage>Report sent. Case reference: </UIMessage>{caseId}<UIMessage>. A moderator can review it in User reports.</UIMessage></p> : user && user.id !== ownerId ?
          <form onSubmit={report} className="space-y-4">
            <Label htmlFor={`report-${reportKey}`}><UIMessage>Report reason</UIMessage></Label>
            <textarea id={`report-${reportKey}`} className="filter-control" rows={4} required minLength={10} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} />
            <p className="text-sm text-ink-muted"><UIMessage>Describe what happened and when. Do not include passwords, OTPs, Aadhaar numbers or bank details. Message logs are removed when both people complete an exchange, so report a concern while the conversation is active.</UIMessage></p>
            {error && <p role="alert" className="text-danger">{error}</p>}
            <Button type="submit" loading={busy}><Flag aria-hidden="true" className="size-4" /><UIMessage>Submit report</UIMessage></Button>
          </form> : <p className="text-sm"><UIMessage>{user ? "You cannot report yourself. Contact support for help with your own account." : "Sign in to report a safety concern."}</UIMessage></p>}
      </div>
    </SheetContent></Sheet>
  </>;
}
