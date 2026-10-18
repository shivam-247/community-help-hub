import { SafetyProvider } from "./SafetyMenu";
import Link from "next/link";
import Nav from "./Nav";
import Brand from "./Brand";
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
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 pt-6 pb-8 sm:pt-9 sm:pb-12"
      >
        <RouteGuard>{children}</RouteGuard>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <Link
              href="/"
              aria-label="Community Help Hub home"
              className="inline-flex min-h-11 items-center"
            >
              <Brand />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-ink-muted">
              A little help makes a neighbourhood feel more like home.
            </p>
            <p className="mt-4 text-[11px] text-ink-muted">
              An independent college project by Shivam Parmar.
            </p>
          </div>
          <nav aria-label="Footer" className="footer-links">
            {[
              ["/about", "About the hub"],
              ["/noticeboard", "Feed"],
              ["/settings", "Account & safety"],
              ["/pricing", "Plans"],
              ["/references", "References"],
              ["/contact", "Contact"],
              ["/privacy", "Privacy"],
              ["/terms", "Terms"],
              ["/cookies", "Cookies"],
              ["/refunds", "Refunds"],
              ["/accessibility", "Accessibility"],
            ].map(([href, label]) => (
              <Link key={href} href={href}>
                <Text>{label}</Text>
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </SafetyProvider>
  );
}
