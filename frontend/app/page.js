"use client";
import { Text as UIMessage, LocalizedElement as UIElement } from "../lib/i18n";


import { useLanguage } from "../lib/i18n";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import PostCard from "../components/PostCard";
import { PostCardSkeleton } from "../components/Skeleton";
import NeighbourhoodScene from "../components/NeighbourhoodScene";
import {
  HandHeart,
  Gift,
  BookOpen,
  ArrowUpRight,
  ArrowRight,
  MapPin,
  ShieldCheck,
  Plus,
  MessageCircle,
  HeartHandshake,
} from "lucide-react";

const CATEGORIES = [
  {
    category: "Help Requests",
    title: "A helping hand",
    label: "Help requests",
    appearance: "tone-help",
    icon: HandHeart,
    description: "Groceries, a small errand, or an extra pair of hands.",
  },
  {
    category: "Donations & Giveaways",
    title: "Something to share",
    label: "Giveaways",
    appearance: "tone-give",
    icon: Gift,
    description: "Give useful things a new home, a few streets away.",
  },
  {
    category: "Skill Offers",
    title: "A skill to offer",
    label: "Skills",
    appearance: "tone-skill",
    icon: BookOpen,
    description: "Share an hour, teach a skill, or learn together.",
  },
];

// Live, bounded public queries keep counts consistent with the noticeboard.
export default function LandingPage() {
  const { t } = useLanguage();
  const [board, setBoard] = useState(null);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countLoading, setCountLoading] = useState(true);
  const [countError, setCountError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setCountError(false);
    const paths = [
      "/posts/feed?page=1&page_size=3",
      ...CATEGORIES.map(
        ({ category }) =>
          `/posts/feed?${new URLSearchParams({ category, page: "1", page_size: "1" })}`,
      ),
    ];
    setCountLoading(true);
    api(paths[0], { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) {
          setBoard(value);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setBoard(null);
          setError(error.message);
          setLoading(false);
        }
      });
    Promise.allSettled(
      paths.slice(1).map((path) => api(path, { signal: controller.signal })),
    ).then((results) => {
      if (controller.signal.aborted) return;
      const totals = {};
      CATEGORIES.forEach(({ category }, index) => {
        if (results[index].status === "fulfilled")
          totals[category] = results[index].value.total;
      });
      setCounts(totals);
      setCountError(results.some((result) => result.status === "rejected"));
      setCountLoading(false);
    });
    return () => controller.abort();
  }, [attempt]);

  const stats = [
    { value: board?.total, label: "Notices on the board" },
    { value: counts["Help Requests"], label: "Help requests" },
    { value: counts["Skill Offers"], label: "Skills to share" },
  ];
  return (
    <div className="home-layout meadow-enter">
      <section aria-labelledby="meadow-heading" className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow mb-5"><UIMessage>A little closer to home</UIMessage></p>
          <h1 id="meadow-heading" className="hero-title display-title"><UIMessage>
            A little help.
            </UIMessage><br />A <em><UIMessage>brighter</UIMessage></em><UIMessage> neighbourhood.
          </UIMessage></h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-ink-soft sm:text-base"><UIMessage>
            A spare tool. A lift to the clinic. An hour of your time. Find a
            helping hand, or be one, right where you live.
          </UIMessage></p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/create-post?type=Need%20help"
              className="meadow-primary"
            ><UIMessage>
              Ask for help</UIMessage>{" "}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/create-post?type=Offer%20help"
              className="meadow-secondary"
            ><UIMessage>
              Offer help </UIMessage><HandHeart aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <p className="hero-caption mt-5">
            <HeartHandshake aria-hidden="true" /><UIMessage>
            No buying or selling. Just being neighbours.
          </UIMessage></p>
          <Link
            href="/noticeboard"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand"
          ><UIMessage>
            Explore the noticeboard</UIMessage>{" "}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <div className="hero-visual">
          <span className="hero-visual-label">
            <MapPin aria-hidden="true" className="size-3.5" /><UIMessage>
            Every society has a helping hand.
          </UIMessage></span>
          <NeighbourhoodScene />
          <UIElement as="div"
            className="hero-board"
            aria-label="A look at the noticeboard"
            aria-busy={loading}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-semibold"><UIMessage>On the noticeboard</UIMessage></p>
              <span className="text-[10px] text-ink-muted"><UIMessage>
                Local connections
              </UIMessage></span>
            </div>
            {loading ? (
              <div className="py-5 text-sm text-ink-muted" role="status"><UIMessage>
                Finding nearby notices…
              </UIMessage></div>
            ) : error ? (
              <p className="py-4 text-xs text-ink-muted"><UIMessage>
                The board is taking a moment. You can retry below.
              </UIMessage></p>
            ) : board?.items.length ? (
              board.items.slice(0, 2).map((post) => {
                const item =
                  CATEGORIES.find((c) => c.category === post.category) ||
                  CATEGORIES[0];
                const Icon = item.icon;
                return (
                  <Link
                    key={post.id}
                    href={`/post/${post.id}`}
                    className={`hero-board-link ${item.appearance}`}
                  >
                    <span className="tone-icon">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs font-semibold">
                        {post.title}
                      </strong>
                      <span className="mt-1 block truncate text-[11px] text-ink-muted">
                        {post.locality}
                        <UIMessage>{post.is_demo ? " · Sample notice" : ""}</UIMessage>
                      </span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-ink-muted"
                    />
                  </Link>
                );
              })
            ) : (
              <p className="py-4 text-xs text-ink-muted"><UIMessage>
                Your neighbourhood starts with the first notice.
              </UIMessage></p>
            )}
          </UIElement>
        </div>
      </section>

      <UIElement as="section" aria-label="Public noticeboard activity" className="-mt-4">
        <ul className="activity-strip" aria-busy={loading || countLoading}>
          {stats.map(({ value, label }) => (
            <li key={label}>
              <strong className="tabular-nums">
                {value ?? (loading || countLoading ? "…" : "—")}
              </strong>
              <p className="mt-2 text-[11px] leading-5 text-ink-muted sm:text-sm">
                <UIMessage>{label}</UIMessage>
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-[10px] text-ink-muted sm:text-xs"><UIMessage>
          Public board totals. Sample notices are clearly labelled.
        </UIMessage></p>
        {countError && (
          <p role="status" className="mt-2 text-center text-xs text-ink-muted"><UIMessage>
            Some counts are unavailable.</UIMessage>{" "}
            <button
              className="min-h-11 px-2 underline"
              type="button"
              onClick={() => setAttempt((v) => v + 1)}
            ><UIMessage>
              Retry counts
            </UIMessage></button>
          </p>
        )}
      </UIElement>

      <section aria-labelledby="ways-heading">
        <div className="mb-6">
          <p className="eyebrow mb-3"><UIMessage>Small things. Real difference.</UIMessage></p>
          <h2 id="ways-heading" className="section-title"><UIMessage>
            What can we do for each other?
          </UIMessage></h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3">
          {CATEGORIES.map(
            ({
              category,
              title,
              label,
              description,
              appearance,
              icon: Icon,
            }) => (
              <li key={category}>
                <Link
                  href={`/noticeboard?${new URLSearchParams({ category })}`}
                  className={`meadow-tile h-full ${appearance}`}
                >
                  <div className="flex items-center justify-between">
                    <Icon
                      aria-hidden="true"
                      className="size-7"
                      strokeWidth={1.5}
                    />
                    <ArrowUpRight aria-hidden="true" className="size-5" />
                  </div>
                  <p className="mt-7 text-[10px] uppercase font-semibold tracking-widest">
                    <UIMessage>{label}</UIMessage>
                  </p>
                  <h3 className="mt-2 text-xl font-semibold"><UIMessage>{title}</UIMessage></h3>
                  <p className="mt-2 text-sm leading-6"><UIMessage>{description}</UIMessage></p>
                  <p className="mt-5 text-xs font-semibold">
                    {countLoading
                      ? t("Loading notices…")
                      : counts[category] == null
                        ? t("Explore the board")
                        : t("{count} notices on the board", { count: counts[category] })}
                  </p>
                </Link>
              </li>
            ),
          )}
        </ul>
      </section>

      <section aria-labelledby="nearby-heading" aria-busy={loading}>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="eyebrow mb-3"><UIMessage>
              Across the street. Around the corner.
            </UIMessage></p>
            <h2 id="nearby-heading" className="section-title"><UIMessage>
              Your neighbourhood, right here.
            </UIMessage></h2>
          </div>
          <Link
            href="/noticeboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
          ><UIMessage>
            View all notices</UIMessage>{" "}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <form
          action="/noticeboard"
          method="get"
          className="surface-card mb-5 p-4 sm:flex sm:items-end sm:gap-3"
        >
          <div className="flex-1 min-w-0">
            <label
              htmlFor="landing-area"
              className="block text-xs font-semibold mb-2"
            ><UIMessage>
              What’s happening in your area?
            </UIMessage></label>
            <div className="relative">
              <MapPin
                aria-hidden="true"
                className="absolute left-3 top-3.5 size-4 text-ink-muted"
              />
              <UIElement as="input"
                id="landing-area"
                name="locality"
                type="search"
                maxLength={100}
                placeholder="Gota, Satellite or your PIN code"
                className="h-12 w-full border rounded-xl pl-10 pr-3"
              />
            </div>
          </div>
          <button
            type="submit"
            className="meadow-primary mt-3 w-full sm:mt-0 sm:w-auto"
          ><UIMessage>
            Find posts </UIMessage><ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </form>
        {error ? (
          <div role="alert" className="surface-card p-6 space-y-3">
            <h3 className="text-xl font-semibold"><UIMessage>
              The board is taking a moment.
            </UIMessage></h3>
            <p className="text-sm text-ink-muted">{error}</p>
            <button
              type="button"
              onClick={() => setAttempt((v) => v + 1)}
              className="meadow-primary"
            ><UIMessage>
              Try again
            </UIMessage></button>
          </div>
        ) : loading ? (
          <UIElement as="div"
            className="grid gap-4 md:grid-cols-3"
            role="status"
            aria-label="Loading nearby notices"
          >
            {[0, 1, 2].map((id) => (
              <PostCardSkeleton key={id} />
            ))}
          </UIElement>
        ) : board?.items.length ? (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {board.items.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="surface-card p-8 text-center">
            <h3 className="text-2xl font-semibold"><UIMessage>
              Your neighbourhood starts with you.
            </UIMessage></h3>
            <p className="mt-3 text-sm text-ink-muted"><UIMessage>
              Ask for a hand, share an item, or offer a skill.
            </UIMessage></p>
            <Link href="/create-post" className="meadow-primary mt-5"><UIMessage>
              Create the first post
            </UIMessage></Link>
          </div>
        )}
      </section>

      <section
        aria-labelledby="how-heading"
        className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-14"
      >
        <div>
          <p className="eyebrow mb-3"><UIMessage>A notice. A conversation. A thank-you.</UIMessage></p>
          <h2 id="how-heading" className="section-title max-w-sm"><UIMessage>
            Good things start with a simple hello.
          </UIMessage></h2>
          <p className="mt-4 max-w-sm text-sm leading-7 text-ink-muted"><UIMessage>
            No perfect introductions needed. Tell your neighbours what would
            help, and take it from there.
          </UIMessage></p>
        </div>
        <ol className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
          {[
            [
              "Put it on the board",
              "Ask for help, offer an item, or share a skill. An area or society name is enough.",
            ],
            [
              "Make a local connection",
              "Respond to a notice and arrange the details in your private conversation.",
            ],
            [
              "Close with a thank-you",
              "Confirm the exchange together. Both neighbours earn community credits.",
            ],
          ].map(([title, description], i) => (
            <li key={title} className="how-step">
              <span className="step-number">0{i + 1}</span>
              <div>
                <h3 className="text-sm font-semibold"><UIMessage>{title}</UIMessage></h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="care-heading" className="kindness-banner">
        <div>
          <p className="eyebrow mb-3"><UIMessage>Kindness, with a little care.</UIMessage></p>
          <h2 id="care-heading" className="section-title"><UIMessage>
            A safe exchange starts with you.
          </UIMessage></h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-soft"><UIMessage>
            Meet at the society gate or a shared space. Check profiles, keep
            private details out of posts, and report anything that feels wrong.
          </UIMessage></p>
        </div>
        <Link href="/about" className="meadow-secondary">
          <ShieldCheck aria-hidden="true" className="size-4" /><UIMessage>
          Read our safety tips
        </UIMessage></Link>
      </section>

      <section
        aria-labelledby="faq-heading"
        className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:gap-14"
      >
        <div>
          <p className="eyebrow mb-3"><UIMessage>Before you say hello</UIMessage></p>
          <h2 id="faq-heading" className="section-title"><UIMessage>
            A few things to know.
          </UIMessage></h2>
          <Link
            href="/contact"
            className="mt-4 inline-flex items-center gap-2 text-sm text-brand font-semibold"
          ><UIMessage>
            Still have a question?</UIMessage>{" "}
            <MessageCircle aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <div className="home-faq">
          {[
            [
              "Is help really free?",
              "Yes. Neighbours exchange help, items and skills without money changing hands. Free accounts have five posts a month; optional membership plans add posting capacity and society tools. Paid checkout is currently a test flow.",
            ],
            [
              "Do I need to share my home address?",
              "No. Use your area, PIN code or society name. Arrange a public meeting point in your private conversation, and keep your flat number and personal documents off the board.",
            ],
            [
              "What does verification mean?",
              "Email verification and community or identity review are separate steps in your Trust Center. Credit tiers recognise completed exchanges; they do not prove identity or guarantee someone’s behaviour.",
            ],
            [
              "Can I post in Hindi or Gujarati?",
              "Of course. Write your notice in the language that feels natural. Navigation and key controls are available in English, Gujarati and Hindi. We never translate your post automatically.",
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <Plus
                  aria-hidden="true"
                  className="size-4 shrink-0 transition-transform duration-150"
                />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section
        className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        aria-labelledby="start-heading"
      >
        <div>
          <h2 id="start-heading" className="text-xl font-semibold"><UIMessage>
            A neighbourhood is better when we show up.
          </UIMessage></h2>
          <p className="mt-2 text-sm text-ink-muted"><UIMessage>
            Start small. There’s always something you can share.
          </UIMessage></p>
        </div>
        <Link
          href="/create-post?type=Offer%20help"
          className="meadow-primary shrink-0"
        ><UIMessage>
          Offer a little kindness</UIMessage>{" "}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </section>
    </div>
  );
}
