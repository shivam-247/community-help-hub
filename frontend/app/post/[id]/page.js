"use client";
import { Text as UIMessage, LocalizedElement as UIElement } from "../../../lib/i18n";

import { use, useEffect, useState } from "react";
import SafetyMenu, { useSafety } from "../../../components/SafetyMenu";
import PostImage from "../../../components/PostImage";
import RecoveryPanel from "../../../components/RecoveryPanel";
import { Text } from "../../../lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "../../../components/ToastProvider";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { PostDetailSkeleton } from "../../../components/Skeleton";
import BadgeTier from "../../../components/BadgeTier";
import Avatar from "../../../components/Avatars";
import {
  InfoIcon,
  MapPinIcon,
  ClockIcon,
  StarIcon,
  AlertTriangleIcon,
  CheckIcon,
  SendIcon,
  TrashIcon,
} from "../../../components/Icons";

const STATUSES = ["Open", "In Progress", "Resolved"];
const RATING_TAGS = [
  "Fast Response",
  "Generous",
  "Reliable Neighbor",
  "Skillful",
  "Safe & Polite",
];

export default function PostDetailPage({ params }) {
  const { id } = use(params);
  const auth = useAuth();
  const router = useRouter();
  const notify = useToast();
  const { hidden, restore } = useSafety();
  const [responseError, setResponseError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // Rating state
  const [ratingEligibility, setRatingEligibility] = useState(null);
  useEffect(() => {
    setRatingEligibility(null);
    if (auth?.user) api(`/posts/${id}/rating-eligibility`, { auth: true }).then(setRatingEligibility).catch(() => {});
  }, [id, auth?.user?.id, post?.status]);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingTags, setRatingTags] = useState([]);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [ratingError, setRatingError] = useState("");

  const load = async () => {
    setError("");
    try {
      const data = await api(`/posts/${id}`);
      setPost(data);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (error)
    return (
      <RecoveryPanel
        title="Notice unavailable"
        message={error}
        onRetry={() => {
          setError("");
          setPost(null);
          load();
        }}
      />
    );
  if (hidden.includes(Number(id)))
    return (
      <RecoveryPanel
        title="You hid this notice"
        retryLabel="Restore hidden posts"
        message="It is hidden for this browser session. Hiding does not block its author."
        onRetry={restore}
      />
    );

  if (!post) {
    return <PostDetailSkeleton />;
  }

  const user = auth?.user;
  const isOwner = user?.id === post.owner_id;
  const isAdminOrSuper = user?.role === "admin" || user?.role === "super_admin";
  const needsVerification =
    ["Help Requests", "Skill Offers"].includes(post.category) &&
    user &&
    user.verification_status !== "verified" &&
    !isAdminOrSuper;

  const respond = async (e) => {
    e.preventDefault();
    setBusy(true);
    setResponseError("");
    try {
      await api(`/posts/${id}/respond`, {
        method: "POST",
        auth: true,
        body: { message },
      });
      setSent(true);
    } catch (err) {
      setResponseError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (status) => {
    setBusy(true);
    try {
      const updated = await api(`/posts/${id}/status`, {
        method: "PATCH",
        auth: true,
        body: { status },
      });
      setPost(updated);
      notify("Post status updated.");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const deletePost = async () => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setBusy(true);
    try {
      await api(`/posts/${id}`, { method: "DELETE", auth: true });
      notify("Post deleted.");
      router.replace("/");
    } catch (err) {
      notify(err.message, "error");
      setBusy(false);
    }
  };

  const submitRating = async (e) => {
    e.preventDefault();
    if (!ratingStars) {
      setRatingError("Please select a star rating.");
      return;
    }
    setRatingBusy(true);
    setRatingError("");
    try {
      await api(`/posts/${id}/rate`, {
        method: "POST",
        auth: true,
        body: {
          stars: ratingStars,
          tags: ratingTags,
          comment: ratingComment || null,
        },
      });
      setRatingDone(true);
    } catch (err) {
      setRatingError(err.message);
    } finally {
      setRatingBusy(false);
    }
  };

  const toggleTag = (tag) => {
    setRatingTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const startEdit = () => {
    const date = post.deadline ? new Date(post.deadline) : null;
    const localDate = date
      ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : "";
    setDraft({
      title: post.title,
      description: post.description,
      priority: post.priority,
      deadline: localDate,
    });
    setEditing(true);
  };
  const saveEdit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const updated = await api(`/posts/${id}`, {
        method: "PATCH",
        auth: true,
        body: {
          ...draft,
          deadline: draft.deadline
            ? new Date(draft.deadline).toISOString()
            : null,
        },
      });
      setPost(updated);
      setEditing(false);
      notify("Post updated.");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/noticeboard"
        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
      ><UIMessage>
        ← Back to all posts
      </UIMessage></Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Content */}
        <div className="lg:col-span-2 bg-surface border border-line rounded-3xl p-5 sm:p-8 shadow-xs space-y-6">
          <div className="flex justify-end">
            <SafetyMenu postId={post.id} ownerId={post.owner_id} />
          </div>
          {/* Post Header Badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider bg-surface-muted text-ink-soft px-3 py-1 rounded-full">
                {post.type}
              </span>
              <span className="text-xs font-medium bg-brand-soft text-brand border border-line px-3 py-1 rounded-full">
                {post.category}
              </span>
            </div>

            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border inline-flex items-center gap-1.5 ${
                post.status === "Open"
                  ? "bg-success-soft text-success border-success-soft"
                  : post.status === "In Progress"
                    ? "bg-warning-soft text-warning border-warning-soft"
                    : "bg-surface-muted text-ink-soft border-line"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  post.status === "Open"
                    ? "bg-success"
                    : post.status === "In Progress"
                      ? "bg-warning"
                      : "bg-surface-muted"
                }`}
              />
              {post.status}
            </span>
          </div>

          {/* Title */}
          {editing && isOwner && (
            <form
              onSubmit={saveEdit}
              className="rounded-xl border border-line bg-brand-soft p-4 space-y-4"
            >
              <h2 className="font-bold"><UIMessage>Edit your post</UIMessage></h2>
              <label className="block text-sm"><UIMessage>
                Title
                </UIMessage><input
                  required
                  maxLength={200}
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border p-2"
                />
              </label>
              <label className="block text-sm"><UIMessage>
                Description
                </UIMessage><textarea
                  required
                  maxLength={10000}
                  rows={5}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border p-2"
                />
              </label>
              <label className="block text-sm"><UIMessage>
                Priority
                </UIMessage><select
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft({ ...draft, priority: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border p-2"
                >
                  {["Low", "Medium", "High"].map((value) => (
                    <option value={value} key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm"><UIMessage>
                Deadline (your local time)
                </UIMessage><input
                  type="datetime-local"
                  value={draft.deadline}
                  onChange={(e) =>
                    setDraft({ ...draft, deadline: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border p-2"
                />
              </label>
              <div className="flex gap-3">
                <button
                  disabled={busy}
                  className="rounded-lg bg-brand-solid text-on-brand px-4 py-2 disabled:opacity-50"
                >
                  <UIMessage>{busy ? "Saving…" : "Save changes"}</UIMessage>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(false)}
                  className="rounded-lg border px-4 py-2"
                ><UIMessage>
                  Cancel
                </UIMessage></button>
              </div>
            </form>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-ink leading-snug">
            {post.title}
          </h1>

          {/* Attached Photo */}
          {post.image_url && (
            <div className="rounded-xl overflow-hidden bg-surface-muted border border-line/80 max-h-96">
              <PostImage src={post.image_url} title={post.title} />
            </div>
          )}

          {/* Body Description */}
          <div className="prose prose-slate max-w-none text-ink-soft text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {post.description}
          </div>

          {/* Meta Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5 bg-surface-muted border border-line/80 px-3 py-1.5 rounded-xl font-medium">
              <MapPinIcon className="w-4 h-4 text-ink-muted" />
              {post.locality}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-surface-muted border border-line/80 px-3 py-1.5 rounded-xl font-medium"><UIMessage>
              Priority: </UIMessage><strong className="text-ink">{post.priority}</strong>
            </span>
            {post.deadline && (
              <span className="inline-flex items-center gap-1.5 bg-surface-muted border border-line/80 px-3 py-1.5 rounded-xl font-medium">
                <ClockIcon className="w-4 h-4 text-ink-muted" /><UIMessage>
                Deadline: </UIMessage>{new Date(post.deadline).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Spam / Duplicate Warnings */}
          {(post.spam_flag || post.duplicates?.length > 0) && (
            <div className="space-y-2 pt-2">
              {post.spam_flag && (
                <div className="bg-danger-soft border border-danger-soft/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-danger">
                  <AlertTriangleIcon className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold"><UIMessage>
                      Auto-flagged as potential spam (score </UIMessage>{post.spam_score}):
                    </span>
                    <span className="ml-1"><UIMessage>
                      Please verify all details carefully before communicating
                      or transacting.
                    </UIMessage></span>
                  </div>
                </div>
              )}
              {post.duplicates?.length > 0 && (
                <div className="bg-warning-soft border border-warning-soft/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-warning">
                  <InfoIcon className="size-4 shrink-0" />
                  <div>
                    <span className="font-semibold"><UIMessage>
                      Similar post detected:
                    </UIMessage></span>
                    <span className="ml-1"><UIMessage>
                      This request matches </UIMessage>{post.duplicates.length}<UIMessage> other open
                      post(s) nearby.
                    </UIMessage></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rating Section — visible when post is Resolved */}
          {post.status === "Resolved" && user && ratingEligibility?.can_rate && !ratingDone && (
            <div className="border-t border-line pt-6">
              <div className="bg-warning-soft border border-warning-soft/60 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-ink text-sm"><UIMessage>
                    Review </UIMessage>{ratingEligibility?.target_name || "your neighbour"}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5"><UIMessage>
                    Review the other person in this exchange. You cannot review yourself.
                  </UIMessage></p>
                </div>

                <form onSubmit={submitRating} className="space-y-4">
                  {/* Star selector */}
                  <div>
                    <p
                      id="rating-label"
                      className="text-xs font-semibold text-ink-soft block mb-2"
                    ><UIMessage>
                      Your rating
                    </UIMessage></p>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setRatingHover(star)}
                          onMouseLeave={() => setRatingHover(0)}
                          aria-label={`Rate ${star} out of 5 stars`}
                          aria-pressed={ratingStars === star}
                          onClick={() => setRatingStars(star)}
                          className="min-w-11 transition-transform hover:scale-110"
                        >
                          <StarIcon
                            className={`w-7 h-7 transition-colors ${
                              star <= (ratingHover || ratingStars)
                                ? "text-warning fill-amber-400"
                                : "text-ink-muted"
                            }`}
                          />
                        </button>
                      ))}
                      {ratingStars > 0 && (
                        <span className="text-xs text-ink-muted ml-2">
                          {
                            [
                              "",
                              "Poor",
                              "Fair",
                              "Good",
                              "Very Good",
                              "Excellent",
                            ][ratingStars]
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tag pills */}
                  <div>
                    <p className="text-xs font-semibold text-ink-soft block mb-2"><UIMessage>
                      Quick tags (optional)
                    </UIMessage></p>
                    <div className="flex flex-wrap gap-2">
                      {RATING_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={ratingTags.includes(tag)}
                          onClick={() => toggleTag(tag)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                            ratingTags.includes(tag)
                              ? "bg-brand-solid text-on-brand border-line"
                              : "bg-surface text-ink-soft border-line hover:border-line"
                          }`}
                        >
                          <UIMessage>{ratingTags.includes(tag) ? "✓ " : ""}</UIMessage>
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Testimonial comment */}
                  <div>
                    <label
                      htmlFor="exchange-review"
                      className="text-xs font-semibold text-ink-soft block mb-1.5"
                    ><UIMessage>
                      Exchange review (optional, public)
                    </UIMessage></label>
                    <UIElement as="textarea"
                      id="exchange-review"
                      maxLength={2000}
                      rows={3}
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Share a quick note about this neighbor's helpfulness..."
                      className="w-full p-3 text-xs bg-surface border border-line rounded-xl focus-visible:outline-brand focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                    />
                  </div>

                  {ratingError && (
                    <p role="alert" className="text-xs text-danger font-medium">
                      {ratingError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={ratingBusy || !ratingStars}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-brand-solid hover:brightness-110 text-on-brand transition-all shadow-xs disabled:opacity-60"
                  >
                    <StarIcon className="w-4 h-4" />
                    <UIMessage>{ratingBusy ? "Submitting..." : "Publish exchange review"}</UIMessage>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Rating done confirmation */}
          {ratingDone && (
            <div className="border-t border-line pt-5">
              <div className="bg-success-soft border border-success-soft rounded-xl p-4 text-center">
                <CheckIcon className="w-6 h-6 text-success mx-auto mb-2" />
                <p className="font-bold text-success text-sm"><UIMessage>
                  Rating Submitted!
                </UIMessage></p>
                <p className="text-xs text-success mt-0.5"><UIMessage>
                  Thank you for helping build community trust. Your review has
                  been saved. Exchange credits are awarded after both
                  participants confirm completion.
                </UIMessage></p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Card (Author & Actions) */}
        <div className="space-y-5">
          {/* Author Card linking to public profile */}
          <Link
            href={`/profile/${post.owner_id}`}
            className="block bg-surface border border-line/90 hover:border-line rounded-xl p-5 shadow-xs transition-all hover:-translate-y-0.5 group"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider"><UIMessage>
                Posted By
              </UIMessage></p>
              <span className="text-[11px] font-semibold text-brand group-hover:underline"><UIMessage>
                View Profile →
              </UIMessage></span>
            </div>

            <div className="flex items-center gap-3">
              <Avatar
                id={post.owner_avatar || "avatar-1"}
                name={post.owner_name}
                size="w-12 h-12"
                className="group-hover:scale-105 transition-transform"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-ink group-hover:text-brand transition-colors truncate text-sm">
                    {post.owner_name}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                  <span className="bg-brand-soft text-brand px-2 py-0.5 rounded-md font-semibold text-[10px]">
                    <BadgeTier tier={post.owner_badge} />
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Action Card */}
          <div className="bg-surface border border-line/90 rounded-xl p-5 shadow-xs">
            {isOwner ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-ink text-sm mb-1"><UIMessage>
                    Manage Post Status
                  </UIMessage></h4>
                  <p className="text-xs text-ink-muted"><UIMessage>
                    Update status as your help request progresses.
                  </UIMessage></p>
                </div>

                <div className="grid grid-cols-3 gap-1.5 bg-surface-muted p-1 rounded-xl">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={busy || post.status === s}
                      onClick={() => updateStatus(s)}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        post.status === s
                          ? "bg-surface text-ink shadow-xs"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="pt-2 space-y-2">
                  <Link
                    href="/inbox"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-surface-strong hover:bg-surface-strong text-on-brand transition-colors"
                  >
                    <span><UIMessage>View Responses in Inbox</UIMessage></span>
                    <span>&rarr;</span>
                  </Link>
                  {/* Admin delete */}
                  {isOwner && (
                    <button
                      disabled={busy}
                      onClick={startEdit}
                      className="w-full rounded-xl border border-line text-brand py-2 text-xs font-semibold"
                    ><UIMessage>
                      Edit Post
                    </UIMessage></button>
                  )}
                  {isOwner && (
                    <button
                      onClick={deletePost}
                      disabled={busy}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-danger bg-danger-soft hover:bg-danger-soft border border-danger-soft transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" /><UIMessage>
                      Delete Post
                    </UIMessage></button>
                  )}
                </div>
              </div>
            ) : !user ? (
              <div className="text-center py-4 space-y-3">
                <h4 className="font-bold text-ink text-sm"><UIMessage>Want to help?</UIMessage></h4>
                <p className="text-xs text-ink-muted"><UIMessage>
                  Sign in to contact </UIMessage>{post.owner_name}<UIMessage> and offer assistance.
                </UIMessage></p>
                <Link
                  href={`/login?next=${encodeURIComponent(`/post/${id}`)}`}
                  className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-semibold bg-brand-solid hover:bg-brand-solid text-on-brand transition-colors shadow-xs"
                ><UIMessage>
                  Log in to Respond
                </UIMessage></Link>
              </div>
            ) : sent ? (
              <div className="bg-success-soft border border-success-soft rounded-xl p-4 text-center space-y-2">
                <div className="w-8 h-8 bg-success-soft text-success rounded-full flex items-center justify-center mx-auto">
                  <CheckIcon className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-success text-sm"><UIMessage>
                  Response Sent!
                </UIMessage></h4>
                <p className="text-xs text-success">
                  {post.owner_name}<UIMessage> has received your offer. You can track this
                  in your Inbox.
                </UIMessage></p>
                <Link
                  href="/inbox"
                  className="inline-block mt-2 text-xs font-semibold text-success underline"
                ><UIMessage>
                  Go to Inbox
                </UIMessage></Link>
              </div>
            ) : (
              <form onSubmit={respond} aria-busy={busy} className="space-y-3">
                {needsVerification && (
                  <p className="rounded-lg bg-warning-soft text-warning p-3 text-sm"><UIMessage>
                    Community verification is required before responding.</UIMessage>{" "}
                    <Link className="underline" href="/settings?tab=trust"><UIMessage>
                      Open Trust & Verification
                    </UIMessage></Link><UIMessage>
                    . Your message will stay here until you leave this page.
                  </UIMessage></p>
                )}
                <div>
                  <h4 className="font-bold text-ink text-sm mb-1">
                    <UIMessage>{post.is_demo ? "Sample notice" : "Offer help / respond"}</UIMessage>
                  </h4>
                  {post.is_demo && (
                    <p className="text-sm text-warning mb-3"><UIMessage>
                      This sample shows how a notice looks. Create your own post
                      to arrange a real exchange.
                    </UIMessage></p>
                  )}
                  <p className="text-xs text-ink-muted mb-2"><UIMessage>
                    Send a brief note introducing yourself.
                  </UIMessage></p>
                  <label
                    htmlFor="exchange-response"
                    className="text-sm font-medium block mb-2"
                  ><UIMessage>
                    Message to the post author
                  </UIMessage></label>
                  <UIElement as="textarea"
                    id="exchange-response"
                    disabled={busy}
                    maxLength={2000}
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hi! I live nearby and can help you with this today..."
                    className="w-full p-3 text-xs bg-surface-muted border border-line rounded-xl focus:bg-surface focus-visible:outline-brand focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  />
                </div>

                {responseError && (
                  <div className="bg-danger-soft border border-danger-soft rounded-xl p-3 text-xs text-danger space-y-1">
                    <p role="alert" className="font-semibold">
                      {responseError}
                    </p>
                    {responseError.toLowerCase().includes("verified") && (
                      <Link
                        href="/settings"
                        className="text-brand underline font-semibold block mt-1"
                      ><UIMessage>
                        Go to Settings → Submit Verification Proof
                      </UIMessage></Link>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy || post.is_demo || needsVerification}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-brand-solid hover:bg-brand-solid text-on-brand transition-all shadow-xs hover:shadow-line disabled:opacity-60"
                >
                  <SendIcon className="w-4 h-4" />
                  <span>
                    {busy ? "Sending Response..." : <Text>Send Response</Text>}
                  </span>
                </button>
              </form>
            )}

            {/* Moderator Controls for Admin/Super Admin viewing someone else's post */}
            {isAdminOrSuper && !isOwner && (
              <div className="border-t border-line pt-4 mt-2 space-y-2">
                <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wide"><UIMessage>
                  Moderator Controls
                </UIMessage></h4>
                <div className="grid grid-cols-3 gap-1.5 bg-surface-muted p-1 rounded-xl">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={busy || post.status === s}
                      onClick={() => updateStatus(s)}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        post.status === s
                          ? "bg-surface text-ink shadow-xs"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={deletePost}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-danger bg-danger-soft hover:bg-danger-soft border border-danger-soft transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" /><UIMessage>
                  Delete Post (Admin)
                </UIMessage></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
