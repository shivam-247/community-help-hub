import { Text as UIMessage } from "../../lib/i18n";
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
          <p className="eyebrow mb-5"><UIMessage>For the place we call home</UIMessage></p>
          <h1 className="display-title text-4xl sm:text-5xl leading-tight"><UIMessage>
            A neighbourhood noticeboard, built on mutual help.
          </UIMessage></h1>
          <p className="mt-5 text-sm text-ink-muted leading-7"><UIMessage>
            Community Help Hub helps Indian neighbours lend a hand, share useful
            items and offer skills. No buying, selling or payment between
            neighbours. Just a useful connection, a little closer to home.
          </UIMessage></p>
        </div>
        <div className="rounded-[32px] bg-brand-soft p-4">
          <NeighbourhoodScene />
        </div>
      </header>
      <section
        aria-labelledby="purpose-heading"
        className="grid gap-6 md:grid-cols-[.8fr_1.2fr]"
      >
        <h2 id="purpose-heading" className="section-title"><UIMessage>
          Useful things.
          </UIMessage><br /><UIMessage>
          Shared locally.
        </UIMessage></h2>
        <div>
          <p className="text-sm leading-7 text-ink-soft"><UIMessage>
            This individual college project, developed by Shivam Parmar,
            explores how a simple local noticeboard can support practical mutual
            aid. Societies and neighbourhoods already have people willing to
            help; the board gives them a place to find each other.
          </UIMessage></p>
          <p className="mt-4 text-sm leading-7 text-ink-muted"><UIMessage>
            An area, a society name or a familiar landmark is enough. The aim is
            to keep personal data, exchange details and trust signals easy to
            understand.
          </UIMessage></p>
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
            <h3 className="text-lg font-semibold"><UIMessage>{title}</UIMessage></h3>
            <p className="mt-3 text-sm leading-6"><UIMessage>{body}</UIMessage></p>
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
        <h2 id="safe-heading" className="section-title"><UIMessage>
          Keep exchanges safe
        </UIMessage></h2>
        <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 text-sm text-ink-soft leading-7 list-disc pl-5">
          <li><UIMessage>Choose a society gate or common area to meet.</UIMessage></li>
          <li><UIMessage>
            Do not post Aadhaar numbers, passwords, OTPs or banking details.
          </UIMessage></li>
          <li><UIMessage>
            Check the member’s profile, review history and verification status.
          </UIMessage></li>
          <li><UIMessage>
            Report suspicious posts. Community review is a signal, not a
            guarantee.
          </UIMessage></li>
          <li><UIMessage>Confirm completion only after your exchange is finished.</UIMessage></li>
        </ul>
      </section>
      <div className="kindness-banner">
        <div>
          <h2 className="text-xl font-semibold"><UIMessage>
            Start with what you can share.
          </UIMessage></h2>
          <p className="mt-3 text-sm text-ink-soft leading-7 max-w-xl"><UIMessage>
            Free accounts include five posts a month. Optional Plus and Society
            plans add posting capacity and society tools. Checkout is currently
            a clearly labelled test flow.
          </UIMessage></p>
        </div>
        <Button asChild>
          <Link href="/noticeboard"><UIMessage>
            Find help nearby
            </UIMessage><ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
