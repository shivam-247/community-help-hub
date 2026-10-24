import { Text as UIMessage } from "../../lib/i18n";
import PageHeader from "../../components/PageHeader";
import { references } from "../../lib/references";
export const metadata = {
  title: "References & Bibliography | Community Help Hub",
  description:
    "Implementation references for the Community Help Hub college project.",
};
export default function References() {
  return (
    <article className="max-w-3xl mx-auto space-y-7">
      <PageHeader
        eyebrow="Behind the project"
        title="References & bibliography"
        description="Sources for the platform’s implementation, security and accessibility, formatted as numbered references."
      />
      <section className="rounded-xl border border-line bg-surface p-5 space-y-3">
        <h2 className="text-lg font-semibold"><UIMessage>Research paper references</UIMessage></h2>
        <p className="text-sm text-ink-muted leading-relaxed"><UIMessage>
          The academic paper’s bibliography has not been supplied with this
          demo. The technical sources below are not presented as its cited
          research papers.
        </UIMessage></p>
      </section>
      <ol className="space-y-5">
        {references.map((r, i) => (
          <li
            key={r.url}
            className="surface-card p-5 flex gap-4 text-sm leading-7 break-anywhere"
          >
            <span className="text-brand font-semibold shrink-0">[{i + 1}]</span>
            <div>
              {r.author}, “{r.title},” n.d. [Online]. Available:{" "}
              <a
                className="underline text-brand min-h-11 inline-flex items-center"
                href={r.url}
              >
                {r.url}
              </a>
              . [Accessed: 17-Oct-2026].
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
