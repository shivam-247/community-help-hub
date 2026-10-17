"use client";
import RecoveryPanel from "./RecoveryPanel";
import { useAuth } from "../lib/auth-context";
import { usePathname } from "next/navigation";
import { useRequireAuth } from "../lib/use-require-auth";

const protectedPaths = [
  "/create-post",
  "/inbox",
  "/messages",
  "/settings",
  "/admin",
  "/notifications",
];
export default function RouteGuard({ children }) {
  const pathname = usePathname();
  const required = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const adminOnly = pathname === "/admin" || pathname.startsWith("/admin/");
  const { allowed } = useRequireAuth(required, adminOnly);
  const auth = useAuth();
  if (required && auth.error)
    return (
      <RecoveryPanel
        title="Cannot check your session"
        message={auth.error}
        onRetry={() => auth.refresh().catch(() => {})}
      />
    );
  return allowed ? (
    children
  ) : (
    <div role="status" className="py-16 text-center text-sm text-ink-muted">
      Checking your access…
    </div>
  );
}
