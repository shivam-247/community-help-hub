"use client";
import Link from "next/link";
import { Button } from "./ui";
export default function RecoveryPanel({
  title = "This page could not be loaded",
  message = "Please try again. Contact support if the problem continues.",
  onRetry,
  reference,
}) {
  return (
    <section
      role="alert"
      className="max-w-xl mx-auto rounded-xl border border-line bg-surface p-6 space-y-4 break-anywhere"
    >
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-ink-muted">{message}</p>
      {reference && (
        <p className="text-xs text-ink-muted">Support reference: {reference}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
        <Button variant="outline" asChild>
          <Link href="/noticeboard">Back to noticeboard</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/contact">Contact support</Link>
        </Button>
      </div>
    </section>
  );
}
