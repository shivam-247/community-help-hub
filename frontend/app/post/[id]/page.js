"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "../../../components/ToastProvider";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { PostDetailSkeleton } from "../../../components/Skeleton";
import Avatar from "../../../components/Avatars";
import {
  MapPinIcon,
  ClockIcon,
  StarIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckIcon,
  SendIcon,
  TrashIcon,
} from "../../../components/Icons";

const STATUSES = ["Open", "In Progress", "Resolved"];
const RATING_TAGS = ["Fast Response", "Generous", "Reliable Neighbor", "Skillful", "Safe & Polite"];

export default function PostDetailPage({ params }) {
  const { id } = use(params);
  const auth = useAuth();
  const router = useRouter();
  const notify = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // Rating state
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingTags, setRatingTags] = useState([]);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [ratingError, setRatingError] = useState("");

  const load = async () => {
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

  if (error) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 mb-4">
          <AlertTriangleIcon className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-rose-900">{error}</p>
        </div>
        <Link href="/" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
          &larr; Back to Feed
        </Link>
      </div>
    );
  }

  if (!post) {
    return <PostDetailSkeleton />;
  }

  const user = auth?.user;
  const isOwner = user?.id === post.owner_id;
  const isAdminOrSuper = user?.role === "admin" || user?.role === "super_admin";
  const authorInitial = post.owner_name ? post.owner_name.charAt(0).toUpperCase() : "U";

  const respond = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/posts/${id}/respond`, { method: "POST", auth: true, body: { message } });
      setSent(true);
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (status) => {
    setBusy(true);
    try {
      const updated = await api(`/posts/${id}/status`, { method: "PATCH", auth: true, body: { status } });
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
    if (!ratingStars) { setRatingError("Please select a star rating."); return; }
    setRatingBusy(true);
    setRatingError("");
    try {
      await api(`/posts/${id}/rate`, {
        method: "POST", auth: true,
        body: { stars: ratingStars, tags: ratingTags, comment: ratingComment || null },
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
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const startEdit = () => {
    const date = post.deadline ? new Date(post.deadline) : null;
    const localDate = date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
    setDraft({ title: post.title, description: post.description, priority: post.priority, deadline: localDate });
    setEditing(true);
  };
  const saveEdit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const updated = await api(`/posts/${id}`, { method: "PATCH", auth: true, body: { ...draft, deadline: draft.deadline ? new Date(draft.deadline).toISOString() : null } });
      setPost(updated);
      setEditing(false);
      notify("Post updated.");
    } catch (err) { notify(err.message, "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        &larr; Back to all posts
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Main Content */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          
          {/* Post Header Badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                {post.type}
              </span>
              <span className="text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full">
                {post.category}
              </span>
            </div>

            <span className={`text-xs font-semibold px-3 py-1 rounded-full border inline-flex items-center gap-1.5 ${
              post.status === "Open"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : post.status === "In Progress"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                post.status === "Open" ? "bg-emerald-500" : post.status === "In Progress" ? "bg-amber-500" : "bg-slate-400"
              }`} />
              {post.status}
            </span>
          </div>

          {/* Title */}
          {editing && isOwner && <form onSubmit={saveEdit} className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-4">
            <h2 className="font-bold">Edit your post</h2>
            <label className="block text-sm">Title<input required maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="block text-sm">Description<textarea required maxLength={10000} rows={5} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="block text-sm">Priority<select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} className="mt-1 w-full rounded-lg border p-2">{["Low", "Medium", "High"].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="block text-sm">Deadline (your local time)<input type="datetime-local" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
            <div className="flex gap-3"><button disabled={busy} className="rounded-lg bg-indigo-600 text-white px-4 py-2 disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button><button type="button" disabled={busy} onClick={() => setEditing(false)} className="rounded-lg border px-4 py-2">Cancel</button></div>
          </form>}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
            {post.title}
          </h1>

          {/* Attached Photo */}
          {post.image_url && (
            <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 max-h-96">
              <img
                src={`/api/backend${post.image_url}`}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Body Description */}
          <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {post.description}
          </div>

          {/* Meta Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl font-medium">
              <MapPinIcon className="w-4 h-4 text-slate-400" />
              {post.locality}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl font-medium">
              Priority: <strong className="text-slate-800">{post.priority}</strong>
            </span>
            {post.deadline && (
              <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl font-medium">
                <ClockIcon className="w-4 h-4 text-slate-400" />
                Deadline: {new Date(post.deadline).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Spam / Duplicate Warnings */}
          {(post.spam_flag || post.duplicates?.length > 0) && (
            <div className="space-y-2 pt-2">
              {post.spam_flag && (
                <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Auto-flagged as potential spam (score {post.spam_score}):</span>
                    <span className="ml-1">Please verify all details carefully before communicating or transacting.</span>
                  </div>
                </div>
              )}
              {post.duplicates?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-800">
                  <span className="text-sm shrink-0">🔁</span>
                  <div>
                    <span className="font-semibold">Similar post detected:</span>
                    <span className="ml-1">This request matches {post.duplicates.length} other open post(s) nearby.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rating Section — visible when post is Resolved */}
          {post.status === "Resolved" && user && !ratingDone && (
            <div className="border-t border-slate-100 pt-6">
              <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Rate this Exchange</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This post is resolved. Share your experience with the community.
                  </p>
                </div>

                <form onSubmit={submitRating} className="space-y-4">
                  {/* Star selector */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Your Rating</label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setRatingHover(star)}
                          onMouseLeave={() => setRatingHover(0)}
                          onClick={() => setRatingStars(star)}
                          className="transition-transform hover:scale-125 focus:outline-none"
                        >
                          <StarIcon
                            className={`w-7 h-7 transition-colors ${
                              star <= (ratingHover || ratingStars)
                                ? "text-amber-400 fill-amber-400"
                                : "text-slate-300"
                            }`}
                          />
                        </button>
                      ))}
                      {ratingStars > 0 && (
                        <span className="text-xs text-slate-500 ml-2">
                          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][ratingStars]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tag pills */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Quick Tags (optional)</label>
                    <div className="flex flex-wrap gap-2">
                      {RATING_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                            ratingTags.includes(tag)
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          {ratingTags.includes(tag) ? "✓ " : ""}{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Testimonial comment */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Testimonial (optional)</label>
                    <textarea
                      rows={3}
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Share a quick note about this neighbor's helpfulness..."
                      className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                    />
                  </div>

                  {ratingError && (
                    <p className="text-xs text-rose-700 font-medium">{ratingError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={ratingBusy || !ratingStars}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs disabled:opacity-60"
                  >
                    <StarIcon className="w-4 h-4" />
                    {ratingBusy ? "Submitting..." : "Submit Rating & Testimonial"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Rating done confirmation */}
          {ratingDone && (
            <div className="border-t border-slate-100 pt-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                <CheckIcon className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-emerald-900 text-sm">Rating Submitted!</p>
                <p className="text-xs text-emerald-700 mt-0.5">Thank you for helping build community trust. +10 credits awarded.</p>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Card (Author & Actions) */}
        <div className="space-y-5">
          
          {/* Author Card linking to public profile */}
          <Link
            href={`/profile/${post.owner_id}`}
            className="block bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-5 shadow-xs transition-all hover:-translate-y-0.5 group"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Posted By</p>
              <span className="text-[11px] font-semibold text-indigo-600 group-hover:underline">
                View Profile &rarr;
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Avatar id={post.owner_avatar || "avatar-1"} name={post.owner_name} size="w-12 h-12" className="group-hover:scale-105 transition-transform" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-sm">
                    {post.owner_name}
                  </h4>
                  {(post.owner_badge === "Trusted Helper" || post.owner_badge === "Community Champion") && (
                    <span title="Verified Helper" className="text-emerald-600">
                      <ShieldCheckIcon className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                    {post.owner_badge || "Neighbor"}
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Action Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            {isOwner ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Manage Post Status</h4>
                  <p className="text-xs text-slate-500">Update status as your help request progresses.</p>
                </div>

                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={busy || post.status === s}
                      onClick={() => updateStatus(s)}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        post.status === s
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="pt-2 space-y-2">
                  <Link
                    href="/inbox"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                  >
                    <span>View Responses in Inbox</span>
                    <span>&rarr;</span>
                  </Link>
                  {/* Admin delete */}
                  {isOwner && <button disabled={busy} onClick={startEdit} className="w-full rounded-xl border border-indigo-200 text-indigo-700 py-2 text-xs font-semibold">Edit Post</button>}
                  {isOwner && (
                    <button
                      onClick={deletePost}
                      disabled={busy}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Delete Post
                    </button>
                  )}
                </div>
              </div>
            ) : !user ? (
              <div className="text-center py-4 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Want to help?</h4>
                <p className="text-xs text-slate-500">Sign in to contact {post.owner_name} and offer assistance.</p>
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
                >
                  Log in to Respond
                </Link>
              </div>
            ) : sent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckIcon className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-emerald-900 text-sm">Response Sent!</h4>
                <p className="text-xs text-emerald-700">
                  {post.owner_name} has received your offer. You can track this in your Inbox.
                </p>
                <Link
                  href="/inbox"
                  className="inline-block mt-2 text-xs font-semibold text-emerald-800 underline"
                >
                  Go to Inbox
                </Link>
              </div>
            ) : (
              <form onSubmit={respond} className="space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Offer Help / Respond</h4>
                  <p className="text-xs text-slate-500 mb-2">Send a brief note introducing yourself.</p>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hi! I live nearby and can help you with this today..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
                    <p className="font-semibold">{error}</p>
                    {error.toLowerCase().includes("verified") && (
                      <Link href="/settings" className="text-indigo-600 underline font-semibold block mt-1">
                        Go to Settings &rarr; Submit Verification Proof
                      </Link>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs hover:shadow-indigo-200 disabled:opacity-60"
                >
                  <SendIcon className="w-4 h-4" />
                  <span>{busy ? "Sending Response..." : "Send Response"}</span>
                </button>
              </form>
            )}

            {/* Moderator Controls for Admin/Super Admin viewing someone else's post */}
            {isAdminOrSuper && !isOwner && (
              <div className="border-t border-slate-200 pt-4 mt-2 space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Moderator Controls</h4>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={busy || post.status === s}
                      onClick={() => updateStatus(s)}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        post.status === s
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={deletePost}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Delete Post (Admin)
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

