import { Text as UIMessage } from "../../lib/i18n";
import PageHeader from "../../components/PageHeader";
import { Mail } from "lucide-react";
import { operator } from "../../lib/legal";
export const metadata = { title: "Contact and operator | Community Help Hub" };
export default function Contact() {
  return (
    <article className="max-w-3xl mx-auto space-y-6 break-anywhere">
      <PageHeader
        eyebrow="A real person, on the other side"
        title="Contact and operator details"
      />
      <p><UIMessage>
        Community Help Hub is a college mutual-aid demonstration maintained by</UIMessage>{" "}
        {operator.name}<UIMessage>. No incorporated company, registration number, tax
        registration or government affiliation is claimed.
      </UIMessage></p>
      <dl className="surface-card space-y-5 p-6 sm:p-8">
        <div>
          <dt className="eyebrow mb-2"><UIMessage>Project maintainer</UIMessage></dt>
          <dd className="text-xl font-semibold">{operator.name}</dd>
        </div>
        <div>
          <dt className="font-semibold"><UIMessage>
            Support, privacy, complaints and copyright reports
          </UIMessage></dt>
          <dd>
            <a
              className="text-brand underline min-h-11 inline-flex items-center gap-2"
              href={`mailto:${operator.email}`}
            >
              <Mail aria-hidden="true" className="size-4 shrink-0" />
              {operator.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-semibold"><UIMessage>Website</UIMessage></dt>
          <dd>community-help-hub.vercel.app</dd>
        </div>
        <div>
          <dt className="font-semibold"><UIMessage>Payment availability</UIMessage></dt>
          <dd><UIMessage>Test checkout only. No real money is collected.</UIMessage></dd>
        </div>
      </dl>
      <h2 className="text-xl font-semibold"><UIMessage>Send only what we need</UIMessage></h2>
      <p><UIMessage>
        For a complaint, include the page or post URL and a short description.
        For privacy requests, write from your account email. For copyright
        reports, identify the work, the allegedly infringing URL and your
        authority to make the request. Never send passwords, OTPs, government-ID
        copies or unnecessary personal information.
      </UIMessage></p>
      <p className="text-ink-muted"><UIMessage>
        This is a college demonstration with mock checkout. Do not send money or
        identity documents. Any future commercial launch needs its own reviewed
        operator disclosures and payment terms.
      </UIMessage></p>
    </article>
  );
}
