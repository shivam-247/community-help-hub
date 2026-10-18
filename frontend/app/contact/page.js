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
      <p>
        Community Help Hub is a college mutual-aid demonstration maintained by{" "}
        {operator.name}. No incorporated company, registration number, tax
        registration or government affiliation is claimed.
      </p>
      <dl className="surface-card space-y-5 p-6 sm:p-8">
        <div>
          <dt className="eyebrow mb-2">Project maintainer</dt>
          <dd className="text-xl font-semibold">{operator.name}</dd>
        </div>
        <div>
          <dt className="font-semibold">
            Support, privacy, complaints and copyright reports
          </dt>
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
          <dt className="font-semibold">Website</dt>
          <dd>community-help-hub.vercel.app</dd>
        </div>
        <div>
          <dt className="font-semibold">Payment availability</dt>
          <dd>Test checkout only. No real money is collected.</dd>
        </div>
      </dl>
      <h2 className="text-xl font-semibold">Send only what we need</h2>
      <p>
        For a complaint, include the page or post URL and a short description.
        For privacy requests, write from your account email. For copyright
        reports, identify the work, the allegedly infringing URL and your
        authority to make the request. Never send passwords, OTPs, government-ID
        copies or unnecessary personal information.
      </p>
      <p className="text-ink-muted">
        This is a college demonstration with mock checkout. Do not send money or
        identity documents. Any future commercial launch needs its own reviewed
        operator disclosures and payment terms.
      </p>
    </article>
  );
}
