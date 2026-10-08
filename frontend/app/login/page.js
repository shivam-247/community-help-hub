"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input, Label, Icon } from "@santi020k/lumen-react";
import { useAuth } from "../../lib/auth-context";
export default function LoginPage() {
  const auth = useAuth(); const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [code, setCode] = useState(""); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); const [show, setShow] = useState(false);
  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try { await auth.login(email, password, code); const next = new URLSearchParams(window.location.search).get("next"); router.replace(next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/"); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="max-w-4xl mx-auto py-4 sm:py-10 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
    <section className="hidden md:block"><p className="text-xs font-semibold tracking-widest uppercase text-brand mb-5">Your neighborhood, connected</p><h2 className="text-4xl font-semibold tracking-tight leading-tight">A familiar place.<br />A helping hand.</h2><p className="text-ink-muted text-sm leading-relaxed mt-5 max-w-sm">Pick up where you left off. Follow your requests, message neighbors, and share what you can.</p><div className="border-t border-line mt-8 pt-5 flex items-center gap-3 text-sm text-ink-soft"><Icon name="shield-check" decorative className="text-brand" />Your contact details stay private.</div></section>
    <section className="bg-surface border border-line rounded-xl p-6 sm:p-8 space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1><p className="text-sm text-ink-muted mt-2">Sign in to your Community Help Hub account.</p></div>
      {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft text-danger p-3 text-sm">{error}</p>}
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="login-email">Email address</Label><Input id="login-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full" /></div>
        <div className="space-y-2"><Label htmlFor="login-password">Password</Label><div className="relative"><Input id="login-password" type={show ? "text" : "password"} autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className="w-full pr-12" /><Button variant="ghost" size="icon" type="button" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow(!show)} className="absolute top-0 right-0 h-full"><Icon name={show ? "eye-off" : "eye"} decorative /></Button></div></div>
        <details className="text-sm"><summary className="text-ink-muted cursor-pointer min-h-8">I use an authenticator</summary><div className="pt-3 space-y-2"><Label htmlFor="login-code">6-digit code</Label><Input id="login-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} className="w-full" placeholder="000000" /></div></details>
        <Button type="submit" loading={busy} disabled={busy} className="w-full product-button">{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
      <p className="border-t border-line pt-5 text-sm text-ink-muted">New here? <Link href="/signup" className="font-medium text-brand">Create an account</Link></p>
    </section>
  </div>;
}
