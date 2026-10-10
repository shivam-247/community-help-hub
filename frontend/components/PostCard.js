"use client";
import Link from "next/link";
import { MapPin, Clock, ArrowUpRight } from "lucide-react";
import { Badge } from "./ui";
import Avatar from "./Avatars";
import BadgeTier from "./BadgeTier";
export default function PostCard({ post }) {
  const age = Math.max(
    0,
    Math.floor(
      (Date.now() -
        new Date(
          post.created_at +
            (/Z|[+-]\d\d:\d\d$/.test(post.created_at) ? "" : "Z"),
        ).getTime()) /
        3600000,
    ),
  );
  return (
    <article className="post-card flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{post.category}</Badge>
        {post.is_demo && <Badge variant="outline">Sample</Badge>}
        {post.priority_listing && (
          <Badge variant="outline">Priority listing</Badge>
        )}
        <span className="text-xs text-ink-muted ml-auto">{post.status}</span>
      </div>
      {post.image_url && (
        <img
          src={`/api/backend${post.image_url}`}
          alt={`Photo accompanying ${post.title}`}
          loading="lazy"
          className="w-full h-40 object-cover rounded-lg"
        />
      )}
      <div className="flex-1">
        <h3 className="text-lg font-semibold leading-snug">
          <Link className="hover:text-brand" href={`/post/${post.id}`}>
            {post.title}
          </Link>
        </h3>
        <p className="text-sm text-ink-muted line-clamp-2 leading-relaxed mt-2">
          {post.description}
        </p>
      </div>
      <div className="space-y-2 text-xs text-ink-muted">
        <p className="flex gap-1.5 items-center">
          <MapPin className="size-3.5 shrink-0" />
          {post.locality}
        </p>
        <p className="flex gap-1.5 items-center">
          <Clock className="size-3.5" />
          {age < 1
            ? "Just posted"
            : age < 24
              ? `${age} ${age === 1 ? "hour" : "hours"} ago`
              : `${Math.floor(age / 24)} ${Math.floor(age / 24) === 1 ? "day" : "days"} ago`}
        </p>
      </div>
      <div className="flex items-center gap-2 border-t border-line pt-4">
        <Avatar id={post.owner_avatar} name={post.owner_name} size="size-10" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate mb-1.5">
            {post.owner_name}
          </p>
          <BadgeTier tier={post.owner_badge} />
        </div>
        <Link
          href={`/post/${post.id}`}
          className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-brand px-2 rounded-lg hover:bg-brand-soft"
          aria-label={`View ${post.title}`}
        >
          View
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
