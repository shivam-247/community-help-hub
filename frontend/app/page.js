"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import PostCard from "../components/PostCard";
import { PostCardSkeleton } from "../components/Skeleton";

const CATEGORIES = [
  {
    category: "Help Requests",
    title: "A helping hand",
    label: "Help requests",
    appearance: "meadow-yellow",
  },
  {
    category: "Donations & Giveaways",
    title: "Something to share",
    label: "Giveaways",
    appearance: "meadow-blue",
  },
  {
    category: "Skill Offers",
    title: "A skill to offer",
    label: "Skills",
    appearance: "meadow-pink",
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
    { value: counts["Skill Offers"], label: "Skill offers" },
  ];
  const recent = (board?.items || []).filter(
    (post) => post.status === "Resolved" && !post.is_demo,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-9 sm:space-y-12 meadow-enter">
      <section
        aria-labelledby="meadow-heading"
        className="meadow-hero px-6 pb-9 pt-9 text-center sm:px-12 sm:pb-12 sm:pt-12"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">
          Neighbours helping neighbours
        </p>
        <h1
          id="meadow-heading"
          className="mx-auto mt-5 max-w-3xl text-balance text-3xl leading-tight sm:text-4xl lg:text-5xl"
        >
          Find a helping hand in your neighbourhood.
        </h1>
        <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-ink-muted sm:text-base">
          Ask for a hand, or offer one. Local connections, no money exchanged.
        </p>
        <div className="mx-auto mt-7 flex max-w-lg flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/create-post?type=Need%20help"
            className="meadow-primary flex-1"
          >
            Ask for help
          </Link>
          <Link
            href="/create-post?type=Offer%20help"
            className="meadow-secondary flex-1"
          >
            Offer help
          </Link>
        </div>
        <Link
          href="/noticeboard"
          className="mt-5 inline-flex min-h-11 items-center rounded-full px-4 text-sm underline underline-offset-4"
        >
          Explore the noticeboard
        </Link>
      </section>

      <section aria-label="Public noticeboard activity">
        <ul className="grid grid-cols-3 gap-2.5 sm:gap-5" aria-busy={loading}>
          {stats.map(({ value, label }) => (
            <li
              key={label}
              className="meadow-glass min-w-0 px-2 py-5 text-center sm:px-5 sm:py-6"
            >
              <p className="text-3xl font-semibold tabular-nums sm:text-4xl">
                {value ?? (loading || countLoading ? "…" : "—")}
              </p>
              <p className="mt-2 text-[11px] leading-4 text-ink-muted sm:text-sm sm:leading-5">
                {label}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-xs text-ink-muted">
          Public board totals. Sample notices are clearly labelled.
        </p>
        {countError && (
          <p role="status" className="mt-2 text-center text-xs text-ink-muted">
            Some counts are unavailable.{" "}
            <button
              type="button"
              className="min-h-11 px-2 underline"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry counts
            </button>
          </p>
        )}
      </section>

      <section aria-labelledby="blocks-heading">
        <h2 id="blocks-heading" className="text-3xl italic sm:text-4xl">
          Ways to help nearby
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {CATEGORIES.map(({ category, title, label, appearance }) => (
            <li key={category}>
              <Link
                href={`/noticeboard?${new URLSearchParams({ category })}`}
                className={`meadow-tile h-full ${appearance}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                  {label}
                </p>
                <h3 className="mt-4 text-2xl font-semibold leading-snug">
                  {title}
                </h3>
                <p className="mt-3 text-sm">
                  {countLoading
                    ? "Loading notices…"
                    : counts[category] == null
                      ? "Explore the board"
                      : `${counts[category]} ${counts[category] === 1 ? "notice" : "notices"} on the board`}
                  <span aria-hidden="true"> →</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="nearby-heading" aria-busy={loading}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="nearby-heading" className="text-3xl italic sm:text-4xl">
            Neighbourhood noticeboard
          </h2>
          <Link
            href="/noticeboard"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-ink-muted underline underline-offset-4"
          >
            View all notices
          </Link>
        </div>
        <form action="/noticeboard" method="get" className="my-5">
          <label
            htmlFor="landing-area"
            className="block text-xs font-semibold mb-2"
          >
            What’s happening in your area?
          </label>
          <div className="flex gap-2">
            <input
              id="landing-area"
              name="locality"
              type="search"
              maxLength={100}
              placeholder="Your area or PIN code"
              className="min-w-0 flex-1 rounded-full border border-line bg-surface/50 px-4 text-sm"
            />
            <button type="submit" className="meadow-primary shrink-0 text-sm">
              Find posts
            </button>
          </div>
        </form>
        {error ? (
          <div role="alert" className="meadow-glass p-6 space-y-3">
            <h3 className="text-xl">The board is taking a moment.</h3>
            <p className="text-sm text-ink-muted">{error}</p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="meadow-primary text-sm"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <div
            className="grid gap-4 sm:grid-cols-2"
            role="status"
            aria-label="Loading nearby notices"
          >
            {[0, 1, 2].map((id) => (
              <PostCardSkeleton key={id} />
            ))}
          </div>
        ) : board?.items.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {board.items.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="meadow-glass p-8 text-center">
            <h3 className="text-2xl">Your neighbourhood starts with you.</h3>
            <p className="mt-3 text-sm text-ink-muted">
              Ask for a hand, share an item, or offer a skill.
            </p>
            <Link href="/create-post" className="meadow-primary mt-5 text-sm">
              Create the first post
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="kindness-heading">
        <h2 id="kindness-heading" className="text-3xl italic sm:text-4xl">
          Close the loop
        </h2>
        {recent.length ? (
          <ul className="mt-5 space-y-3">
            {recent.map((post) => (
              <li
                key={post.id}
                className="meadow-glass flex items-center justify-between gap-4 p-5"
              >
                <p className="text-sm">
                  {post.owner_name} closed “{post.title}”
                </p>
                <Link
                  href={`/post/${post.id}`}
                  className="meadow-primary shrink-0 text-sm"
                >
                  View exchange
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="meadow-glass mt-5 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-lg text-sm leading-7 text-ink-muted">
              A small favour deserves a thank-you. After your exchange, confirm
              completion together and share your feedback.
            </p>
            <Link href="/inbox" className="meadow-primary shrink-0 text-sm">
              Your conversations
            </Link>
          </div>
        )}
      </section>

      <section
        aria-labelledby="spotlight-heading"
        className="meadow-glass p-6 sm:p-9"
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest">
          Neighbour spotlight
        </p>
        <h2
          id="spotlight-heading"
          className="mt-4 max-w-3xl text-2xl leading-snug sm:text-3xl"
        >
          The quiet acts that make a neighbourhood feel like home.
        </h2>
        <p className="mt-4 text-sm leading-7 text-ink-muted">
          A borrowed tool. Books passed on. An hour spent helping someone learn.
          Start with what you can share.
        </p>
        <Link
          href="/create-post?type=Offer%20help"
          className="mt-4 inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold underline underline-offset-4"
        >
          Offer a little kindness
          <span aria-hidden="true" className="ml-2">
            →
          </span>
        </Link>
      </section>
    </div>
  );
}
