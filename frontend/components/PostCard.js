"use client";
import Link from "next/link";
import { MapPin, Clock, ArrowUpRight } from "lucide-react";
import { Badge } from "./ui";
import Avatar from "./Avatars";
import MemberBadge from "./MemberBadge";
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
      <div className="flex items-center gap-3">
        <Avatar id={post.owner_avatar} name={post.owner_name} size="size-10" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{post.owner_name}</p>
          <p className="flex items-center gap-1 text-xs text-ink-muted mt-1"><MapPin aria-hidden="true" className="size-3 shrink-0" />{post.locality}</p>
        </div>
        <BadgeTier tier={post.owner_badge} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{post.category}</Badge>
        {post.is_demo && <Badge variant="outline">Sample</Badge>}
        {post.priority_listing && (
          <Badge variant="outline">Priority listing</Badge>
        )}
        <span className="text-xs text-ink-muted ml-auto flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${post.status === "Open" ? "bg-success" : "bg-ink-muted"}`} />{post.status}</span>
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
        <h3 className="text-xl font-semibold leading-snug">
          <Link className="hover:text-brand" href={`/post/${post.id}`}>
            {post.title}
          </Link>
        </h3>
        <p className="text-sm text-ink-muted line-clamp-2 leading-relaxed mt-2">
          {post.description}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <Clock aria-hidden="true" className="size-3.5" />
          <span>{age < 1 ? "Just posted" : age < 24 ? `${age}h ago` : `${Math.floor(age / 24)}d ago`}</span>
          <MemberBadge plan={post.owner_plan} />
        </div>
        <Link
          href={`/post/${post.id}`}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-brand px-3 rounded-lg bg-brand-soft hover:brightness-95"
          aria-label={`View ${post.title}`}
        >
          View post
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
