// רצועת תוצאות חיות לפס העליון.
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
  {
    league: "NBA",
    home: "פורטלנד",
    away: "דאלאס",
    hs: "112",
    as: "108",
    status: "גמר",
  },
  {
    league: "יורוליג",
    home: "מכבי ת\"א",
    away: "אולימפיאקוס",
    hs: "78",
    as: "74",
    status: "רבע 4",
    live: true,
  },
  {
    league: "ליגת העל",
    home: "הפועל ת\"א",
    away: "מכבי חיפה",
    hs: "1",
    as: "1",
    status: "מחצית",
    live: true,
  },
];

export function LiveScores() {
  return (
    <div className="hidden items-center gap-2 overflow-x-auto md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {SAMPLE_GAMES.map((g, i) => (
        <div
          key={i}
          className="flex shrink-0 items-center gap-2 rounded bg-white/10 px-2.5 py-1 text-xs text-white"
        >
          <span className="hidden text-[10px] font-bold uppercase opacity-70 lg:inline">
            {g.league}
          </span>
          <span className="font-bold">
            {g.home} {g.hs}
          </span>
          <span className="opacity-60">-</span>
          <span className="font-bold">
            {g.as} {g.away}
          </span>
          {g.live ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-live rounded-full bg-white" />
              {g.status}
            </span>
          ) : (
            <span className="text-[10px] opacity-80">{g.status}</span>
          )}
        </div>
      ))}
    </div>
  );
}
