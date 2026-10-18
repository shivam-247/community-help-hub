"use client";
import { useState } from "react";
import { api } from "../lib/api";
import { Button, Input, Label } from "./ui";
export default function TrustReview({ userId, onSaved }) {
  const [note, setNote] = useState(""),
    [phone, setPhone] = useState(false),
    [address, setAddress] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <details>
      <summary className="text-brand text-xs cursor-pointer">
        Review phone & address
      </summary>
      <form
        className="space-y-3 mt-3 text-left max-w-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api(`/admin/users/${userId}/trust`, {
              method: "PATCH",
              auth: true,
              body: { phone_verified: phone, address_verified: address, note },
            });
            onSaved?.();
            setPhone(false);
            setAddress(false);
            setNote("");
            setError("");
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="text-xs text-ink-muted">
          Approve evidence first. Confirm only details checked with the society
          reference.
        </p>
        <label className="flex min-h-11 gap-2 items-center text-xs">
          <input
            type="checkbox"
            checked={phone}
            onChange={(e) => setPhone(e.target.checked)}
          />
          Phone confirmed
        </label>
        <label className="flex min-h-11 gap-2 items-center text-xs">
          <input
            type="checkbox"
            checked={address}
            onChange={(e) => setAddress(e.target.checked)}
          />
          Address / society confirmed
        </label>
        <Label htmlFor={`trust-note-${userId}`} className="text-xs">
          Review note
        </Label>
        <Input
          id={`trust-note-${userId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          minLength={10}
          maxLength={1000}
          required
        />
        <label className="flex gap-2 text-sm min-h-11 items-start">
          <input type="checkbox" required />I reviewed both checks. Unchecked
          checks will be marked unverified; this replaces the previous review.
        </label>
        <Button type="submit" variant="outline" loading={busy}>
          Save trust review
        </Button>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
