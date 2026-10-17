import Link from "next/link";
import {
  HandHeart,
  ArrowRight,
  MapPin,
  ShieldCheck,
  MessageCircle,
  Check,
  BookOpen,
  Wrench,
} from "lucide-react";
import { Button, Badge, Card } from "../components/ui";
const steps = [
  {
    icon: MapPin,
    title: "Start with your area",
    body: "Choose Gota, Satellite, or your own neighbourhood. Find requests you can actually reach.",
  },
  {
    icon: MessageCircle,
    title: "Agree on the details",
    body: "Respond to a post. Once accepted, use a private conversation to arrange a time and a public meeting place.",
  },
  {
    icon: HandHeart,
    title: "Help, then close the loop",
    body: "Both neighbours confirm the exchange. Earn community credits and build a reputation for showing up.",
  },
];
const faqs = [
  [
    "Does helping involve money?",
    "No. Requests, giveaways, and skill sharing are free. Optional plans support extra posting and society tools; they never turn an exchange into a sale.",
  ],
  [
    "Can I write in Hindi or Gujarati?",
    "Yes. Include your area, what you need, and when you can meet, in the language your neighbours use.",
  ],
  [
    "What does verified mean?",
    "A community administrator has reviewed the member’s submitted evidence. Email and phone checks are shown separately in the Trust Center. Verification is a useful signal, not a guarantee.",
  ],
  [
    "How do society boards work?",
    "A Society plan lets an administrator create a private board. Members join with an invite code and only members can read its posts.",
  ],
  [
    "What should I avoid sharing?",
    "Never post an Aadhaar number, passwords, OTPs, or financial details. Use a society reference for verification and arrange exchanges at a common area.",
  ],
];
export default function LandingPage() {
  return (
    <div className="space-y-20 sm:space-y-24">
      <section className="grid md:grid-cols-2 gap-10 items-center pt-4 sm:pt-10">
        <div className="space-y-6">
          <Badge variant="outline">
            <MapPin className="size-3.5" />
            Made for Indian neighbourhoods
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08]">
            A little help.
            <br />
            <span className="text-brand">A closer neighbourhood.</span>
          </h1>
          <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
            The ladder next door. Books someone has outgrown. An hour of help
            when you need it. Your neighbourhood has more to share than you
            think.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/noticeboard">
                Explore the noticeboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Join your neighbours</Link>
            </Button>
          </div>
          <p className="text-xs text-ink-muted">
            No buying or selling. Just neighbours helping neighbours.
          </p>
        </div>
        <div className="bg-surface-muted rounded-2xl p-5 sm:p-8 border border-line">
          <div className="flex justify-between items-center mb-5">
            <p className="text-sm font-semibold">Around the neighbourhood</p>
            <span className="text-xs text-ink-muted">Illustration</span>
          </div>
          <div className="space-y-3">
            {[
              [
                BookOpen,
                "Books looking for their next reader",
                "Giveaway · Gota, 382481",
              ],
              [
                Wrench,
                "A ladder for a small Sunday repair",
                "Need help · Satellite, 380015",
              ],
              [
                HandHeart,
                "ગુજરાતી વાંચવામાં થોડી મદદ",
                "Skill offer · Your society",
              ],
            ].map(([Icon, title, meta]) => (
              <Card key={title} className="p-4 sm:p-5 flex gap-4">
                <span className="bg-brand-soft text-brand rounded-lg size-11 shrink-0 flex items-center justify-center">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-sm leading-relaxed">{title}</p>
                  <p className="text-xs text-ink-muted mt-1">{meta}</p>
                </div>
              </Card>
            ))}
          </div>
          <p className="flex gap-2 items-center text-xs text-ink-muted mt-5">
            <ShieldCheck className="size-4 text-brand" />
            Community review. Private conversations.
          </p>
        </div>
      </section>
      <section>
        <p className="text-xs uppercase tracking-widest text-brand font-semibold">
          How it works
        </p>
        <h2 className="text-3xl font-semibold mt-3 mb-8">
          Small gestures, real connections.
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="border-t border-line pt-6">
              <div className="flex items-center justify-between mb-5">
                <Icon className="size-6 text-brand" />
                <span className="text-xs tabular-nums text-ink-muted">
                  0{i + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed mt-3">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="grid md:grid-cols-2 gap-8 p-6 sm:p-10 bg-brand-soft border border-line rounded-xl">
        <div>
          <ShieldCheck className="size-8 text-brand mb-5" />
          <h2 className="text-3xl font-semibold">
            Trust grows with every exchange.
          </h2>
          <p className="text-sm text-ink-soft leading-relaxed mt-4">
            Community review, spam filtering, and earned badges help you make an
            informed choice. Keep personal documents private and meet at your
            society gate or a common area.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/settings?tab=trust">
              Visit the Trust Center
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <ul className="space-y-5 self-center">
          {[
            "Separate email, phone, and community verification steps",
            "Report a post to the moderation team",
            "Credits awarded after both people confirm completion",
            "Contact details shared only with your permission",
          ].map((s) => (
            <li key={s} className="flex gap-3 text-sm text-ink-soft">
              <Check className="size-5 text-brand shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </section>
      <section className="text-center max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-brand font-semibold">
          Plans that keep help accessible
        </p>
        <h2 className="text-3xl font-semibold mt-3">
          Start free. Grow with your community.
        </h2>
        <p className="text-sm text-ink-muted leading-relaxed mt-4">
          Free includes 5 posts a month. Plus adds unlimited posting and
          optional email alerts. Society gives your residents a shared private
          board and simple analytics.
        </p>
        <div className="flex justify-center flex-wrap gap-4 mt-6">
          <Badge variant="outline">Free · ₹0</Badge>
          <Badge>Plus · ₹99/month</Badge>
          <Badge variant="outline">Society · ₹299/month</Badge>
        </div>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/pricing">
            Compare plans
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
      <section className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-semibold mb-8">
          A few things you might be wondering.
        </h2>
        <div className="border-t border-line">
          {faqs.map(([q, a]) => (
            <details key={q} className="border-b border-line py-2">
              <summary className="cursor-pointer font-medium text-sm py-3 pr-3">
                {q}
              </summary>
              <p className="text-sm text-ink-muted leading-relaxed pb-5 max-w-2xl">
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
