"use client";
import {
  Children,
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
  const t = (value) =>
    typeof value === "string"
      ? catalogues[language][value.trim().replace(/\s+/g, " ")] || value
      : value;
  return (
    <LanguageContext.Provider value={{ language, setLanguage: choose, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
export const useLanguage = () => useContext(LanguageContext);
export function Text({ children }) {
  const { t, language } = useLanguage();
  return Children.map(children, (child) => {
    if (typeof child !== "string") return child;
    const translated = t(child);
    const translatedLanguage = /[\u0a80-\u0aff]/.test(translated)
      ? "gu"
      : /[\u0900-\u097f]/.test(translated)
        ? "hi"
        : "en";
    return language === "en" ? (
      translated
    ) : (
      <span lang={translatedLanguage}>{translated}</span>
    );
  });
}
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
