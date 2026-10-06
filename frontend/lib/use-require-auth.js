"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { useToast } from "../components/ToastProvider";

export function useRequireAuth(required = true, adminOnly = false) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const notify = useToast();
  const allowed = !!user && (!adminOnly || ["admin", "super_admin"].includes(user.role));
  useEffect(() => {
    if (!required || loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!allowed) {
      notify("Administrator access is required for that page.", "error");
      router.replace("/");
    }
  }, [required, loading, user, allowed, pathname, router, notify]);
  return { user, loading, allowed: !required || (!loading && allowed) };
}
