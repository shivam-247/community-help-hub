"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import Avatar from "./Avatars";
import { api } from "../lib/api";
import {
  CHHLogoIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
  SettingsIcon,
  InfoIcon,
  ChevronDownIcon,
} from "./Icons";

export default function Nav() {
  const auth = useAuth();
  const user = auth?.user;
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const menuRef = useRef(null);

  const isActive = (path) => pathname === path;

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;
    setPendingCount(0);
    if (!user) return;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const requests = await api("/inbox/incoming", { auth: true });
        if (active) setPendingCount(requests.filter((request) => request.status === "Pending").length);
      } catch {}
    };
    poll();
    window.addEventListener("chh-inbox-updated", poll);
    const interval = setInterval(poll, 30000);
    return () => { active = false; clearInterval(interval); window.removeEventListener("chh-inbox-updated", poll); };
  }, [user?.id, pathname]);

  useEffect(() => {
    const close = (event) => { if (event.key === "Escape") { setMobileOpen(false); setMenuOpen(false); } };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  return (
    <header className="sticky top-0 z-40 bg-white/40 backdrop-blur-xl border-b border-slate-200/50 shadow-xs transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200/60 ring-2 ring-indigo-500/10 group-hover:scale-105 group-hover:shadow-indigo-300/60 transition-all">
            <CHHLogoIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
              Community Help Hub
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">
              Mutual Aid &amp; Trust Network
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 text-sm font-medium">
          <Link href="/pricing" className="px-3 py-1.5 rounded-xl hover:bg-slate-100">Plans</Link>
          <Link
            href="/"
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              isActive("/")
                ? "bg-slate-900 text-white font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            Feed
          </Link>

          {user && (
            <Link
              href="/inbox"
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                isActive("/inbox")
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              Inbox
              {pendingCount > 0 && <span aria-label={`${pendingCount} pending requests`} className="ml-1 inline-block w-2 h-2 rounded-full bg-rose-500" />}
            </Link>
          )}

          <Link
            href="/about"
            className={`px-3.5 py-1.5 rounded-xl transition-all hidden md:inline-block ${
              isActive("/about")
                ? "bg-slate-900 text-white font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            About
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                pathname?.startsWith("/admin")
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : isSuperAdmin
                  ? "text-violet-700 hover:bg-violet-50/70 font-semibold"
                  : "text-indigo-600 hover:bg-indigo-50/70"
              }`}
            >
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </Link>
          )}
        </nav>

        {/* User Profile / Interactive Popover */}
        <div className="flex items-center gap-2.5">
          <button type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden rounded-xl border border-slate-200 px-3 py-2 text-sm">{mobileOpen ? "×" : "☰"}</button>
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3 relative" ref={menuRef}>
              <Link
                href="/create-post"
                className="hidden sm:inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all hover:shadow-indigo-200 select-none"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Post</span>
              </Link>

              {/* Profile Popover Trigger Pill */}
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className={`flex items-center gap-2 bg-white/70 hover:bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-full pl-1 pr-2.5 py-1 text-xs text-slate-700 shadow-xs transition-all select-none ${
                  menuOpen ? "ring-2 ring-indigo-500/20 border-indigo-300" : ""
                }`}
              >
                <Avatar id={user.avatar || "avatar-1"} name={user.name} size="w-6 h-6" className="rounded-full" />
                <span className="font-semibold text-slate-800 hidden md:inline truncate max-w-[100px]">
                  {user.name}
                </span>
                {isSuperAdmin && (
                  <span className="hidden md:inline text-[9px] font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-transparent bg-clip-text uppercase tracking-wide">
                    SA
                  </span>
                )}
                <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Elevated Profile Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 top-12 w-64 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2 z-50 select-none">
                  
                  {/* User Profile Header Card */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                    <Avatar id={user.avatar || "avatar-1"} name={user.name} size="w-11 h-11" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-slate-900 text-xs truncate leading-tight">{user.name}</p>
                        {user.verification_status === "Verified" && (
                          <span title="Verified Helper" className="text-emerald-600 shrink-0">
                            <ShieldCheckIcon className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px]">
                        {isSuperAdmin ? (
                          <span className="font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-2 py-0.5 rounded text-[9px] uppercase tracking-wide">
                            Super Admin
                          </span>
                        ) : (
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {user.badge}
                          </span>
                        )}
                        <span className="text-slate-400">· {user.credits} pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Links Group */}
                  <div className="space-y-0.5 pt-1">
                    <Link
                      href={`/profile/${user.id}`}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>My Public Profile</span>
                    </Link>

                    <Link
                      href="/settings"
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4 text-slate-400" />
                      <span>Settings &amp; Verification</span>
                    </Link>

                    <Link
                      href="/about"
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors md:hidden"
                    >
                      <InfoIcon className="w-4 h-4 text-slate-400" />
                      <span>About Community Hub</span>
                    </Link>

                    {/* Mobile: Create Post */}
                    <Link
                      href="/create-post"
                      className="sm:hidden flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors"
                    >
                      <PlusIcon className="w-4 h-4 text-indigo-500" />
                      <span>Create a Post</span>
                    </Link>
                  </div>

                  {/* Divider and Logout */}
                  <div className="pt-1.5 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        auth.logout();
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      Log out
                    </button>
                  </div>

                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-white/60 transition-colors select-none"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all hover:shadow-indigo-200 select-none"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

      </div>
      {mobileOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="md:hidden bg-white border-t border-slate-200 p-4 grid grid-cols-2 gap-2 text-sm">
        <Link href="/" className="p-3 rounded-xl hover:bg-slate-50">Feed</Link>
        <Link href="/about" className="p-3 rounded-xl hover:bg-slate-50">About</Link>
        <Link href="/pricing" className="p-3 rounded-xl hover:bg-slate-50">Plans</Link>
        {user ? <>
          <Link href="/inbox" className="p-3 rounded-xl hover:bg-slate-50">Inbox {pendingCount > 0 && <span className="text-rose-600">({pendingCount} pending)</span>}</Link>
          <Link href="/create-post" className="p-3 rounded-xl text-indigo-600 hover:bg-slate-50">Create a post</Link>
          <Link href="/settings" className="p-3 rounded-xl hover:bg-slate-50">Settings</Link>
          {isAdmin && <Link href="/admin" className="p-3 rounded-xl hover:bg-slate-50">Admin</Link>}
          <button onClick={() => auth.logout()} className="text-left p-3 text-rose-600">Log out</button>
        </> : <><Link href="/login" className="p-3 rounded-xl hover:bg-slate-50">Log in</Link><Link href="/signup" className="p-3 rounded-xl bg-indigo-600 text-white">Sign up</Link></>}
      </nav>}
    </header>
  );
}
