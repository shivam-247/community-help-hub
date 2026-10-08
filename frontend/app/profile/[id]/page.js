"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import Avatar from "../../../components/Avatars";
import {
  ShieldCheckIcon,
  MapPinIcon,
  CalendarIcon,
  SettingsIcon,
  AlertTriangleIcon,
  CheckIcon,
} from "../../../components/Icons";

const BADGE_TIERS = [
  { name: "Newcomer", min: 0 },
  { name: "Helper", min: 5 },
  { name: "Active Helper", min: 20 },
  { name: "Trusted Helper", min: 50 },
  { name: "Community Champion", min: 100 },
];

export default function ProfilePage({ params }) {
  const { id } = use(params);
  const auth = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const data = await api(`/users/${id}`);
        setProfile(data);
      } catch (err) {
        setError(err.message || "Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [id]);

  const isMe = auth?.user && String(auth.user.id) === String(id);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-slate-200 rounded-2xl"></div>
            <div className="space-y-2 flex-1">
              <div className="w-48 h-6 bg-slate-200 rounded-lg"></div>
              <div className="w-32 h-4 bg-slate-100 rounded"></div>
            </div>
          </div>
          <div className="w-full h-12 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800">
          <AlertTriangleIcon className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <h3 className="font-bold text-sm">User Not Found</h3>
          <p className="text-xs text-rose-600 mt-1">{error || "This profile could not be loaded."}</p>
        </div>
        <Link href="/" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
          &larr; Return to Community Noticeboard
        </Link>
      </div>
    );
  }

  const isSuperAdmin = profile.role === "super_admin";

  // Calculate progress to next badge tier
  const currentTierIndex = BADGE_TIERS.findIndex((t) => t.name === profile.badge);
  const nextTier = BADGE_TIERS[currentTierIndex + 1];
  const progressPercent = nextTier
    ? Math.min(100, Math.round((profile.credits / nextTier.min) * 100))
    : 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        &larr; Back to all posts
      </Link>

      {/* Hero Profile Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          
          <div className="flex items-center gap-4 sm:gap-5">
            <Avatar id={profile.avatar || "avatar-1"} name={profile.name} size="w-20 h-20" className="shadow-lg ring-4 ring-indigo-50 shrink-0" />

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">{profile.name}</h1>
                {isSuperAdmin && (
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider select-none shadow-xs">
                    Super Admin
                  </span>
                )}
                {profile.verification_status === "Verified" && !isSuperAdmin && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none">
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Neighbor
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                  {profile.locality}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action: Edit settings if viewing own profile */}
          {isMe && (
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-all select-none"
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Settings &amp; Privacy</span>
            </Link>
          )}
        </div>

        {/* Reputation & Trust Stats Bar — Clean and star-free */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 select-none">
          
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Badge Rank</span>
            <span className="font-bold text-indigo-700 text-sm mt-0.5 block">
              {isSuperAdmin ? "👑 Super Admin" : `🏅 ${profile.badge}`}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Exchanges Rated</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {profile.rating_count} Completed
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Community Credits</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.credits} pts</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Posts Published</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.active_posts.length}</span>
          </div>

        </div>

        {/* Badge Progression Meter */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2 select-none">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-indigo-900">
              Reputation Level: <strong className="text-indigo-700">{profile.badge}</strong>
            </span>
            {nextTier ? (
              <span className="text-indigo-600 font-medium">
                {profile.credits} / {nextTier.min} credits to reach <strong>{nextTier.name}</strong>
              </span>
            ) : (
              <span className="text-emerald-700 font-bold">Top Tier Achieved 🏆</span>
            )}
          </div>

          <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

      </div>

      {/* Tabs: Active Posts vs Neighbor Reviews */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 select-none">
        <button
          onClick={() => setActiveTab("posts")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === "posts"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Community Notices</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "posts" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-600"
          }`}>
            {profile.active_posts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("reviews")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === "reviews"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Neighbor Testimonials</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === "reviews" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-600"
          }`}>
            {profile.reviews.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Posts by this User */}
      {activeTab === "posts" && (
        profile.active_posts.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center shadow-xs">
            <p className="text-xs text-slate-500">No community notices posted yet by this neighbor.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profile.active_posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="block bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-4 shadow-xs transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {post.type}
                      </span>
                      <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                        {post.category}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm leading-snug">{post.title}</h4>
                  </div>

                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${
                    post.status === "Open"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : post.status === "In Progress"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    {post.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* Tab 2: Reviews Received */}
      {activeTab === "reviews" && (
        profile.reviews.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-xl mb-3">
              🤝
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">No testimonials yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Testimonials are submitted after completing a mutual aid exchange or item giveaway.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {profile.reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{rev.rater_name}</span>
                    <span className="text-slate-400 text-[10px]">· {rev.rater_badge}</span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                    <CheckIcon className="w-3 h-3 text-emerald-600" />
                    Verified Exchange
                  </span>
                </div>

                {rev.comment && (
                  <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                )}

                {rev.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rev.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-100 select-none"
                      >
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

    </div>
  );
}

