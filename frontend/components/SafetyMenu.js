"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Ellipsis, Flag, EyeOff, ShieldOff } from "lucide-react";
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
  const { user } = useAuth(),
    { hide } = useSafety(),
    { t } = useLanguage();
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  async function report(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/posts/${postId}/report`, {
        method: "POST",
        auth: true,
        body: { reason: reason.trim() },
      });
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const subject = `Community Help Hub conversation ${conversationId} safety report`;
  return (
    <>
      <Button
        className="safety-trigger"
        variant="ghost"
        size="icon"
        aria-label="Post and conversation safety options"
        onClick={() => {
          setOpen(true);
          setSent(false);
          setError("");
        }}
      >
        <Ellipsis aria-hidden="true" className="size-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetTitle>Safety options</SheetTitle>
          <SheetDescription>
            Tell the moderator about a concern. For emergencies, contact local
            emergency services.
          </SheetDescription>
          <div className="mt-6 space-y-5">
            {postId && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    hide(postId);
                    setOpen(false);
                  }}
                >
                  <EyeOff aria-hidden="true" className="size-4" />
                  Hide on this device
                </Button>
                <p className="text-sm text-ink-muted">
                  Hidden in this browser session only. Restore hidden posts from
                  the noticeboard. This does not prevent contact.
                </p>
              </>
            )}
            <div>
              <Button
                disabled
                variant="outline"
                className="w-full justify-start"
              >
                <ShieldOff aria-hidden="true" className="size-4" />
                Block member · unavailable
              </Button>
              <p className="mt-2 text-sm text-ink-muted">
                Account blocking is not supported yet. Report unwanted contact
                to the maintainer; hiding a post does not block its author.
              </p>
            </div>
            {postId ? (
              user && user.id !== ownerId ? (
                sent ? (
                  <p role="status" className="text-success">
                    {t("Report sent")}. The moderator can review it in the
                    reports queue.
                  </p>
                ) : (
                  <form onSubmit={report} className="space-y-3">
                    <Label htmlFor={`report-${postId}`}>Report reason</Label>
                    <textarea
                      id={`report-${postId}`}
                      required
                      minLength={5}
                      maxLength={1000}
                      rows={4}
                      className="filter-control"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      aria-describedby={`report-hint-${postId}`}
                    />
                    <p
                      id={`report-hint-${postId}`}
                      className="text-sm text-ink-muted"
                    >
                      Explain the concern. Do not include passwords, OTPs or
                      identity documents.
                    </p>
                    {error && (
                      <p role="alert" className="text-danger text-sm">
                        {error}
                      </p>
                    )}
                    <Button type="submit" loading={busy}>
                      <Flag aria-hidden="true" className="size-4" />
                      Submit report
                    </Button>
                  </form>
                )
              ) : (
                <p className="text-sm text-ink-muted">
                  {user
                    ? "For a concern about your own notice, contact the maintainer."
                    : "Sign in to report this notice."}{" "}
                  <a
                    className="underline"
                    href={
                      user
                        ? "mailto:parmarshivam247@gmail.com"
                        : `/login?next=${encodeURIComponent(`/post/${postId}`)}`
                    }
                  >
                    {user ? "Email maintainer" : t("Sign in")}
                  </a>
                </p>
              )
            ) : (
              <div className="space-y-3">
                <p className="text-sm">
                  Conversation reports are reviewed by the project maintainer.
                  Your email app opens a draft; review it before sending.
                </p>
                <a
                  className="min-h-11 inline-flex items-center gap-2 text-brand underline"
                  href={`mailto:parmarshivam247@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Conversation URL: /messages/${conversationId}\n\nDescribe your concern (omit private credentials):\n`)}`}
                >
                  <Flag aria-hidden="true" className="size-4" />
                  Report conversation by email
                </a>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
