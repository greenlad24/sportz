"use client";

import { useRef } from "react";

// רצועת תוצאות חיות קומפקטית עם חיצים לגלילה (סליידר ידני, ללא אנימציה).
// כרגע נתוני דוגמה - בשלב הבא נחבר מקור תוצאות אמיתי (API).
interface Game {
  league: string;
  home: string;
  away: string;
  hs: string;
  as: string;
  status: string;
  live?: boolean;
}

const SAMPLE_GAMES: Game[] = [
  { league: "NBA", home: "פורטלנד", away: "דאלאס", hs: "112", as: "108", status: "גמר" },
  { league: "יורוליג", home: "מכבי ת\"א", away: "אולימפיאקוס", hs: "78", as: "74", status: "רבע 4", live: true },
  { league: "ליגת העל", home: "הפועל ת\"א", away: "מכבי חיפה", hs: "1", as: "1", status: "מחצית", live: true },
  { league: "NBA", home: "בוסטון", away: "מיאמי", hs: "96", as: "91", status: "רבע 3", live: true },
  { league: "פרמייר ליג", home: "ארסנל", away: "צ'לסי", hs: "2", as: "0", status: "גמר" },
];

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

  const scroll = (delta: number) => {
    ref.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="hidden items-center gap-0.5 md:flex">
      <Arrow dir="end" onClick={() => scroll(-160)} />

      <div
        ref={ref}
        className="flex w-[230px] snap-x gap-1.5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SAMPLE_GAMES.map((g, i) => (
          <div
            key={i}
            className="flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded bg-white/10 px-2 py-1 text-[11px] leading-none text-white"
          >
            {g.live && (
              <span className="h-1.5 w-1.5 animate-live rounded-full bg-white" />
            )}
            <span className="font-bold">{g.home}</span>
            <span className="font-extrabold">
              {g.hs}:{g.as}
            </span>
            <span className="font-bold">{g.away}</span>
            <span className="text-[10px] text-white/60">{g.status}</span>
          </div>
        ))}
      </div>

      <Arrow dir="start" onClick={() => scroll(160)} />
    </div>
  );
}
