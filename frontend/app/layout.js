import localFont from "next/font/local";
const neighbourFont = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../node_modules/@fontsource/noto-sans/files/noto-sans-latin-600-normal.woff2",
      weight: "600",
    },
  ],
  variable: "--font-neighbour",
  display: "swap",
});
const gujaratiFont = localFont({
  src: "../node_modules/@fontsource/noto-sans-gujarati/files/noto-sans-gujarati-gujarati-400-normal.woff2",
  variable: "--font-gu",
  display: "swap",
  preload: false,
});
const hindiFont = localFont({
  src: "../node_modules/@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff2",
  variable: "--font-hi",
  display: "swap",
  preload: false,
});
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import AppShell from "../components/AppShell";
import { LanguageProvider } from "../lib/i18n";
import { ToastProvider } from "../components/ToastProvider";
import { themeScript } from "../lib/theme-script";

export const metadata = {
  title: "Community Help Hub",
  description:
    "Ask for help, share what you can, and get to know your neighborhood.",
};
export default function RootLayout({ children }) {
  return (
    <html
      className={`${neighbourFont.variable} ${gujaratiFont.variable} ${hindiFont.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen flex flex-col antialiased app-body">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
