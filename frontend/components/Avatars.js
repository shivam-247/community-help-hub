"use client";
import Image from "next/image";
import { useState } from "react";
export const AVATAR_LABELS = {};
export default function Avatar({
  id,
  name = "Neighbour",
  size = "w-10 h-10",
  className = "",
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => Array.from(w)[0])
    .join("")
    .toUpperCase();
  const photo =
    typeof id === "string" && /^\/uploads\/u\d+_[a-f0-9]{32}\.png$/.test(id);
  const colors = [
    "bg-brand-soft text-brand",
    "bg-success-soft text-success",
    "bg-surface-muted text-ink-soft",
  ];
  const hash = Array.from(name).reduce((a, c) => a + c.codePointAt(0), 0);
  return (
    <span
      className={`${size} ${colors[hash % colors.length]} ${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line text-sm font-semibold`}
      role="img"
      aria-label={name}
    >
      {photo && !failed ? (
        <Image
          unoptimized
          width={80}
          height={80}
          src={`/api/backend${id}`}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials || "N"}</span>
      )}
    </span>
  );
}
