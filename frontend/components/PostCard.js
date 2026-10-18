"use client";
import Link from "next/link";
import SafetyMenu, { useSafety } from "./SafetyMenu";
import PostImage from "./PostImage";
import { useLanguage } from "../lib/i18n";
import {
  MapPin,
  Clock,
  ArrowUpRight,
  HandHeart,
  Gift,
  Wrench,
  Megaphone,
} from "lucide-react";
import { Badge } from "./ui";
import Avatar from "./Avatars";
import MemberBadge from "./MemberBadge";
import BadgeTier from "./BadgeTier";
export default function PostCard({ post }) {
  const { hidden } = useSafety();
  const { t, language } = useLanguage();
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
  if (hidden.includes(post.id)) return null;
  const CategoryIcon =
    {
      "Help Requests": HandHeart,
      "Donations & Giveaways": Gift,
      "Skill Offers": Wrench,
      "Community Alerts": Megaphone,
    }[post.category] || HandHeart;
  const relative = new Intl.RelativeTimeFormat(
    language === "gu" ? "gu-IN" : language === "hi" ? "hi-IN" : "en-IN",
    { numeric: "auto" },
  );
  return (
    <article
      className={`post-card flex flex-col gap-4 ${{ "Help Requests": "tone-help", "Donations & Giveaways": "tone-give", "Skill Offers": "tone-skill", "Community Alerts": "tone-alert" }[post.category] || "tone-help"}`}
    >
      <div className="flex items-center gap-3">
        <Avatar id={post.owner_avatar} name={post.owner_name} size="size-10" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{post.owner_name}</p>
          <p className="flex items-center gap-1 text-xs text-ink-muted mt-1">
            <MapPin aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{post.locality}</span>
          </p>
          <div className="mt-1.5">
            <BadgeTier tier={post.owner_badge} />
          </div>
        </div>
        <SafetyMenu postId={post.id} ownerId={post.owner_id} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="category-label">
          <CategoryIcon aria-hidden="true" className="size-3.5" />
          {t(post.category)}
        </Badge>
        <Badge variant="outline">{post.type}</Badge>
        <Badge
          variant={
            post.priority === "High"
              ? "destructive"
              : post.priority === "Medium"
                ? "warning"
                : "outline"
          }
        >
          {post.priority}
        </Badge>
        {post.is_demo && <Badge variant="outline">Sample</Badge>}
        {post.priority_listing && (
          <Badge variant="outline">Priority listing</Badge>
        )}
        <span className="text-xs text-ink-muted ml-auto flex items-center gap-1.5">
          <span
            className={`size-1.5 rounded-full ${post.status === "Open" ? "bg-success" : "bg-ink-muted"}`}
          />
          {t(post.status)}
        </span>
      </div>
      {post.image_url && (
        <PostImage src={post.image_url} title={post.title} className="h-40" />
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
          <span>
            {age < 1
              ? t("Just posted")
              : age < 24
                ? relative.format(-age, "hour")
                : relative.format(-Math.floor(age / 24), "day")}
          </span>
          <MemberBadge plan={post.owner_plan} />
        </div>
        <Link
          href={`/post/${post.id}`}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold px-4 rounded-full post-action"
          aria-label={`View ${post.title}`}
        >
          {t("View post")}
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
