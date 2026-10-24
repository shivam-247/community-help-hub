"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { Text, useLanguage } from "../lib/i18n";
import { Button, Card, CardContent, CardHeader, Input, Label } from "./ui";
import { ErrorMessage } from "./FormFeedback";

export default function SignupVerification() {
  const router = useRouter(), { t } = useLanguage();
  const started = useRef(false);
  const [available, setAvailable] = useState(null), [verified, setVerified] = useState(false);
  const [code, setCode] = useState(""), [busy, setBusy] = useState(true);
  const [error, setError] = useState(""), [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  async function send() {
    setBusy(true); setError("");
    try {
      await api("/account/email/send", { method: "POST", auth: true, body: {} });
      setSent(true); setCooldown(60);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api("/account/trust", { auth: true }).then(async data => {
      setAvailable(data.email_delivery_available); setVerified(data.email);
      if (data.email_delivery_available && !data.email) await send();
      else setBusy(false);
    }).catch(e => { setError(e.message); setBusy(false); });
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(n => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function verify(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("/account/email/verify", { method: "POST", auth: true, body: { code } });
      setVerified(true); setCode("");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <Card className="max-w-lg mx-auto">
    <CardHeader><p className="eyebrow"><Text>Account created</Text></p>
      <h1 className="text-2xl font-semibold"><Text>Verify your email</Text></h1>
    </CardHeader>
    <CardContent className="space-y-5">
      <p className="text-sm leading-7 text-ink-muted"><Text>Email OTP confirms your inbox. Community approval is still required before you can publish a notice.</Text></p>
      <ErrorMessage message={error} />
      {busy && !available && <p role="status"><Text>Checking email delivery…</Text></p>}
      {verified ? <p role="status" className="text-success"><Text>Email verified.</Text></p> : available ? <>
        {sent && <p role="status" className="text-sm"><Text>A six-digit code is queued for your email. Check your inbox and spam folder. It expires in 10 minutes.</Text></p>}
        <form onSubmit={verify} className="space-y-3" aria-busy={busy}>
          <Label htmlFor="signup-email-code"><Text>Six-digit email code</Text></Label>
          <Input id="signup-email-code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g, "").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required aria-describedby="signup-code-hint" />
          <p id="signup-code-hint" className="text-xs text-ink-muted"><Text>Never share this code with anyone.</Text></p>
          <Button type="submit" loading={busy} disabled={!/^\d{6}$/.test(code)}><Text>Verify email code</Text></Button>
        </form>
        <Button variant="ghost" disabled={busy || cooldown > 0} onClick={send}>{cooldown > 0 ? t("Resend in {count}s", { count: cooldown }) : t("Send another code")}</Button>
      </> : available === false && <p role="status" className="text-sm"><Text>Email delivery is not configured yet. You can request community review now; publishing stays locked until approval.</Text></p>}
      <Button variant="outline" disabled={busy} onClick={()=>router.replace("/settings?tab=trust")}><Text>Continue to community verification</Text></Button>
    </CardContent>
  </Card>;
}
