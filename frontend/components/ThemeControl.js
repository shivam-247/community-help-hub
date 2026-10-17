"use client";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";


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
  return <div className="theme-switch" role="group" aria-label="Color theme">
    {[["light", Sun], ["system", Monitor], ["dark", Moon]].map(([value, ThemeIcon]) =>
      <button key={value} type="button" aria-label={`Use ${value} theme`} title={`${value[0].toUpperCase() + value.slice(1)} theme`} aria-pressed={preference === value} onClick={() => { setPreference(value); try { localStorage.setItem("chh-theme", value); } catch {} }}>
        <ThemeIcon aria-hidden="true" className="size-4" />
      </button>
    )}
  </div>;
}
