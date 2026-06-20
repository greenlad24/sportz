"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArticleImage } from "./ArticleImage";
import type { Article } from "@/lib/types";

function Handle({
  side,
  onClick,
}: {
  side: "right" | "left";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "right" ? "הקודם" : "הבא"}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white shadow-md ring-2 ring-white transition hover:bg-brand-dark ${
        side === "right" ? "right-1" : "left-1"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path
          d={side === "right" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/**
 * סליידר המלצות - כרטיסים אופקיים (תמונה מימין, כותרת קטנה בבלוק משמאל),
 * עם הנפשה אוטומטית מימין לשמאל, עצירה בריחוף ושני ידיות עגולות.
 */
export function RecommendedSlider({ items }: { items: Article[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const idx = useRef(0);
  const paused = useRef(false);

  const count = items.length;
  const lastIdx = Math.max(0, count - 2); // שני כרטיסים מוצגים בכל רגע

  function scrollTo(i: number) {
    const el = ref.current;
    if (!el) return;
    const card = el.children[i] as HTMLElement | undefined;
    card?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }

  useEffect(() => {
    if (count <= 2) return;
    const id = setInterval(() => {
      if (paused.current) return;
      // מתקדם עד הסוף ואז נעצר - בלי חזרה אוטומטית להתחלה
      if (idx.current >= lastIdx) {
        clearInterval(id);
        return;
      }
      idx.current += 1;
      scrollTo(idx.current);
    }, 6500);
    return () => clearInterval(id);
  }, [count, lastIdx]);

  const next = () => {
    idx.current = Math.min(lastIdx, idx.current + 1);
    scrollTo(idx.current);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div
        ref={ref}
        className="flex snap-x gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((a) => (
          <Link
            key={a.id}
            href={`/article/${a.slug}`}
            className="group flex h-[130px] w-[calc(50%_-_6px)] shrink-0 snap-start overflow-hidden rounded-lg bg-ink text-white"
          >
            {/* תמונה מימין */}
            <div className="h-full w-[44%] shrink-0">
              <ArticleImage
                category={a.category}
                src={a.imageUrl}
                className="h-full w-full"
              />
            </div>
            {/* כותרת משמאל בתוך הבלוק */}
            <div className="flex flex-1 items-center p-3">
              <h3 className="line-clamp-4 text-[13px] font-bold leading-5 group-hover:text-brand-light">
                {a.headline}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      {count > 2 && <Handle side="left" onClick={next} />}
    </div>
  );
}
