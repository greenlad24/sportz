import type { LeagueResults } from "@/lib/standings";

/** תוצאות משחקים אחרונות לליגה: לוגו + תוצאה לכל משחק. ממספר מקורות (מצולב). */
export function ResultsList({ data }: { data: LeagueResults }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3 sm:p-4">
      <h3 className="mb-3 text-base font-extrabold text-ink">
        תוצאות אחרונות · {data.leagueLabel}
      </h3>
      <ul className="space-y-1.5">
        {data.games.map((g, i) => {
          const homeWin =
            g.homeScore !== undefined &&
            g.awayScore !== undefined &&
            g.homeScore > g.awayScore;
          const awayWin =
            g.homeScore !== undefined &&
            g.awayScore !== undefined &&
            g.awayScore > g.homeScore;
          return (
            <li
              key={`${g.homeAbbr}-${g.awayAbbr}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm"
            >
              {/* בית */}
              <div className="flex flex-1 items-center justify-end gap-2 truncate">
                <span className={`truncate ${homeWin ? "font-bold text-ink" : "text-ink-soft"}`}>
                  {g.homeName || g.homeAbbr}
                </span>
                {g.homeLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.homeLogo} alt="" loading="lazy" className="h-5 w-5 object-contain" />
                )}
              </div>
              {/* תוצאה */}
              <div className="shrink-0 px-1 text-center font-bold tabular-nums text-ink">
                {g.homeScore ?? "-"} : {g.awayScore ?? "-"}
              </div>
              {/* חוץ */}
              <div className="flex flex-1 items-center gap-2 truncate">
                {g.awayLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.awayLogo} alt="" loading="lazy" className="h-5 w-5 object-contain" />
                )}
                <span className={`truncate ${awayWin ? "font-bold text-ink" : "text-ink-soft"}`}>
                  {g.awayName || g.awayAbbr}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-ink-muted">
        מקורות: {[...new Set(data.games.map((g) => g.source))].join(" + ")} · מתעדכן בכניסה לעמוד
      </p>
    </div>
  );
}
