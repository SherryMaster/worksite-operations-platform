"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

const sizeClasses = {
  xs: "size-8 text-[0.625rem]",
  sm: "size-9 text-xs",
  md: "size-10 text-xs",
} as const;

const imageSizes = {
  xs: "32px",
  sm: "36px",
  md: "40px",
} as const;

function workerInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "?";
}

export function WorkerAvatar({
  className,
  name,
  photoId,
  size = "sm",
  workerId,
}: {
  className?: string;
  name: string;
  photoId?: string | null;
  size?: keyof typeof sizeClasses;
  workerId?: string | null;
}) {
  const [failedPhotoId, setFailedPhotoId] = useState<string | null>(null);
  const canLoadPhoto =
    Boolean(workerId && photoId) && failedPhotoId !== photoId;

  return (
    <span
      role="img"
      aria-label={`Profile photo for ${name}`}
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-violet-50 font-semibold text-violet-800",
        sizeClasses[size],
        className,
      )}
    >
      <span aria-hidden="true">{workerInitials(name)}</span>
      {canLoadPhoto ? (
        <Image
          src={`/api/workers/${workerId}/documents/${photoId}`}
          alt=""
          fill
          unoptimized
          sizes={imageSizes[size]}
          className="object-cover"
          onError={() => setFailedPhotoId(photoId ?? null)}
        />
      ) : null}
    </span>
  );
}
