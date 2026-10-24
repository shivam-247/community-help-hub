"use client";
import { Text as UIMessage } from "../lib/i18n";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Input, Label } from "./ui";
export default function TrustReview({ userId, onSaved, phoneVerified = false, addressVerified = false, contactPhone }) {
  const [note, setNote] = useState(""),
    [phone, setPhone] = useState(false),
    [address, setAddress] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => { setPhone(phoneVerified); setAddress(addressVerified); }, [phoneVerified, addressVerified]);
  return (
    <details>
      <summary className="text-brand text-xs cursor-pointer"><UIMessage>
        Review phone & address
      </UIMessage></summary>
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
            setNote("");
            setError("");
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="text-xs text-ink-muted"><UIMessage>
          Approve evidence first. Confirm only details checked with the society
          reference.
        </UIMessage></p>
        <p className="text-xs">{contactPhone ? `Saved phone: ${contactPhone}` : "No phone saved; the phone check cannot be confirmed."}</p>
        <label className="flex min-h-11 gap-2 items-center text-xs">
          <input
            type="checkbox"
            checked={phone}
            onChange={(e) => setPhone(e.target.checked)}
          /><UIMessage>
          Phone confirmed
        </UIMessage></label>
        <label className="flex min-h-11 gap-2 items-center text-xs">
          <input
            type="checkbox"
            checked={address}
            onChange={(e) => setAddress(e.target.checked)}
          /><UIMessage>
          Address / society confirmed
        </UIMessage></label>
        <Label htmlFor={`trust-note-${userId}`} className="text-xs"><UIMessage>
          Review note
        </UIMessage></Label>
        <Input
          id={`trust-note-${userId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          minLength={10}
          maxLength={1000}
          required
        />
        <label className="flex gap-2 text-sm min-h-11 items-start">
          <input type="checkbox" required /><UIMessage>I reviewed both checks. Unchecked
          checks will be marked unverified; this replaces the previous review.
        </UIMessage></label>
        <Button type="submit" variant="outline" loading={busy}><UIMessage>
          Save trust review
        </UIMessage></Button>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
