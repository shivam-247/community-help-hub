import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/600.css";
import "@fontsource/noto-serif/600.css";
import "@fontsource/noto-sans-gujarati/400.css";
import "@fontsource/noto-sans-devanagari/400.css";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import Nav from "../components/Nav";
import RouteGuard from "../components/RouteGuard";
import { ToastProvider } from "../components/ToastProvider";
import { themeScript } from "../lib/theme-script";
import Link from "next/link";

export const metadata = { title: "Community Help Hub", description: "Ask for help, share what you can, and get to know your neighborhood." };
export default function RootLayout({ children }) {
  return <html lang="en" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
    <body className="min-h-screen flex flex-col antialiased">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <AuthProvider><ToastProvider>
        <Nav />
        <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10"><RouteGuard>{children}</RouteGuard></main>
        <footer className="border-t border-line mt-8"><div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-xs text-ink-muted">
          <p>Community Help Hub · A little closer to your neighbors.</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-3"><Link className="min-h-11 inline-flex items-center" href="/about">About the hub</Link><Link className="min-h-11 inline-flex items-center" href="/settings">Account &amp; safety</Link><Link className="min-h-11 inline-flex items-center" href="/pricing">Plans</Link></nav>
        </div></footer>
      </ToastProvider></AuthProvider>
    </body>
  </html>;
}
