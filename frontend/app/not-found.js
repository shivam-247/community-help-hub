import Link from "next/link";
export default function NotFound() {
  return <div className="text-center py-20 space-y-4"><p className="text-indigo-600 font-bold">404</p><h1 className="text-3xl font-bold">This page could not be found</h1><p className="text-slate-500">Find a neighbor or a new opportunity on the community feed.</p><Link href="/" className="inline-block rounded-xl bg-indigo-600 px-5 py-3 text-white">Back to the feed</Link></div>;
}
