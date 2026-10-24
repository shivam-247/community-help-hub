"use client";
import { LocalizedElement as UIElement } from "../lib/i18n";

import Link from "next/link";
import { LayoutGrid, MessageCircle, Plus, User } from "lucide-react";
import { useLanguage } from "../lib/i18n";
export default function BottomNav({ user, path, pendingCount = 0 }) {
  const { t, language } = useLanguage();
  const items = [
    ["/noticeboard", "Feed", LayoutGrid],
    ["/inbox", "Messages", MessageCircle],
    ["/create-post", "Post", Plus],
    [user ? "/settings" : "/login", user ? "Account" : "Sign in", User],
  ];
  return (
    <UIElement as="nav"
      lang={language}
      aria-label="Quick navigation"
      className="mobile-dock lg:hidden"
    >
      {items.map(([href, label, Icon]) => (
        <Link
          key={href}
          href={href}
          aria-current={
            (path === href || path.startsWith(`${href}/`) ||
              (href === "/login" && path === "/signup")) ? "page" : undefined
          }
          className={`dock-link ${href === "/create-post" ? "dock-compose" : ""}`}
        >
          <span className="relative">
            <Icon aria-hidden="true" className="size-5" />
            {href === "/inbox" && user && pendingCount > 0 ? (
              <span className="dock-dot" />
            ) : null}
          </span>
          <span>{t(label)}</span>
        </Link>
      ))}
    </UIElement>
  );
}
