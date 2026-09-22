"use client";
import Link from "next/link";
import Avatar from "./Avatars";
import { MapPinIcon, ShieldCheckIcon, AlertTriangleIcon } from "./Icons";

const PRIORITY_BADGE = {
  High: "bg-rose-50 text-rose-700 border-rose-200/80",
  Medium: "bg-amber-50 text-amber-800 border-amber-200/80",
  Low: "bg-slate-50 text-slate-600 border-slate-200",
};

const STATUS_BADGE = {
  Open: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200/80",
  Resolved: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function PostCard({ post }) {
  return (
    <Link href={`/post/${post.id}`} className="block group">
      <div className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full group-hover:-translate-y-0.5">
        
        <div>
          {/* Top badges: Type / Priority / Status */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${PRIORITY_BADGE[post.priority] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                {post.priority === "High" && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                {post.priority} Priority
              </span>
              <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {post.type}
              </span>
            </div>

            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${STATUS_BADGE[post.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${post.status === "Open" ? "bg-emerald-500" : post.status === "In Progress" ? "bg-amber-500" : "bg-slate-400"}`} />
              {post.status}
            </span>
          </div>

          {/* Optional Post Photo */}
          {post.image_url && (
            <div className="relative w-full h-36 mb-3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60">
              <img
                src={`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}${post.image_url}`}
                alt=""
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              />
            </div>
          )}

          {/* Title and Description */}
          <h3 className="font-semibold text-base text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug mb-1.5 line-clamp-2">
            {post.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
            {post.description}
          </p>
        </div>

        <div>
          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mb-4">
            <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
              <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
              {post.locality}
            </span>
            <span className="inline-flex items-center bg-indigo-50/70 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg font-medium">
              {post.category}
            </span>
            {post.spam_flag && (
              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200/60 px-2 py-0.5 rounded-lg text-[10px] font-semibold">
                <AlertTriangleIcon className="w-3 h-3" />
                Flagged
              </span>
            )}
          </div>

          {/* Author Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Avatar id={post.owner_avatar || "avatar-1"} name={post.owner_name} size="w-7 h-7" className="rounded-full" />
              <div className="leading-tight">
                <p className="font-medium text-slate-800">{post.owner_name}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                  <span className="bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.2 rounded text-[10px]">
                    {post.owner_badge || "Neighbor"}
                  </span>
                </div>
              </div>
            </div>

            <span className="text-indigo-600 font-medium text-xs group-hover:translate-x-0.5 transition-transform">
              View &rarr;
            </span>
          </div>
        </div>

      </div>
    </Link>
  );
}
