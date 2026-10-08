"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Icon,
  Input,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "../../components/ui";
import { api } from "../../lib/api";
import PostCard from "../../components/PostCard";
import { PostCardSkeleton } from "../../components/Skeleton";
const TYPES = [
  "All",
  "Need help",
  "Offer help",
  "Request item",
  "Offer service",
];
const CATEGORIES = [
  "All",
  "Help Requests",
  "Donations & Giveaways",
  "Skill Offers",
  "Community Alerts",
];
const CATEGORY_ICONS = [
  "layout-grid",
  "hand-heart",
  "gift",
  "wrench",
  "megaphone",
];
export default function FeedPage() {
  const [community, setCommunity] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    setCommunity(new URLSearchParams(window.location.search).get("community"));
  }, []);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locality, setLocality] = useState("");
  const [type, setType] = useState("All");
  const [verified, setVerified] = useState(false);
  const [priority, setPriority] = useState("All");
  const [category, setCategory] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ sort });
        if (verified) params.set("verified_only", "true");
        if (locality.trim()) params.set("locality", locality.trim());
        if (type !== "All") params.set("type", type);
        if (priority !== "All") params.set("priority", priority);
        if (category !== "All") params.set("category", category);
        if (q.trim()) params.set("q", q.trim());
        let data = await api(
          community ? `/communities/${community}/posts?verified_only=${verified}` : `/posts?${params}`,
          { auth: true },
        );
        if (community)
          data = data.filter(
            (p) =>
              (!q ||
                (p.title + p.description)
                  .toLowerCase()
                  .includes(q.toLowerCase())) &&
              (!locality || p.locality.toLowerCase().includes(locality.toLowerCase())) &&
              (category === "All" || p.category === category) &&
              (type === "All" || p.type === type) &&
              (priority === "All" || p.priority === priority),
          );
        if (community && sort === "deadline") data.sort((a,b) => (a.deadline == null) - (b.deadline == null) || new Date(a.deadline || 0) - new Date(b.deadline || 0));
        if (active) setPosts(data);
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    locality,
    type,
    priority,
    category,
    q,
    sort,
    retry,
    community,
    verified,
  ]);
  const clear = () => {
    setLocality("");
    setType("All");
    setPriority("All");
    setCategory("All");
    setQ("");
    setVerified(false);
  };
  const filtered =
    locality ||
    type !== "All" ||
    priority !== "All" ||
    category !== "All" ||
    q ||
    verified;
  return (
    <div className="space-y-8">
      <section className="border-b border-line pb-8 flex flex-col sm:flex-row gap-6 sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-semibold tracking-widest uppercase text-brand mb-4">
            The neighborhood noticeboard
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
            Good neighbors.
            <br />A little help goes a long way.
          </h1>
          <p className="text-sm sm:text-base text-ink-muted mt-4 max-w-lg leading-relaxed">
            Ask for a hand, share something useful, or offer a skill. Find the
            everyday help that’s closer than you think.
          </p>
        </div>
        <Button
          asChild
          className="self-start sm:self-auto product-button shrink-0"
        >
          <Link
            href={
              community ? `/create-post?community=${community}` : "/create-post"
            }
          >
            <Icon name="plus" decorative />
            Create a post
          </Link>
        </Button>
      </section>
      {community && (
        <p className="text-sm rounded-lg bg-brand-soft text-brand p-4">
          Private society board · visible to members only
        </p>
      )}
      {posts.some((p) => p.is_demo) && (
        <p className="text-xs text-ink-muted border border-line rounded-lg p-3">
          Sample posts show how the noticeboard works. They are labelled Sample
          and do not accept responses.
        </p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-8">
        <section className="min-w-0 space-y-5" aria-label="Neighborhood posts">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-lg">Noticeboard</h2>
            <p aria-live="polite" className="text-xs text-ink-muted">
              {loading
                ? "Loading posts…"
                : error
                  ? "Unable to load posts"
                  : `${posts.length} ${posts.length === 1 ? "post" : "posts"}`}
            </p>
          </div>
          <div
            className="chip-row flex gap-1.5 overflow-x-auto pb-2"
            aria-label="Post categories"
          >
            {CATEGORIES.map((cat, i) => (
              <Button
                key={cat}
                variant={category === cat ? "secondary" : "ghost"}
                size="sm"
                className="category-button"
                aria-pressed={category === cat}
                onClick={() => setCategory(cat)}
              >
                <Icon name={CATEGORY_ICONS[i]} size="sm" decorative />
                {cat === "All"
                  ? "All posts"
                  : cat === "Donations & Giveaways"
                    ? "Giveaways"
                    : cat === "Help Requests"
                      ? "Help requests"
                      : cat === "Skill Offers"
                        ? "Skills"
                        : "Alerts"}
              </Button>
            ))}
          </div>
          <div className="border border-line rounded-xl bg-surface p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px] gap-4">
              <div>
                <label className="filter-label" htmlFor="post-search">
                  Find something
                </label>
                <div className="relative">
                  <Icon
                    name="search"
                    decorative
                    className="absolute left-3 top-3 text-ink-muted"
                  />
                  <Input
                    id="post-search"
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search for help, items or skills"
                    className="pl-10 w-full"
                  />
                </div>
              </div>
              <div>
                <label className="filter-label" htmlFor="post-area">Area / PIN code</label><Input id="post-area" type="search" value={locality} onChange={e=>setLocality(e.target.value)} placeholder="Gota or 382481"/>
              </div>
            </div>
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Icon name="sliders-horizontal" decorative size="sm" />
                  More filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetTitle>Refine your noticeboard</SheetTitle>
                <SheetDescription>
                  Choose an area and the kind of help you’re looking for.
                </SheetDescription>
                <div className="grid grid-cols-1 gap-4 pt-6">
                  
                  <div>
                    <label className="filter-label" htmlFor="post-type">
                      Post type
                    </label>
                    <select
                      id="post-type"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="filter-control"
                    >
                      {TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="filter-label" htmlFor="post-priority">
                      Priority
                    </label>
                    <select
                      id="post-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="filter-control"
                    >
                      {["All", "High", "Medium", "Low"].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-3 text-sm min-h-11 mt-4">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                  />
                  Verified members only · Plus / Society
                </label>
                <SheetClose asChild>
                  <Button className="w-full mt-6">Show posts</Button>
                </SheetClose>
              </SheetContent>
            </Sheet>
            <div className="border-t border-line pt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label htmlFor="post-sort" className="text-xs text-ink-muted">
                  Sort
                </label>
                <select
                  id="post-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="border border-line rounded-lg px-2 text-sm!"
                >
                  <option value="newest">Newest first</option>
                  <option value="deadline">By deadline</option>
                </select>
              </div>
              {filtered && (
                <Button variant="ghost" size="sm" onClick={clear}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
          {error ? (
            <div
              role="alert"
              className="border border-danger/30 bg-danger-soft rounded-xl p-6 space-y-3"
            >
              <h3 className="font-semibold">
                We couldn’t load the noticeboard.
              </h3>
              <p className="text-sm text-ink-soft">{error}</p>
              <Button variant="outline" onClick={() => setRetry((x) => x + 1)}>
                Try again
              </Button>
            </div>
          ) : loading ? (
            <div
              aria-label="Loading posts"
              className="grid sm:grid-cols-2 gap-4"
            >
              {[0, 1, 2, 3].map((i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : posts.length ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-line rounded-xl bg-surface p-8 sm:p-12 text-center">
              <div
                aria-hidden="true"
                className="mx-auto mb-6 max-w-52 rounded-xl border border-line bg-surface-muted p-4 text-left"
              >
                <Icon
                  name="clipboard-list"
                  size="xl"
                  decorative
                  className="text-brand mx-auto mb-4"
                />
                <div className="h-2 w-4/5 rounded bg-line mb-3" />
                <div className="h-2 w-3/5 rounded bg-line mb-3" />
                <div className="h-2 w-2/3 rounded bg-line" />
              </div>
              <h3 className="font-semibold text-lg">
                {filtered
                  ? "No matching posts yet"
                  : "Your neighborhood starts here"}
              </h3>
              <p className="text-sm text-ink-muted mt-2 mb-6 max-w-sm mx-auto leading-relaxed">
                {filtered
                  ? "Try another area or clear your filters to see more posts."
                  : "Need a tool, have something to give away, or know a skill? Start the first conversation."}
              </p>
              <Button
                asChild={!filtered}
                variant={filtered ? "outline" : "default"}
                onClick={filtered ? clear : undefined}
              >
                {filtered ? (
                  "Clear filters"
                ) : (
                  <Link
                    href={
                      community
                        ? `/create-post?community=${community}`
                        : "/create-post"
                    }
                  >
                    <Icon name="plus" decorative />
                    Create the first post
                  </Link>
                )}
              </Button>
            </div>
          )}
        </section>
        <aside className="lg:pt-1 space-y-6">
          <div className="bg-brand-soft rounded-xl p-5">
            <Icon name="hand-heart" decorative className="text-brand mb-3" />
            <h2 className="font-semibold text-sm">A hub built on trust</h2>
            <p className="text-sm text-ink-soft leading-relaxed mt-2">
              Real people helping nearby. Keep requests clear, agree on the
              details, and look out for each other.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-xs font-semibold text-brand mt-4 min-h-8"
            >
              How the hub works <Icon name="arrow-right" decorative size="sm" />
            </Link>
          </div>
          <div className="px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-4">
              Before you post
            </h2>
            <ol className="space-y-4">
              {[
                ["Be specific", "Say what you need and when."],
                ["Keep it local", "Choose the area where you can meet."],
                [
                  "Close the loop",
                  "Mark the post resolved after the exchange.",
                ],
              ].map(([title, description], i) => (
                <li key={title} className="flex gap-3">
                  <span className="text-xs text-ink-muted pt-0.5 tabular-nums">
                    0{i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-ink-muted leading-relaxed mt-1">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="border-t border-line pt-5 px-1">
            <p className="text-xs text-ink-muted leading-relaxed">
              For emergencies, contact your local emergency services. Posts here
              are for community support.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
