import Link from "next/link";
import {
  HandHeart,
  Gift,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../components/ui";
import NeighbourhoodScene from "../../components/NeighbourhoodScene";
export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-12 meadow-enter">
      <header className="grid gap-8 items-center md:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="eyebrow mb-5">For the place we call home</p>
          <h1 className="display-title text-4xl sm:text-5xl leading-tight">
            A neighbourhood noticeboard, built on mutual help.
          </h1>
          <p className="mt-5 text-sm text-ink-muted leading-7">
            Community Help Hub helps Indian neighbours lend a hand, share useful
            items and offer skills. No buying, selling or payment between
            neighbours. Just a useful connection, a little closer to home.
          </p>
        </div>
        <div className="rounded-[32px] bg-brand-soft p-4">
          <NeighbourhoodScene />
        </div>
      </header>
      <section
        aria-labelledby="purpose-heading"
        className="grid gap-6 md:grid-cols-[.8fr_1.2fr]"
      >
        <h2 id="purpose-heading" className="section-title">
          Useful things.
          <br />
          Shared locally.
        </h2>
        <div>
          <p className="text-sm leading-7 text-ink-soft">
            This individual college project, developed by Shivam Parmar,
            explores how a simple local noticeboard can support practical mutual
            aid. Societies and neighbourhoods already have people willing to
            help; the board gives them a place to find each other.
          </p>
          <p className="mt-4 text-sm leading-7 text-ink-muted">
            An area, a society name or a familiar landmark is enough. The aim is
            to keep personal data, exchange details and trust signals easy to
            understand.
          </p>
        </div>
      </section>
      <ul className="grid sm:grid-cols-3 gap-4">
        {[
          [
            HandHeart,
            "tone-help",
            "Ask for a hand",
            "A small errand or a task that is easier together.",
          ],
          [
            Gift,
            "tone-give",
            "Pass it on",
            "Useful items that deserve another home nearby.",
          ],
          [
            BookOpen,
            "tone-skill",
            "Share what you know",
            "A skill, a lesson or an hour to help someone learn.",
          ],
        ].map(([Icon, tone, title, body]) => (
          <li key={title} className={`meadow-tile ${tone}`}>
            <Icon aria-hidden="true" className="size-6 mb-6" />
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-3 text-sm leading-6">{body}</p>
          </li>
        ))}
      </ul>
      <section
        className="surface-card p-6 sm:p-8"
        aria-labelledby="safe-heading"
      >
        <span className="tone-icon tone-skill mb-5">
          <ShieldCheck aria-hidden="true" className="size-5" />
        </span>
        <h2 id="safe-heading" className="section-title">
          Keep exchanges safe
        </h2>
        <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 text-sm text-ink-soft leading-7 list-disc pl-5">
          <li>Choose a society gate or common area to meet.</li>
          <li>
            Do not post Aadhaar numbers, passwords, OTPs or banking details.
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
      </section>
      <div className="kindness-banner">
        <div>
          <h2 className="text-xl font-semibold">
            Start with what you can share.
          </h2>
          <p className="mt-3 text-sm text-ink-soft leading-7 max-w-xl">
            Free accounts include five posts a month. Optional Plus and Society
            plans add posting capacity and society tools. Checkout is currently
            a clearly labelled test flow.
          </p>
        </div>
        <Button asChild>
          <Link href="/noticeboard">
            Find help nearby
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
