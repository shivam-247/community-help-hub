"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../../lib/api";
import { Text, useLanguage } from "../../lib/i18n";
import { Button, Card, CardHeader, CardContent, Input, Label } from "../../components/ui";
import { ErrorMessage, FieldError } from "../../components/FormFeedback";
const emailSchema = z.object({ email: z.email("Enter a valid email address") });
const resetSchema = z.object({
  code: z.string().regex(/^[0-9]{8}$/, "Enter the eight-digit reset code"),
  new_password: z.string().min(12, "Use at least 12 characters").max(128),
  confirm_password: z.string().min(1, "Repeat your new password"),
  totp_code: z.string().regex(/^(?:[0-9]{6})?$/, "Enter a six-digit code"),
}).refine(data => data.new_password === data.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState(""), [stage, setStage] = useState("request");
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0), [resending, setResending] = useState(false);
  const [visible, setVisible] = useState({}), heading = useRef(null);
  const requestForm = useForm({ resolver: zodResolver(emailSchema), mode: "onBlur", defaultValues: { email: "" } });
  const resetForm = useForm({ resolver: zodResolver(resetSchema), mode: "onBlur", defaultValues: { code: "", new_password: "", confirm_password: "", totp_code: "" } });
  useEffect(() => { if (stage !== "request") heading.current?.focus(); }, [stage]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(n => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function requestCode(values) {
    setError(""); setNotice("");
    try {
      const data = await api("/auth/forgot-password", { method: "POST", body: values });
      setEmail(values.email); setNotice(data.message); setCooldown(60); setStage("reset");
    } catch (e) { setError(e.message); }
  }
  async function resend() {
    setResending(true);
    try { await requestCode({ email }); } finally { setResending(false); }
  }
  async function reset(values) {
    setError(""); setNotice("");
    try {
      await api("/auth/reset-password", { method: "POST", body: {
        email, code: values.code, new_password: values.new_password, totp_code: values.totp_code || null,
      } });
      resetForm.reset(); setVisible({}); setStage("complete");
      window.dispatchEvent(new Event("chh-auth-expired"));
    } catch (e) { setError(e.message); }
  }
  const busy = requestForm.formState.isSubmitting || resetForm.formState.isSubmitting || resending;
  const errors = resetForm.formState.errors;
  return <Card className="max-w-lg mx-auto">
    <CardHeader>
      <p className="eyebrow"><Text>Account recovery</Text></p>
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><Text>{stage === "complete" ? "Password reset complete" : "Forgot your password?"}</Text></h1>
    </CardHeader>
    <CardContent className="space-y-5">
      <ErrorMessage message={error} />
      {notice && <p role="status" className="text-sm leading-7"><Text>{notice}</Text></p>}
      {stage === "request" ? <>
        <p className="text-sm text-ink-muted"><Text>Enter your account email. If an eligible account exists, we will email a reset code. Never share your code.</Text></p>
        <form onSubmit={requestForm.handleSubmit(requestCode)} className="space-y-4" aria-busy={busy}>
          <Label htmlFor="recovery-email"><Text>Email address</Text></Label>
          <Input id="recovery-email" type="email" autoComplete="email" aria-invalid={!!requestForm.formState.errors.email} aria-describedby={requestForm.formState.errors.email ? "recovery-email-error" : undefined} {...requestForm.register("email")} />
          <FieldError id="recovery-email-error" error={requestForm.formState.errors.email} />
          <Button type="submit" loading={busy}><Text>Send password reset code</Text></Button>
        </form>
      </> : stage === "reset" ? <>
        <p className="text-sm text-ink-muted"><Text>The reset code expires in 10 minutes. If you enabled an authenticator, its current code is also required.</Text></p>
        <p className="text-sm break-all">{email}</p>
        <form onSubmit={resetForm.handleSubmit(reset)} className="space-y-4" aria-busy={busy}>
          <div><Label htmlFor="reset-code"><Text>Eight-digit reset code</Text></Label>
            <Input id="reset-code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} aria-invalid={!!errors.code} aria-describedby={errors.code ? "reset-code-error" : undefined} {...resetForm.register("code")} />
            <FieldError id="reset-code-error" error={errors.code} />
          </div>
          {[["new_password", "New password"], ["confirm_password", "Confirm new password"]].map(([name,label])=><div key={name}>
            <Label htmlFor={`reset-${name}`}><Text>{label}</Text></Label>
            <div className="relative"><Input id={`reset-${name}`} className="pr-12" type={visible[name] ? "text" : "password"} autoComplete="new-password" maxLength={128} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `reset-${name}-error` : "reset-password-hint"} {...resetForm.register(name)} />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" aria-label={t(visible[name] ? "Hide password" : "Show password") + ": " + t(label)} onClick={()=>setVisible(v=>({...v,[name]:!v[name]}))}>{visible[name] ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}</Button>
            </div><FieldError id={`reset-${name}-error`} error={errors[name]} />
          </div>)}
          <p id="reset-password-hint" className="text-xs text-ink-muted"><Text>Use at least 12 characters</Text></p>
          <div><Label htmlFor="reset-authenticator"><Text>Authenticator code (if enabled)</Text></Label>
            <Input id="reset-authenticator" inputMode="numeric" autoComplete="off" maxLength={6} aria-invalid={!!errors.totp_code} aria-describedby={errors.totp_code ? "reset-authenticator-error" : undefined} {...resetForm.register("totp_code")} />
            <FieldError id="reset-authenticator-error" error={errors.totp_code} />
          </div>
          <Button type="submit" loading={busy}><Text>Reset password and sign out all sessions</Text></Button>
        </form>
        <div className="flex flex-wrap gap-3"><Button variant="ghost" disabled={busy || cooldown > 0} onClick={resend}>{cooldown ? t("Resend in {count}s", { count: cooldown }) : t("Send another code")}</Button>
          <Button variant="ghost" disabled={busy} onClick={()=>{setStage("request");setError("");setNotice("");resetForm.reset();setVisible({});}}><Text>Use a different email</Text></Button>
        </div>
      </> : <p role="status" className="text-sm leading-7"><Text>Your password has been changed. Existing sessions are signed out. Sign in with your new password and authenticator code, if enabled.</Text></p>}
      <Link href="/login" className="inline-flex items-center min-h-11 text-brand underline"><Text>Back to sign in</Text></Link>
    </CardContent>
  </Card>;
}
