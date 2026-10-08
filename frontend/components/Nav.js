"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Icon } from "./ui";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import ThemeControl from "./ThemeControl";

export default function Nav() {
  const auth = useAuth();
  const user = auth?.user;
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [logoutError, setLogoutError] = useState("");
  const accountRef = useRef(null);
  const mobileTrigger = useRef(null);
  const headerRef = useRef(null);
  const isAdmin = ["admin", "super_admin"].includes(user?.role);
  useEffect(() => { setOpen(false); if (accountRef.current) accountRef.current.open = false; }, [path]);
  useEffect(() => {
    const dismiss = e => {
      if (e.key === "Escape") { if (open) mobileTrigger.current?.focus(); setOpen(false); if (accountRef.current?.open) { accountRef.current.open = false; accountRef.current.querySelector("summary")?.focus(); } }
    };
    const outside = e => { if (!headerRef.current?.contains(e.target)) { setOpen(false); if (accountRef.current) accountRef.current.open = false; } };
    document.addEventListener("keydown", dismiss); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", dismiss); document.removeEventListener("pointerdown", outside); };
  }, [open]);
  useEffect(() => {
    let active = true; setPendingCount(0);
    if (!user) return;
    const poll = async () => { if (document.hidden) return; try { const data = await api("/inbox/incoming", { auth: true }); if (active) setPendingCount(data.filter(x => x.status === "Pending").length); } catch {} };
    poll(); const timer = setInterval(poll, 30000); window.addEventListener("chh-inbox-updated", poll);
    return () => { active = false; clearInterval(timer); window.removeEventListener("chh-inbox-updated", poll); };
  }, [user?.id]);
  const logout = async () => { try { await auth.logout(); setOpen(false); setLogoutError(""); } catch { setLogoutError("Could not sign out. Please try again."); } };
  const [unread, setUnread] = useState(0);
  useEffect(() => { if (!user) {setUnread(0); return;} let active=true; const load=async()=>{try{const rows=await api("/notifications",{auth:true});if(active)setUnread(rows.filter(n=>!n.read).length)}catch{}};load();const timer=setInterval(load,30000);return()=>{active=false;clearInterval(timer)}},[user?.id]);
  const links = [{ href: "/noticeboard", name: "Noticeboard" }, { href: "/pricing", name: "Plans" }, ...(user ? [{ href: "/notifications", name: `Updates${unread ? ` (${unread})` : ""}` }, { href: "/inbox", name: `Inbox${pendingCount ? ` (${pendingCount})` : ""}` }] : []),  ...(isAdmin ? [{ href: "/admin", name: "Admin" }] : [])];
  const navLinks = links.map(x => <Link key={x.href} href={x.href} aria-current={(x.href === "/" ? path === "/" : path.startsWith(x.href)) ? "page" : undefined} className="app-link">{x.name}</Link>);
  return <header ref={headerRef} className="app-header sticky top-0 z-40">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-18 flex items-center justify-between gap-2">
      <Link href="/" aria-label="Community Help Hub home" className="flex items-center gap-2.5 shrink-0">
        <span className="bg-brand-solid text-on-brand w-9 h-9 rounded-lg inline-flex items-center justify-center"><Icon name="handshake" decorative /></span>
        <span className="font-semibold text-sm sm:text-base tracking-tight"><span className="hidden sm:inline">Community </span>Help Hub</span>
      </Link>
      <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-1">{navLinks}</nav>
      <div className="flex items-center gap-2">
        <ThemeControl />
        {user ? <details ref={accountRef} className="relative hidden lg:block">
          <summary className="app-link cursor-pointer list-none border border-line"><Icon name="user" decorative /><span className="max-w-24 truncate">{user.name.split(" ")[0]}</span><Icon name="chevron-down" decorative size="sm" /></summary>
          <div className="nav-panel absolute right-0 top-full mt-2 w-64 p-2">
            <div className="p-3 border-b border-line mb-1"><p className="text-sm font-semibold">{user.name}</p><p className="text-xs text-ink-muted break-all mt-1">{user.email}</p><p className="text-xs text-brand mt-2">{user.role === "super_admin" ? "Super administrator" : "Community member"}</p></div>
            <Link className="app-link w-full" href={`/profile/${user.id}`}>My profile</Link><Link className="app-link w-full" href="/settings">Account &amp; safety</Link>
            <Button variant="ghost" onClick={logout} className="w-full justify-start text-danger">Sign out</Button>
            {logoutError && <p role="alert" className="text-xs text-danger px-3">{logoutError}</p>}
          </div>
        </details> : <Link href="/login" className="app-link hidden lg:inline-flex">Sign in</Link>}
        <Button asChild className="hidden lg:inline-flex product-button"><Link href={user ? "/create-post" : "/signup"}><Icon name={user ? "plus" : "arrow-right"} decorative />{user ? "Create post" : "Join the hub"}</Link></Button>
        <Button ref={mobileTrigger} variant="outline" size="icon" className="lg:hidden product-button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}><Icon name={open ? "x" : "menu"} decorative /></Button>
      </div>
    </div>
    {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="lg:hidden border-t border-line px-4 py-3 grid grid-cols-2 gap-1">
      {navLinks}{user ? <><Link href="/create-post" className="app-link text-brand">Create post</Link><Link href="/settings" className="app-link">Account &amp; safety</Link><Button onClick={logout} variant="ghost" className="justify-start text-danger">Sign out</Button></> : <><Link href="/login" className="app-link">Sign in</Link><Link href="/signup" className="app-link text-brand">Join the hub</Link></>}
      {logoutError && <p role="alert" className="col-span-2 text-sm text-danger">{logoutError}</p>}
    </nav>}
  </header>;
}
