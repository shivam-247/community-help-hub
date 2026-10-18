"use client";
import Image from "next/image";
import { useState } from "react";
export default function PostImage({ src, title, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <p className="rounded-lg bg-surface-muted p-4 text-sm text-ink-muted">
        The attached photo could not load. Read the notice details or ask its
        author.
      </p>
    );
  // Browser loading preserves cookies on private society attachments.
  return (
    <Image
      unoptimized
      width={960}
      height={640}
      src={`/api/backend${src}`}
      alt={`Attachment for: ${title}`}
      loading="lazy"
      className={`w-full max-h-80 object-cover rounded-lg ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
