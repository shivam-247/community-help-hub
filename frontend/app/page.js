"use client";

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
          <p className="eyebrow mb-5">A little closer to home</p>
          <h1 id="meadow-heading" className="hero-title display-title">
            A little help.
            <br />A <em>brighter</em> neighbourhood.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-ink-soft sm:text-base">
            A spare tool. A lift to the clinic. An hour of your time. Find a
            helping hand, or be one, right where you live.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/create-post?type=Need%20help"
              className="meadow-primary"
            >
              Ask for help{" "}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/create-post?type=Offer%20help"
              className="meadow-secondary"
            >
              Offer help <HandHeart aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <p className="hero-caption mt-5">
            <HeartHandshake aria-hidden="true" />
            No buying or selling. Just being neighbours.
          </p>
          <Link
            href="/noticeboard"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand"
          >
            Explore the noticeboard{" "}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <div className="hero-visual">
          <span className="hero-visual-label">
            <MapPin aria-hidden="true" className="size-3.5" />
            Every society has a helping hand.
          </span>
          <NeighbourhoodScene />
          <div
            className="hero-board"
            aria-label="A look at the noticeboard"
            aria-busy={loading}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-semibold">On the noticeboard</p>
              <span className="text-[10px] text-ink-muted">
                Local connections
              </span>
            </div>
            {loading ? (
              <div className="py-5 text-sm text-ink-muted" role="status">
                Finding nearby notices…
              </div>
            ) : error ? (
              <p className="py-4 text-xs text-ink-muted">
                The board is taking a moment. You can retry below.
              </p>
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
                        {post.is_demo ? " · Sample notice" : ""}
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
              <p className="py-4 text-xs text-ink-muted">
                Your neighbourhood starts with the first notice.
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Public noticeboard activity" className="-mt-4">
        <ul className="activity-strip" aria-busy={loading || countLoading}>
          {stats.map(({ value, label }) => (
            <li key={label}>
              <strong className="tabular-nums">
                {value ?? (loading || countLoading ? "…" : "—")}
              </strong>
              <p className="mt-2 text-[11px] leading-5 text-ink-muted sm:text-sm">
                {label}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-[10px] text-ink-muted sm:text-xs">
          Public board totals. Sample notices are clearly labelled.
        </p>
        {countError && (
          <p role="status" className="mt-2 text-center text-xs text-ink-muted">
            Some counts are unavailable.{" "}
            <button
              className="min-h-11 px-2 underline"
              type="button"
              onClick={() => setAttempt((v) => v + 1)}
            >
              Retry counts
            </button>
          </p>
        )}
      </section>

      <section aria-labelledby="ways-heading">
        <div className="mb-6">
          <p className="eyebrow mb-3">Small things. Real difference.</p>
          <h2 id="ways-heading" className="section-title">
            What can we do for each other?
          </h2>
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
                    {label}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6">{description}</p>
                  <p className="mt-5 text-xs font-semibold">
                    {countLoading
                      ? "Loading notices…"
                      : counts[category] == null
                        ? "Explore the board"
                        : `${counts[category]} ${counts[category] === 1 ? "notice" : "notices"} on the board`}
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
            <p className="eyebrow mb-3">
              Across the street. Around the corner.
            </p>
            <h2 id="nearby-heading" className="section-title">
              Your neighbourhood, right here.
            </h2>
          </div>
          <Link
            href="/noticeboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
          >
            View all notices{" "}
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
            >
              What’s happening in your area?
            </label>
            <div className="relative">
              <MapPin
                aria-hidden="true"
                className="absolute left-3 top-3.5 size-4 text-ink-muted"
              />
              <input
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
          >
            Find posts <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </form>
        {error ? (
          <div role="alert" className="surface-card p-6 space-y-3">
            <h3 className="text-xl font-semibold">
              The board is taking a moment.
            </h3>
            <p className="text-sm text-ink-muted">{error}</p>
            <button
              type="button"
              onClick={() => setAttempt((v) => v + 1)}
              className="meadow-primary"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <div
            className="grid gap-4 md:grid-cols-3"
            role="status"
            aria-label="Loading nearby notices"
          >
            {[0, 1, 2].map((id) => (
              <PostCardSkeleton key={id} />
            ))}
          </div>
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
            <h3 className="text-2xl font-semibold">
              Your neighbourhood starts with you.
            </h3>
            <p className="mt-3 text-sm text-ink-muted">
              Ask for a hand, share an item, or offer a skill.
            </p>
            <Link href="/create-post" className="meadow-primary mt-5">
              Create the first post
            </Link>
          </div>
        )}
      </section>

      <section
        aria-labelledby="how-heading"
        className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-14"
      >
        <div>
          <p className="eyebrow mb-3">A notice. A conversation. A thank-you.</p>
          <h2 id="how-heading" className="section-title max-w-sm">
            Good things start with a simple hello.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-7 text-ink-muted">
            No perfect introductions needed. Tell your neighbours what would
            help, and take it from there.
          </p>
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
                <h3 className="text-sm font-semibold">{title}</h3>
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
          <p className="eyebrow mb-3">Kindness, with a little care.</p>
          <h2 id="care-heading" className="section-title">
            A safe exchange starts with you.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-soft">
            Meet at the society gate or a shared space. Check profiles, keep
            private details out of posts, and report anything that feels wrong.
          </p>
        </div>
        <Link href="/about" className="meadow-secondary">
          <ShieldCheck aria-hidden="true" className="size-4" />
          Read our safety tips
        </Link>
      </section>

      <section
        aria-labelledby="faq-heading"
        className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:gap-14"
      >
        <div>
          <p className="eyebrow mb-3">Before you say hello</p>
          <h2 id="faq-heading" className="section-title">
            A few things to know.
          </h2>
          <Link
            href="/contact"
            className="mt-4 inline-flex items-center gap-2 text-sm text-brand font-semibold"
          >
            Still have a question?{" "}
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
          <h2 id="start-heading" className="text-xl font-semibold">
            A neighbourhood is better when we show up.
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Start small. There’s always something you can share.
          </p>
        </div>
        <Link
          href="/create-post?type=Offer%20help"
          className="meadow-primary shrink-0"
        >
          Offer a little kindness{" "}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </section>
    </div>
  );
}
