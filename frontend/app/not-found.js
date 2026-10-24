import { Text as UIMessage } from "../lib/i18n";
import Link from "next/link";
export default function NotFound() {
  return (
    <div className="text-center py-20 space-y-4">
      <p className="text-brand font-bold">404</p>
      <h1 className="text-3xl font-bold"><UIMessage>This page could not be found</UIMessage></h1>
      <p className="text-ink-muted"><UIMessage>
        Find a neighbor or a new opportunity on the community feed.
      </UIMessage></p>
      <Link
        href="/noticeboard"
        className="inline-block rounded-xl bg-brand-solid px-5 py-3 text-on-brand"
      ><UIMessage>
        Back to the feed
      </UIMessage></Link>
    </div>
  );
}
