"use client";
import { Text as UIMessage } from "../lib/i18n";

import { useState } from "react";
import PasswordInput from "./PasswordInput";
import { Button, Input, Label } from "./ui";
import { api } from "../lib/api";
export default function PasswordSettings() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirm) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/password", {
        method: "POST",
        auth: true,
        body: {
          current_password: current,
          new_password: password,
          totp_code: code || null,
        },
      });
      setCurrent("");
      setPassword("");
      setConfirm("");
      setCode("");
      setMessage("Password updated. Other sessions have been signed out.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="bg-surface border border-line rounded-xl p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-sm"><UIMessage>Change password</UIMessage></h2>
        <p className="text-xs text-ink-muted mt-1"><UIMessage>
          Use at least 12 characters. Changing your password signs out other
          sessions.
        </UIMessage></p>
      </div>
      <form onSubmit={submit} aria-busy={busy} className="space-y-4">
        {[
          [
            "password-current",
            "Current password",
            current,
            setCurrent,
            "current-password",
          ],
          [
            "password-new",
            "New password",
            password,
            setPassword,
            "new-password",
          ],
          [
            "password-confirm",
            "Confirm new password",
            confirm,
            setConfirm,
            "new-password",
          ],
        ].map(([id, title, value, setter, complete]) => (
          <div key={id} className="space-y-2">
            <Label htmlFor={id}>{title}</Label>
            <PasswordInput
              label={title}
              id={id}
              disabled={busy}
              required
              minLength={id === "password-current" ? 1 : 12}
              maxLength={128}
              autoComplete={complete}
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="w-full"
            />
          </div>
        ))}
        <div className="space-y-2">
          <Label htmlFor="password-code"><UIMessage>Authenticator code, if enabled</UIMessage></Label>
          <Input
            id="password-code"
            disabled={busy}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-success">
            {message}
          </p>
        )}
        <Button type="submit" loading={busy} disabled={busy}><UIMessage>
          Update password
        </UIMessage></Button>
      </form>
    </section>
  );
}
