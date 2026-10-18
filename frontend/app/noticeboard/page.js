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
import Pagination from "../../components/Pagination";
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
    const params = new URLSearchParams(window.location.search);
    setCommunity(params.get("community"));
    setLocality(params.get("locality") || "");
    setQ(params.get("q") || "");
    if (CATEGORIES.includes(params.get("category"))) setCategory(params.get("category"));
  }, []);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1),
    [meta, setMeta] = useState({ total: 0, has_more: false });
  const [loadedFilters, setLoadedFilters] = useState("");
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
    const controller = new AbortController();
    const key = JSON.stringify([
      locality,
      type,
      priority,
      category,
      q,
      sort,
      community,
      verified,
    ]);
    if (loadedFilters !== key && page !== 1) {
      setPage(1);
      return;
    }
    setLoadedFilters(key);
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
        params.set("page", String(page));
        params.set("page_size", "12");
        const data = await api(
          community
            ? `/communities/${community}/feed?${params}`
            : `/posts/feed?${params}`,
          { auth: true, signal: controller.signal },
        );
        if (active) {
          setPosts(data.items);
          setMeta(data);
        }
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
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
    page,
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
    <div className="compact-feed flex flex-col gap-6 meadow-enter">
      <section className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-4xl italic tracking-tight">Blooming nearby</h1>
          <p className="hidden sm:block text-sm text-ink-muted mt-2">Ask for a hand, or offer one. Find your neighbourhood’s next small kindness.</p>
        </div>
        <Button asChild className="hidden sm:inline-flex shrink-0 rounded-full">
          <Link href={community ? `/create-post?community=${community}` : "/create-post"}><Icon name="plus" decorative />Create a post</Link>
        </Button>
      </section>
      {community && (
        <p className="text-sm rounded-lg bg-brand-soft text-brand p-4">
          Private society board · visible to members only
        </p>
      )}
      <div className="feed-layout">
        <aside className="hidden lg:block feed-aside" aria-label="Explore the neighbourhood">
          <p className="text-xs text-ink-muted font-semibold uppercase tracking-wider mb-4 px-3">Explore</p>
          <div className="space-y-1">
            {CATEGORIES.map((cat, i) => <Button key={cat} variant={category === cat ? "secondary" : "ghost"} className="w-full justify-start text-sm" aria-pressed={category === cat} onClick={() => setCategory(cat)}>
              <Icon name={CATEGORY_ICONS[i]} decorative size="sm" />{["All posts", "Help requests", "Giveaways", "Skills", "Local alerts"][i]}
            </Button>)}
          </div>
          <div className="border-t border-line mt-6 pt-5 px-3 space-y-1">
            <p className="text-xs uppercase tracking-wider text-ink-muted font-semibold mb-2">Your hub</p>
            <Link className="app-link" href="/inbox"><Icon name="message-circle" decorative size="sm" />Messages</Link>
            <Link className="app-link" href="/settings?tab=trust"><Icon name="shield-check" decorative size="sm" />Trust Center</Link>
            <Link className="app-link" href="/settings?tab=billing"><Icon name="layers" decorative size="sm" />Your plan</Link>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed px-3 mt-7">No buying or selling.<br />Just neighbours helping neighbours.</p>
        </aside>
        <section className="min-w-0 flex flex-col gap-3" aria-label="Neighborhood posts">
          <div className="flex items-center justify-end gap-3">
            <h2 className="sr-only">Neighbourhood notices</h2>
            <p aria-live="polite" className="text-xs text-ink-muted">
              {loading
                ? "Loading posts…"
                : error
                  ? "Unable to load posts"
                  : `${meta.total} ${meta.total === 1 ? "post" : "posts"}`}
            </p>
          </div>
          <div
            className="chip-row flex gap-1.5 overflow-x-auto pb-2 lg:hidden"
            aria-label="Post categories"
          >
            {CATEGORIES.map((cat, i) => (
              <Button
                key={cat}
                variant={category === cat ? "secondary" : "ghost"}
                size="sm"
                className="category-button feed-category"
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
          <div className="feed-controls space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_150px] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_150px] gap-3">
              <div>
                <label className="sr-only sm:not-sr-only sm:mb-2 sm:block sm:text-xs sm:font-medium sm:text-ink-soft" htmlFor="post-search">
                  Search the noticeboard
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
                    placeholder="Books, a spare tool, a helping hand…"
                    className="pl-10 w-full"
                  />
                </div>
              </div>
              <div className="hidden sm:block lg:hidden xl:block">
                <label className="filter-label" htmlFor="post-area">
                  Area / PIN code
                </label>
                <Input
                  id="post-area"
                  type="search"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="Gota or 382481"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
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
                  <div className="sm:hidden lg:block xl:hidden">
                    <label className="filter-label" htmlFor="filter-area">Area / PIN code</label>
                    <Input id="filter-area" type="search" value={locality} onChange={e => setLocality(e.target.value)} placeholder="Gota or 382481" />
                  </div>
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
            <div className="flex flex-wrap items-center gap-2">
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
          </div>
          {posts.some(p => p.is_demo) && <p className="text-xs text-ink-muted flex items-start gap-2"><Icon name="info" decorative size="sm" className="shrink-0" /> Sample posts are labelled and cannot receive responses.</p>}
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
              className="feed-list grid gap-4"
            >
              {[0, 1, 2, 3].map((i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : posts.length ? (
            <div className="space-y-5">
              <div className="feed-list grid gap-4">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
              <Pagination
                page={page}
                hasMore={meta.has_more}
                total={meta.total}
                label="posts"
                onPage={setPage}
              />
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
              {page > 1 && (
                <Button variant="outline" onClick={() => setPage(page - 1)}>
                  Return to previous page
                </Button>
              )}
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
        <aside className="feed-aside space-y-6">
          <div className="bg-surface border border-line rounded-2xl p-5">
            <Icon name="hand-heart" decorative className="text-brand mb-3" />
            <h2 className="font-semibold text-sm">Make yourself at home</h2>
            <p className="text-sm text-ink-soft leading-relaxed mt-2">
              Complete your profile and verification steps before arranging your first exchange.
            </p>
            <Link
              href="/settings?tab=trust"
              className="inline-flex items-center gap-2 text-xs font-semibold text-brand mt-4 min-h-8"
            >
              Open Trust Center <Icon name="arrow-right" decorative size="sm" />
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
                  <span className="text-xs text-ink-muted pt-0.5 tabular-nums shrink-0 w-5">
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
