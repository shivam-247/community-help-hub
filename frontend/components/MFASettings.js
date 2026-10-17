"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import PasswordInput from "./PasswordInput";

export default function MFASettings() {
  const [enabled, setEnabled] = useState(null);
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/auth/mfa", { auth: true })
      .then((data) => setEnabled(data.enabled))
      .catch((e) => setError(e.message));
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!secret) {
        const data = await api("/auth/mfa/setup", {
          method: "POST",
          auth: true,
          body: { password },
        });
        setSecret(data.secret);
        setPassword("");
      } else {
        await api("/auth/mfa/confirm", {
          method: "POST",
          auth: true,
          body: { code },
        });
        setSecret("");
        setCode("");
        setEnabled(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="bg-surface border border-line rounded-xl p-6 space-y-4">
      <h3 className="font-bold text-ink text-sm">Two-factor authentication</h3>
      <p className="text-xs text-ink-soft">
        Use an authenticator app to protect your account.
      </p>
      {enabled === null && !error && (
        <p role="status">Loading authenticator settings…</p>
      )}
      {enabled ? (
        <p className="text-sm text-success">
          Enabled. Enter your authenticator code when signing in.
        </p>
      ) : (
        enabled === false && (
          <form onSubmit={submit} className="space-y-3" aria-busy={busy}>
            {secret ? (
              <>
                <p className="text-xs text-ink-soft">
                  Add an account in your authenticator using this setup key.
                  Store a backup of the key securely before continuing. Setup
                  expires in ten minutes.
                </p>
                <code className="block break-all p-3 bg-surface-muted text-sm">
                  {secret}
                </code>
                <label className="block text-xs">
                  Authenticator code
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="block w-full border rounded-xl p-2 mt-1"
                  />
                </label>
              </>
            ) : (
              <div>
                <label htmlFor="mfa-password" className="block text-xs mb-2">
                  Confirm your password
                </label>
                <PasswordInput
                  id="mfa-password"
                  label="current password"
                  disabled={busy}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full border rounded-xl p-2 mt-1"
                />
              </div>
            )}
            <button
              disabled={busy}
              className="bg-brand-solid text-on-brand rounded-xl px-4 py-2 text-xs disabled:opacity-50"
            >
              {busy
                ? "Please wait..."
                : secret
                  ? "Enable authenticator"
                  : "Set up authenticator"}
            </button>
          </form>
        )
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
