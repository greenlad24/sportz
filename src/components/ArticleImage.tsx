"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/lib/types";

const GRADIENTS: Record<Category, string> = {
  avdija: "from-brand to-[#6e2018]",
  nba: "from-court to-[#0c3a82]",
  israeli_basketball: "from-ochre to-[#7a531a]",
  world_football: "from-olive to-[#3f5325]",
};

/**
 * תמונת כותרת. כשאין תמונה - או כשהתמונה החיצונית נכשלת בטעינה (קישור שבור,
 * חסימת hotlink/403, או תמונה שפגה) - מציגים רקע מדורג נקי עם תווית הקטגוריה
 * במקום אייקון "תמונה שבורה". כך כתבה לעולם לא נראית פגומה.
 */
export function ArticleImage({
  category,
  src,
  alt = "",
  className = "",
}: {
  category: Category;
  src?: string;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    );
  }

  const c = CATEGORIES[category];
  return (
    <div
      className={`relative flex items-center justify-center bg-gradient-to-br ${GRADIENTS[category]} ${className}`}
    >
      <span className="absolute top-3 left-4 text-sm font-extrabold tracking-widest text-white/40">
        SPORTZ
      </span>
      <span className="text-3xl font-extrabold text-white/95 drop-shadow sm:text-4xl">
        {c.label}
      </span>
    </div>
  );
}
