import { operator } from "../../lib/legal";
export const metadata = { title: "Contact and operator | Community Help Hub" };
export default function Contact() {
  return (
    <article className="max-w-3xl mx-auto space-y-6 break-anywhere">
      <h1 className="text-3xl font-semibold">Contact and operator details</h1>
      <p>
        Community Help Hub is a college mutual-aid demonstration maintained by{" "}
        {operator.name}. No incorporated company, registration number, tax
        registration or government affiliation is claimed.
      </p>
      <dl className="space-y-4 border border-line rounded-xl p-6">
        <div>
          <dt className="font-semibold">Project maintainer</dt>
          <dd>{operator.name}</dd>
        </div>
        <div>
          <dt className="font-semibold">
            Support, privacy, complaints and copyright reports
          </dt>
          <dd>
            <a
              className="underline min-h-11 inline-flex items-center"
              href={`mailto:${operator.email}`}
            >
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
