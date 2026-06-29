"use client";

import { useState } from "react";

/**
 * תמונת רקע לאריח מדור: אם הקישור שבור / נחסם (hotlink) - נופלת בחזרה לרקע
 * מדורג במקום אייקון "תמונה שבורה". משמש את CategoryTiles (רכיב שרת).
 */
export function TileImage({
  src,
  gradient,
}: {
  src: string;
  gradient: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className={`h-full w-full bg-gradient-to-br ${gradient}`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}
