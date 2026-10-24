import { Text as UIMessage, LocalizedElement as UIElement } from "../lib/i18n";
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
        <p className="text-xs text-ink-muted"><UIMessage>Policies are currently published in English.</UIMessage></p>
        <p className="eyebrow"><UIMessage>Clear information. In one place.</UIMessage></p>
        <h1 className="display-title text-4xl sm:text-5xl"><UIMessage>{policy.title}</UIMessage></h1>
        <p className="text-xs text-ink-muted"><UIMessage>Last updated: </UIMessage>{POLICY_VERSION}</p>
        <p className="text-sm sm:text-base text-ink-soft leading-7">
          {policy.intro}
        </p>
      </header>
      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
        <UIElement as="nav"
          aria-label="On this page"
          className="surface-card p-5 lg:sticky lg:top-28"
        >
          <p className="eyebrow mb-3"><UIMessage>On this page</UIMessage></p>
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
        </UIElement>
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
          <p className="border-t border-line pt-5 text-sm leading-7"><UIMessage>
            Questions?</UIMessage>{" "}
            <a
              className="underline text-brand"
              href={`mailto:${operator.email}`}
            ><UIMessage>
              Email </UIMessage>{operator.name}
            </a>
            .{" "}
            <Link className="underline text-brand" href="/contact"><UIMessage>
              Operator and contact details
            </UIMessage></Link>
            .
          </p>
        </div>
      </div>
    </article>
  );
}
