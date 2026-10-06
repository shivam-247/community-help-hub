import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import Nav from "../components/Nav";
import RouteGuard from "../components/RouteGuard";
import { ToastProvider } from "../components/ToastProvider";

export const metadata = {
  title: "Community Help Hub - Hyper-local Mutual Aid & Noticeboard",
  description: "Real neighborhood help, tracked properly — no more lost WhatsApp threads.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <AuthProvider>
          <ToastProvider>
          <Nav />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
            <RouteGuard>{children}</RouteGuard>
          </main>
          <footer className="border-t border-slate-200/80 bg-white/70 py-8 text-center text-xs text-slate-500 space-y-2 select-none">
            <div className="flex items-center justify-center gap-4 font-medium">
              <a href="/" className="hover:text-indigo-600 transition-colors">Noticeboard Feed</a>
              <span>·</span>
              <a href="/about" className="hover:text-indigo-600 transition-colors">About CHH &amp; Mission</a>
              <span>·</span>
              <a href="/settings" className="hover:text-indigo-600 transition-colors">Trust &amp; Verification</a>
            </div>
            <p className="text-slate-400">Community Help Hub (CHH) &copy; {new Date().getFullYear()} · Trust &amp; Mutual Aid for Neighborhoods</p>
          </footer>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
