import { Text as UIMessage } from "../lib/i18n";
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-line p-8 text-sm text-ink-muted"
    ><UIMessage>
      Loading Community Help Hub…
    </UIMessage></div>
  );
}
