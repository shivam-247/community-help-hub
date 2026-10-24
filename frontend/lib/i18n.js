"use client";
import {
  Children,
  createElement,
  forwardRef,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import en from "./messages/en.json";
import gu from "./messages/gu.json";
import hi from "./messages/hi.json";
const catalogues = { en, gu, hi };
const LanguageContext = createContext({
  language: "en",
  t: (value) => value,
  setLanguage: () => {},
});
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("en");
  useEffect(() => {
    const value = document.cookie
      .split("; ")
      .find((c) => c.startsWith("chh-language="))
      ?.split("=")[1];
    if (catalogues[value]) setLanguage(value);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  function choose(value) {
    if (!catalogues[value]) return;
    setLanguage(value);
    document.cookie = `chh-language=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }
  const t = (value, parameters = {}) => {
    if (typeof value !== "string") return value;
    const translated = catalogues[language][value.trim().replace(/\s+/g, " ")];
    if (translated === undefined) return value;
    const message = translated.replace(/\{(\w+)\}/g, (match, key) => String(parameters[key] ?? match));
    return `${/^\s/.test(value) ? " " : ""}${message}${/\s$/.test(value) ? " " : ""}`;
  };
  return (
    <LanguageContext.Provider value={{ language, setLanguage: choose, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
export const useLanguage = () => useContext(LanguageContext);
export function Text({ children }) {
  const { t } = useLanguage();
  return Children.map(children, child => typeof child === "string" ? t(child) : child);
}
// Localize only fixed interface attributes; input values and user content stay untouched.
export const LocalizedElement = forwardRef(function LocalizedElement({ as, ...props }, ref) {
  const { t } = useLanguage();
  const translated = { ...props, ref };
  for (const key of ["placeholder", "title", "alt", "aria-label"]) {
    if (typeof props[key] === "string") translated[key] = t(props[key]);
  }
  return createElement(as, translated);
});
export function LanguageSelect() {
  const { language, setLanguage } = useLanguage();
  return (
    <select
      className="language-select"
      aria-label="Language / ભાષા / भाषा"
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
    >
      <option value="en">EN</option>
      <option value="gu">ગુ</option>
      <option value="hi">हि</option>
    </select>
  );
}
