import Link from "next/link";
import { FileText } from "lucide-react";
import { policies, POLICY_VERSION, operator } from "../lib/legal";
export default function PolicyPage({ kind }) {
  const policy = policies[kind];
  return (
    <article className="max-w-5xl mx-auto break-anywhere meadow-enter">
      <header className="max-w-3xl space-y-5 mb-8">
        <span className="tone-icon tone-skill">
          <FileText aria-hidden="true" className="size-5" />
        </span>
        <p className="eyebrow">Clear information. In one place.</p>
        <h1 className="display-title text-4xl sm:text-5xl">{policy.title}</h1>
        <p className="text-xs text-ink-muted">Last updated: {POLICY_VERSION}</p>
        <p className="text-sm sm:text-base text-ink-soft leading-7">
          {policy.intro}
        </p>
      </header>
      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
        <nav
          aria-label="On this page"
          className="surface-card p-5 lg:sticky lg:top-28"
        >
          <p className="eyebrow mb-3">On this page</p>
          <ul>
            {policy.sections.map(([title], i) => (
              <li key={title}>
                <a
                  className="text-sm text-ink-soft hover:text-brand inline-flex items-center min-h-11 py-2"
                  href={`#section-${i}`}
                >
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="policy-layout space-y-8">
          {policy.sections.map(([title, body], i) => (
            <section
              id={`section-${i}`}
              key={title}
              className="space-y-3 scroll-mt-28"
            >
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-ink-soft leading-7">{body}</p>
            </section>
          ))}
          <p className="border-t border-line pt-5 text-sm leading-7">
            Questions?{" "}
            <a
              className="underline text-brand"
              href={`mailto:${operator.email}`}
            >
              Email {operator.name}
            </a>
            .{" "}
            <Link className="underline text-brand" href="/contact">
              Operator and contact details
            </Link>
            .
          </p>
        </div>
      </div>
    </article>
  );
}
