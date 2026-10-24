"use client";
import { Text as UIMessage, LocalizedElement as UIElement } from "../lib/i18n";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Icon } from "./ui";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import BottomNav from "./BottomNav";
import { LanguageSelect, useLanguage, Text } from "../lib/i18n";
import ThemeControl from "./ThemeControl";
import Avatar from "./Avatars";
import Brand from "./Brand";

export default function Nav() {
  const { t, language } = useLanguage();
  const auth = useAuth();
  const user = auth?.user;
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [logoutError, setLogoutError] = useState("");
  const [countErrors, setCountErrors] = useState({});
  const accountRef = useRef(null);
  const mobileTrigger = useRef(null);
  const headerRef = useRef(null);
  const isAdmin = ["admin", "super_admin"].includes(user?.role);
  useEffect(() => {
    const header = headerRef.current;
    const resize = new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        "--app-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    });
    resize.observe(header);
    return () => resize.disconnect();
  }, []);

  useEffect(() => {
    setOpen(false);
    if (accountRef.current) accountRef.current.open = false;
  }, [path]);
  useEffect(() => {
    const dismiss = (e) => {
      if (e.key === "Escape") {
        if (open) mobileTrigger.current?.focus();
        setOpen(false);
        if (accountRef.current?.open) {
          accountRef.current.open = false;
          accountRef.current.querySelector("summary")?.focus();
        }
      }
    };
    const outside = (e) => {
      if (!headerRef.current?.contains(e.target)) {
        setOpen(false);
        if (accountRef.current) accountRef.current.open = false;
      }
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  useEffect(() => {
    let active = true;
    setPendingCount(0);
    if (!user) return;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const data = await api("/inbox/pending-count", { auth: true });
        if (active) {
          setPendingCount(data.count);
          setCountErrors((v) => ({ ...v, inbox: false }));
        }
      } catch {
        if (active) setCountErrors((v) => ({ ...v, inbox: true }));
      }
    };
    poll();
    const timer = setInterval(poll, 30000);
    window.addEventListener("chh-inbox-updated", poll);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("chh-inbox-updated", poll);
    };
  }, [user?.id]);
  const logout = async () => {
    try {
      await auth.logout();
      setOpen(false);
      setLogoutError("");
    } catch {
      setLogoutError("Could not sign out. Please try again.");
    }
  };
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let active = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const rows = await api("/notifications/unread-count", { auth: true });
        if (active) {
          setUnread(rows.count);
          setCountErrors((v) => ({ ...v, updates: false }));
        }
      } catch {
        if (active) setCountErrors((v) => ({ ...v, updates: true }));
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user?.id]);
  const links = [
    { href: "/noticeboard", name: "Feed", icon: "layout-grid" },
    ...(!user ? [{ href: "/pricing", name: "Plans", icon: "layers" }] : []),
    ...(user
      ? [
          {
            href: "/notifications",
            name: "Updates",
            icon: "bell",
            count: unread,
          },
          {
            href: "/inbox",
            name: "Messages",
            icon: "message-circle",
            count: pendingCount,
          },
        ]
      : []),
  ];
  const navLinks = links.map((x) => (
    <Link
      key={x.href}
      href={x.href}
      aria-current={
        (x.href === "/" ? path === "/" : path.startsWith(x.href))
          ? "page"
          : undefined
      }
      className="primary-nav-link"
    >
      <Icon name={x.icon} decorative size="sm" />
      {t(x.name)}
      {!!x.count && (
        <span className="nav-count">{x.count > 99 ? "99+" : x.count}</span>
      )}
    </Link>
  ));
  return (
    <>
      <header
        lang={language}
        ref={headerRef}
        className="app-header sticky top-0 z-40"
      >
        <div className="header-inner">
          <Link
            href="/"
            aria-label="Community Help Hub home"
            className="flex items-center gap-2.5 shrink-0"
          >
            <Brand />
          </Link>
          <UIElement as="nav"
            aria-label="Main navigation"
            className="hidden lg:flex items-center self-stretch gap-1"
          >
            {navLinks}
          </UIElement>
          <div className="flex items-center gap-0.5 sm:gap-2">
            <LanguageSelect />
            <ThemeControl />
            {user ? (
              <details ref={accountRef} className="relative hidden lg:block">
                <summary className="account-trigger cursor-pointer list-none">
                  <Avatar id={user.avatar} name={user.name} size="size-8" />
                  <span className="max-w-24 truncate">
                    {user.name.split(" ")[0]}
                  </span>
                  <Icon name="chevron-down" decorative size="sm" />
                </summary>
                <div className="nav-panel absolute right-0 top-full mt-2 w-64 p-2">
                  <div className="p-3 border-b border-line mb-1">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-ink-muted break-all mt-1">
                      {user.email}
                    </p>
                    <p className="text-xs text-brand mt-2">
                      <UIMessage>{user.role === "super_admin"
                        ? "Super administrator"
                        : "Community member"}</UIMessage>
                    </p>
                  </div>
                  <Link className="app-link w-full" href="/inbox?tab=incoming">
                    <Text>My requests</Text>
                  </Link>
                  <Link className="app-link w-full" href="/inbox?tab=sent">
                    <Text>My responses</Text>
                  </Link>
                  <Link className="app-link w-full" href="/pricing">
                    <Text>Plans &amp; billing</Text>
                  </Link>
                  {isAdmin && (
                    <Link className="app-link w-full" href="/admin">
                      <Text>Administration</Text>
                    </Link>
                  )}
                  <Link
                    className="app-link w-full"
                    href={`/profile/${user.id}`}
                  >
                    <Text>My profile</Text>
                  </Link>
                  <Link className="app-link w-full" href="/settings">
                    <Text>Account &amp; safety</Text>
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={logout}
                    className="w-full justify-start text-danger"
                  >
                    <Text>Sign out</Text>
                  </Button>
                  {logoutError && (
                    <p role="alert" className="text-xs text-danger px-3">
                      {logoutError}
                    </p>
                  )}
                </div>
              </details>
            ) : (
              <Link href="/login" className="app-link nav-sign-in">
                <Text>Sign in</Text>
              </Link>
            )}
            <Button asChild className="hidden lg:inline-flex product-button">
              <Link href={user ? "/create-post" : "/signup"}>
                <Icon name={user ? "plus" : "arrow-right"} decorative />
                {t(user ? "Create post" : "Join the hub")}
              </Link>
            </Button>
            <Button
              ref={mobileTrigger}
              variant="ghost"
              size="icon"
              className="lg:hidden product-button shrink-0"
              aria-label={t(open ? "Close navigation" : "Open navigation")}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(!open)}
            >
              <Icon name={open ? "x" : "menu"} decorative />
            </Button>
          </div>
        </div>
        {user && Object.values(countErrors).some(Boolean) && (
          <p role="status" className="px-4 py-1 text-xs text-ink-muted"><UIMessage>
            Update counts are temporarily unavailable. Retrying automatically.
          </UIMessage></p>
        )}
        {open && (
          <UIElement as="nav"
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="mobile-navigation nav-panel lg:hidden"
          >
            {navLinks}
            <Link href="/pricing" className="app-link">
              <Text>Plans &amp; billing</Text>
            </Link>
            {isAdmin && (
              <Link href="/admin" className="app-link">
                <Text>Administration</Text>
              </Link>
            )}
            {user ? (
              <>
                <Link href="/create-post" className="app-link text-brand"><UIMessage>
                  Create post
                </UIMessage></Link>
                <Link href="/settings" className="app-link"><UIMessage>
                  Account & safety
                </UIMessage></Link>
                <Button
                  onClick={logout}
                  variant="ghost"
                  className="justify-start text-danger"
                >
                  <Text>Sign out</Text>
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className="app-link">
                  <Text>Sign in</Text>
                </Link>
                <Link href="/signup" className="app-link text-brand"><UIMessage>
                  Join the hub
                </UIMessage></Link>
              </>
            )}
            {logoutError && (
              <p role="alert" className="col-span-2 text-sm text-danger">
                {logoutError}
              </p>
            )}
          </UIElement>
        )}
      </header>
      <BottomNav user={user} path={path} pendingCount={pendingCount} />
    </>
  );
}
