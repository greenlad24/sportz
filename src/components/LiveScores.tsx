"use client";

import { useEffect, useRef, useState } from "react";

// רצועת תוצאות חיות קומפקטית עם חיצים לגלילה (סליידר ידני, ללא אנימציה).
// נתונים אמיתיים מ-/api/scores (ESPN + balldontlie), מתרעננים כל דקה. אם אין
// משחקים חיים/סיומים אחרונים - הרצועה מוסתרת לגמרי.
interface Game {
  league: string;
  home: string;
  away: string;
  hs: string;
  as: string;
  status: string;
  live?: boolean;
}

function Arrow({
  dir,
  onClick,
}: {
  dir: "start" | "end";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={dir === "start" ? "הקודם" : "הבא"}
      onClick={onClick}
      className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-white/80 hover:bg-white/15 hover:text-white"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5">
        {/* בעברית (RTL): "הבא" מצביע שמאלה, "הקודם" ימינה */}
        <path
          d={dir === "end" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function LiveScores() {
  const ref = useRef<HTMLDivElement>(null);
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/scores")
        .then((r) => (r.ok ? r.json() : { games: [] }))
        .then((d) => {
          if (active) setGames(Array.isArray(d.games) ? d.games : []);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const scroll = (delta: number) => {
    ref.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  // אין משחקים חיים/אחרונים - לא מציגים רצועה כלל (עדיף על נתוני דמה).
  if (games.length === 0) return null;

  return (
    <div className="hidden items-center gap-0.5 md:flex">
      <Arrow dir="start" onClick={() => scroll(160)} />

      <div
        ref={ref}
        className="flex w-[230px] snap-x gap-1.5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {games.map((g, i) => (
          <div
            key={i}
            className="flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded bg-white/10 px-2 py-1 text-[11px] leading-none text-white"
          >
            {g.live && (
              <span className="h-1.5 w-1.5 animate-live rounded-full bg-white" />
            )}
            <span className="font-bold">{g.home}</span>
            {(g.hs || g.as) && (
              <span className="font-extrabold">
                {g.hs}:{g.as}
              </span>
            )}
            <span className="font-bold">{g.away}</span>
            <span className="text-[10px] text-white/60">{g.status}</span>
          </div>
        ))}
      </div>

      <Arrow dir="end" onClick={() => scroll(-160)} />
    </div>
  );
}
