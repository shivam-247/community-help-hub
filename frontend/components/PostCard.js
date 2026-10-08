"use client";
import Link from "next/link";
import { Badge, Icon } from "@santi020k/lumen-react";
import Avatar from "./Avatars";
export default function PostCard({ post }) {
  return <Link href={`/post/${post.id}`} className="block h-full">
    <article className="post-card flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="secondary">{post.type}</Badge><Badge variant={post.status === "Open" ? "success" : post.status === "In Progress" ? "warning" : "outline"}>{post.status}</Badge></div>
      {post.image_url && <img src={`/api/backend${post.image_url}`} alt="" loading="lazy" className="w-full h-40 object-cover rounded-lg bg-surface-muted" />}
      <div className="flex-1"><p className="text-xs text-brand font-medium mb-2">{post.category}</p><h3 className="text-base font-semibold leading-snug line-clamp-2">{post.title}</h3><p className="text-sm text-ink-muted leading-relaxed line-clamp-2 mt-2">{post.description}</p></div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted"><span className="inline-flex items-center gap-1"><Icon name="map-pin" size="sm" decorative />{post.locality}</span><span className={post.priority === "High" ? "text-danger" : ""}>{post.priority} priority</span>{post.spam_flag && <Badge variant="destructive">Flagged for review</Badge>}</div>
      <div className="border-t border-line pt-4 flex items-center gap-2"><Avatar id={post.owner_avatar || "avatar-1"} name={post.owner_name} size="w-8 h-8" /><div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{post.owner_name}</p><p className="text-xs text-ink-muted mt-0.5">{post.owner_badge || "Neighbor"}</p></div><Icon name="arrow-up-right" decorative size="sm" className="text-brand" /></div>
    </article>
  </Link>;
}
