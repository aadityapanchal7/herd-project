"use client";

import React from "react";

type AvatarThumbProps = {
  url?: string | null;
  first?: string | null;
  last?: string | null;
  size?: number; // px
  className?: string;
};

export function AvatarThumb({
  url,
  first,
  last,
  size = 36,
  className = "",
}: AvatarThumbProps) {
  const [broken, setBroken] = React.useState(false);
  const initials =
    ((first?.[0] || "").toUpperCase() + (last?.[0] || "").toUpperCase()) || " ";

  if (!url || broken) {
    return (
      <div
        className={`rounded-full flex items-center justify-center font-semibold text-white border bg-primary ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: "var(--primary-color)",
          fontSize: Math.max(12, Math.floor(size * 0.38)),
        }}
        aria-label={`${first ?? ""} ${last ?? ""}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`${first ?? ""} ${last ?? ""}`}
      className={`rounded-full object-cover border ${className}`}
      style={{ width: size, height: size }}
      onError={() => setBroken(true)}
    />
  );
}
