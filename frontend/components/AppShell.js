import { SafetyProvider } from "./SafetyMenu";
import Link from "next/link";
import Nav from "./Nav";
import RouteGuard from "./RouteGuard";
import { Text } from "../lib/i18n";
export default function AppShell({ children }) {
  return (
    <SafetyProvider>
      <Nav />
      <main
        lang="en"
        tabIndex={-1}
        id="main-content"
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-7 sm:py-10"
      >
        <RouteGuard>{children}</RouteGuard>
      </main>
      <footer className="border-t border-line mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 grid lg:grid-cols-[240px_1fr] gap-6 text-xs text-ink-muted">
          <p>Community Help Hub · A little closer to your neighbors.</p>
          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-5 gap-y-1 lg:justify-end"
          >
            <Link className="min-h-11 inline-flex items-center" href="/about">
              <Text>About the hub</Text>
            </Link>
            <Link
              className="min-h-11 inline-flex items-center"
              href="/references"
            >
              <Text>References</Text>
            </Link>
            <Link
              className="min-h-11 inline-flex items-center"
              href="/settings"
            >
              <Text>Account &amp; safety</Text>
            </Link>
            <Link className="min-h-11 inline-flex items-center" href="/pricing">
              <Text>Plans</Text>
            </Link>
            <Link
              className="min-h-11 inline-flex items-center underline"
              href="/privacy"
            >
              <Text>Privacy</Text>
            </Link>
            <Link
              className="min-h-11 inline-flex items-center underline"
              href="/terms"
            >
              <Text>Terms</Text>
            </Link>
            <Link
              className="min-h-11 inline-flex items-center underline"
              href="/cookies"
            >
              <Text>Cookies</Text>
            </Link>
            <Link
              className="min-h-11 inline-flex items-center underline"
              href="/refunds"
            >
              <Text>Refunds</Text>
            </Link>
            <Link
              className="min-h-11 inline-flex items-center underline"
              href="/contact"
            >
              <Text>Contact</Text>
            </Link>
            <Link
              className="min-h-11 inline-flex items-center underline"
              href="/accessibility"
            >
              <Text>Accessibility</Text>
            </Link>
          </nav>
        </div>
      </footer>
    </SafetyProvider>
  );
}
