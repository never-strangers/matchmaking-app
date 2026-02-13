"use client";

import { cn } from "@/lib/utils";
import { getAvatarPublicUrl } from "@/lib/supabase/avatar";

const AVATAR_SIZE = 120; // Same as registration flow (square)

export interface AvatarSquareProps {
  /** Avatar path within avatars bucket (e.g. userId/uuid.jpg) */
  avatarPath?: string | null;
  /** Pre-built public URL (overrides avatarPath if provided) */
  avatarUrl?: string | null;
  /** Cache bust timestamp (avatar_updated_at or updated_at) */
  cacheBust?: string | null;
  size?: number;
  className?: string;
  alt?: string;
}

export function AvatarSquare({
  avatarPath,
  avatarUrl,
  cacheBust,
  size = AVATAR_SIZE,
  className,
  alt = "Profile photo",
}: AvatarSquareProps) {
  const url =
    avatarUrl ?? (avatarPath ? getAvatarPublicUrl(avatarPath, cacheBust) : null);

  return (
    <div
      className={cn(
        "flex-shrink-0 rounded-xl overflow-hidden bg-[var(--bg-muted)] flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        <svg
          className="w-1/2 h-1/2"
          fill="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "var(--text-muted)" }}
          aria-hidden
        >
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      )}
    </div>
  );
}
