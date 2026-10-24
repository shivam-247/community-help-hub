"use client";
import { Text as UIMessage, LocalizedElement as UIElement } from "../lib/i18n";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  Button,
  Badge,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "./ui";
import Link from "next/link";

const deliveryCopy = {
  awaiting_setup:
    "Email delivery is not configured yet. Your test invoice is saved here.",
  awaiting_verification:
    "Verify your account email in Trust & Verification. Your receipt will queue automatically after verification.",
  queued:
    "Queued for email. The worker will try delivery when email service is available.",
  accepted:
    "Accepted by the email provider. Check your inbox and spam folder; this does not confirm inbox delivery.",
  failed:
    "The email could not be sent after several attempts. You can retry or download your invoice.",
  not_created:
    "This earlier checkout does not have a receipt yet. Generate it below.",
};

export default function InvoiceReceipt({ invoiceId }) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [sending, setSending] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api(`/billing/invoices/${invoiceId}`, {
      auth: true,
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, invoiceId, refresh]);
  async function email() {
    setSending(true);
    setError("");
    try {
      setData(
        await api(`/billing/invoices/${invoiceId}/email`, {
          auth: true,
          method: "POST",
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" aria-label={`View test invoice ${invoiceId}`}><UIMessage>
          View invoice
        </UIMessage></Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetTitle><UIMessage>Test invoice </UIMessage>{data?.number || `#${invoiceId}`}</SheetTitle>
        <SheetDescription><UIMessage>
          Practice checkout receipt. No money was charged. This is not a tax
          invoice or proof of payment.
        </UIMessage></SheetDescription>
        <div className="mt-6 space-y-5">
          {loading && <p role="status"><UIMessage>Loading your invoice…</UIMessage></p>}
          {error && (
            <div role="alert" className="text-danger space-y-3">
              <p>{error}</p>
              <Button
                variant="outline"
                onClick={() => setRefresh((n) => n + 1)}
              ><UIMessage>
                Retry invoice
              </UIMessage></Button>
            </div>
          )}
          {data && (
            <>
              <Badge variant="outline"><UIMessage>Test checkout · INR 0 charged</UIMessage></Badge>
              <dl className="divide-y divide-line">
                {data.fields?.map((field) => (
                  <div
                    key={field.label}
                    className="py-3 grid sm:grid-cols-2 gap-1 sm:gap-4"
                  >
                    <dt className="text-sm text-ink-muted">{field.label}</dt>
                    <dd className="text-sm font-medium break-anywhere">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <UIElement as="section"
                className="rounded-lg border border-line p-4 space-y-3"
                aria-label="Invoice email status"
              >
                <h3 className="font-semibold"><UIMessage>Email status</UIMessage></h3>
                {data.recipient && (
                  <p className="text-sm break-all"><UIMessage>To: </UIMessage>{data.recipient}</p>
                )}
                <p role="status" className="text-sm text-ink-muted">
                  {deliveryCopy[data.email_status] ||
                    "Email status is unavailable. Refresh to check again."}
                </p>
                <Button
                  variant="outline"
                  disabled={loading || sending}
                  onClick={() => setRefresh((n) => n + 1)}
                ><UIMessage>
                  Refresh email status
                </UIMessage></Button>
                {data.email_status === "awaiting_verification" && (
                  <Button asChild variant="outline">
                    <Link
                      href="/settings?tab=trust"
                      onClick={() => setOpen(false)}
                    ><UIMessage>
                      Verify my email
                    </UIMessage></Link>
                  </Button>
                )}
              </UIElement>
              <div className="flex flex-wrap gap-3">
                {!data.legacy && (
                  <Button asChild variant="outline">
                    <a
                      download
                      href={`/api/backend/billing/invoices/${invoiceId}/document`}
                    ><UIMessage>
                      Download invoice (HTML)
                    </UIMessage></a>
                  </Button>
                )}
                {(data.legacy ||
                  ["accepted", "failed"].includes(data.email_status)) && (
                  <Button loading={sending} disabled={loading} onClick={email}>
                    {data.legacy
                      ? "Generate test receipt"
                      : data.email_status === "accepted"
                        ? "Email another copy"
                        : "Retry invoice email"}
                  </Button>
                )}
              </div>
              <p className="text-xs text-ink-muted"><UIMessage>
                Open the downloaded HTML file in your browser to print or save
                it as a PDF. Plan dates on this receipt describe this purchase;
                later plan changes may replace your current access.
              </UIMessage></p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
