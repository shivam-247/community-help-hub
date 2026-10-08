"use client";
import { useEffect, useState } from "react";
import { Icon } from "./ui";


export default function ThemeControl() {
  const [preference, setPreference] = useState("system");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let stored = "system";
    try { stored = localStorage.getItem("chh-theme") || "system"; } catch {}
    if (!["light", "dark", "system"].includes(stored)) stored = "system";
    setPreference(stored); setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = preference === "system" ? (media.matches ? "dark" : "light") : preference; };
    apply(); media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference, ready]);
  return <label className="flex items-center gap-1 text-ink-muted">
    <Icon name={preference === "dark" ? "moon" : "sun"} decorative className="hidden sm:inline-flex" />
    <span className="sr-only">Color theme</span>
    <select aria-label="Color theme" value={preference} onChange={e => { setPreference(e.target.value); try { localStorage.setItem("chh-theme", e.target.value); } catch {} }} className="rounded-lg border border-line px-2 text-xs! max-w-24">
      <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
    </select>
  </label>;
}
