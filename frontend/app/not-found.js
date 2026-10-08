import Link from "next/link";
export default function NotFound() {
  return <div className="text-center py-20 space-y-4"><p className="text-brand font-bold">404</p><h1 className="text-3xl font-bold">This page could not be found</h1><p className="text-ink-muted">Find a neighbor or a new opportunity on the community feed.</p><Link href="/" className="inline-block rounded-xl bg-brand-solid px-5 py-3 text-on-brand">Back to the feed</Link></div>;
}

