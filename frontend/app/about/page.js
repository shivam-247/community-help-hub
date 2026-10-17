import Link from "next/link";
import { Card, Button } from "../../components/ui";
export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-7">
      <h1 className="text-4xl font-semibold">
        A neighbourhood noticeboard, built on mutual help.
      </h1>
      <p className="text-ink-muted leading-relaxed">
        Community Help Hub helps Indian neighbours lend a hand, share useful
        items, and offer skills. There is no buying, selling, or payment between
        neighbours. This individual college project, developed by Shivam Parmar,
        explores how a simple local noticeboard can support practical mutual
        aid. The aim is to help societies share useful items and skills while
        keeping personal data and trust signals clear.
      </p>
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Keep exchanges safe</h2>
        <ul className="list-disc pl-5 text-sm text-ink-muted space-y-3">
          <li>Choose a society gate or common area to meet.</li>
          <li>
            Do not post Aadhaar numbers, passwords, OTPs, or banking details.
          </li>
          <li>
            Check the member’s profile, review history and verification status.
          </li>
          <li>
            Report suspicious posts. Community review is a signal, not a
            guarantee.
          </li>
          <li>Confirm completion only after your exchange is finished.</li>
        </ul>
      </Card>
      <p className="text-sm text-ink-muted">
        Free accounts include five posts a month. Optional Plus and Society
        plans support additional posting and society tools. Checkout is
        currently a clearly labelled test flow.
      </p>
      <Button asChild>
        <Link href="/noticeboard">Find help nearby</Link>
      </Button>
    </div>
  );
}
