"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { LOCATIONS_DATA, STATES_LIST } from "../lib/locations";
import PostCard from "../components/PostCard";
import { PostCardSkeleton } from "../components/Skeleton";
import { SearchIcon, MapPinIcon, PlusIcon, AlertTriangleIcon } from "../components/Icons";

const TYPES = ["All", "Need help", "Offer help", "Request item", "Offer service"];
const PRIORITIES = ["All", "High", "Medium", "Low"];
const CATEGORIES = ["All", "Help Requests", "Donations & Giveaways", "Skill Offers", "Community Alerts"];

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [state, setState] = useState("");
  const [locality, setLocality] = useState("");
  const [type, setType] = useState("All");
  const [priority, setPriority] = useState("All");
  const [category, setCategory] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("deadline");

  // Localities available for the selected state
  const stateLocalities = state ? (LOCATIONS_DATA[state] || []) : [];

  // When state changes, reset locality
  const handleStateChange = (newState) => {
    setState(newState);
    setLocality("");
  };

  // The filter sent to the API: if a specific locality is chosen use it,
  // else if a state is chosen send the state name for substring matching
  const localityFilter = locality || state;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (localityFilter) params.set("locality", localityFilter);
      if (type !== "All") params.set("type", type);
      if (priority !== "All") params.set("priority", priority);
      if (category !== "All") params.set("category", category);
      if (q) params.set("q", q);
      params.set("sort", sort);
      const data = await api(`/posts?${params.toString()}`);
      setPosts(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [localityFilter, type, priority, category, q, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const clearFilters = () => {
    setState("");
    setLocality("");
    setType("All");
    setPriority("All");
    setCategory("All");
    setQ("");
    setSort("deadline");
  };

  const hasActiveFilters = state || locality || type !== "All" || priority !== "All" || category !== "All" || q;

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="text-center max-w-2xl mx-auto pt-2 pb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Live Neighborhood Noticeboard
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Real help, tracked properly.
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-500">
          Connect with trusted neighbors for emergency tasks, borrowing tools, donating items, or sharing skills.
        </p>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-medium">
        {CATEGORIES.map((cat) => {
          const selected = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selected
                  ? "bg-slate-900 text-white shadow-xs font-semibold"
                  : "bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              {cat === "Help Requests" && <span className="w-2 h-2 rounded-full bg-rose-500" />}
              {cat === "Donations & Giveaways" && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              {cat === "Skill Offers" && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
              {cat === "Community Alerts" && <span className="w-2 h-2 rounded-full bg-sky-500" />}
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Modern Search & Filters Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          
          {/* Keyword Search */}
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Search keyword</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <SearchIcon className="w-4 h-4" />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Plumber, tutor, ladder, medicine..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* State Dropdown */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="w-3 h-3" /> State
              </span>
            </label>
            <select
              value={state}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="">All States</option>
              {STATES_LIST.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Locality Dropdown (cascading from state) */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Locality / Area</label>
            <select
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              disabled={!state}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All in {state || "State"}</option>
              {stateLocalities.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Post Type */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

        </div>

        {/* Sort + active filters row */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2">
            <label className="text-slate-500 font-medium shrink-0">Sort by:</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all"
            >
              <option value="deadline">By deadline</option>
              <option value="newest">Newest first</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-800 text-sm">
          <AlertTriangleIcon className="w-5 h-5 text-rose-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Feed Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center max-w-md mx-auto shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-4">
            📌
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-1">No posts found</h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-5">
            {hasActiveFilters
              ? "Try adjusting your search criteria or clearing filters to see more results."
              : "Be the first neighbor to post a request or offer in your area."}
          </p>
          <div className="flex items-center justify-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Clear Filters
              </button>
            )}
            <Link
              href="/create-post"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Post a Request</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
