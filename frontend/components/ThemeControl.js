"use client";
import { LocalizedElement as UIElement } from "../lib/i18n";

import { useEffect, useState } from "react";
import { useLanguage } from "../lib/i18n";
import { Moon, Sun } from "lucide-react";

export default function ThemeControl() {
  const { t } = useLanguage();
  const [preference, setPreference] = useState("light");
  useEffect(() => {
    setPreference(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function choose(value) {
    setPreference(value);
    document.documentElement.dataset.theme = value;
    try { localStorage.setItem("chh-theme", value); } catch {}
  }

  return (
    <UIElement as="div" className="theme-switch" role="group" aria-label="Color theme">
      {[["light", Sun], ["dark", Moon]].map(([value, ThemeIcon]) => (
        <button key={value} type="button" aria-label={t(`Use ${value} theme`)}
          title={t(`${value[0].toUpperCase() + value.slice(1)} theme`)}
          aria-pressed={preference === value} onClick={() => choose(value)}>
          <ThemeIcon aria-hidden="true" className="size-4" />
        </button>
      ))}
    </UIElement>
  );
}
