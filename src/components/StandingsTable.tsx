import type { LeagueStandings } from "@/lib/standings";

/**
 * טבלת ליגה ויזואלית: לוגו הקבוצה, שורת נתונים, ופס המחשה (barPct) שמראה את
 * חוזק הקבוצה (אחוז ניצחון בכדורסל / נקודות בכדורגל) ביחס למובילה בטבלה.
 */
export function StandingsTable({
  data,
  barClass = "bg-brand",
}: {
  data: LeagueStandings;
  barClass?: string;
}) {
  const isBasket = data.sport === "basketball";
  return (
    <div className="rounded-xl border border-line bg-paper p-3 sm:p-4">
      <h3 className="mb-3 text-base font-extrabold text-ink">{data.leagueLabel}</h3>
      {data.groups.map((g) => (
        <div key={g.label} className="mb-4 last:mb-0">
          {data.groups.length > 1 && (
            <div className="mb-1.5 text-xs font-bold text-ink-muted">{g.label}</div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-ink-muted">
                  <th className="w-6 py-1 text-center font-medium">#</th>
                  <th className="py-1 text-right font-medium">קבוצה</th>
                  {isBasket ? (
                    <>
                      <th className="w-10 py-1 text-center font-medium">נצ'</th>
                      <th className="w-10 py-1 text-center font-medium">הפ'</th>
                      <th className="w-12 py-1 text-center font-medium">אחוז</th>
                    </>
                  ) : (
                    <>
                      <th className="w-10 py-1 text-center font-medium">מש'</th>
                      <th className="w-14 py-1 text-center font-medium">מאזן</th>
                      <th className="w-12 py-1 text-center font-medium">נק'</th>
                    </>
                  )}
                  <th className="hidden w-28 py-1 sm:table-cell" />
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={`${r.name}-${r.rank}`} className="border-t border-line">
                    <td className="py-1.5 text-center text-ink-muted">{r.rank}</td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-2">
                        {r.logo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.logo}
                            alt=""
                            loading="lazy"
                            className="h-5 w-5 shrink-0 object-contain"
                          />
                        )}
                        <span className="truncate font-medium text-ink">
                          {r.name}
                        </span>
                      </div>
                    </td>
                    {isBasket ? (
                      <>
                        <td className="py-1.5 text-center tabular-nums">{r.wins}</td>
                        <td className="py-1.5 text-center tabular-nums">{r.losses}</td>
                        <td className="py-1.5 text-center tabular-nums text-ink-soft">
                          {((r.winPct ?? 0) * 100).toFixed(0)}%
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-1.5 text-center tabular-nums">
                          {r.gamesPlayed ?? "-"}
                        </td>
                        <td className="py-1.5 text-center tabular-nums">
                          {r.wins}-{r.ties ?? 0}-{r.losses}
                        </td>
                        <td className="py-1.5 text-center font-bold tabular-nums">
                          {r.points ?? "-"}
                        </td>
                      </>
                    )}
                    <td className="hidden py-1.5 sm:table-cell">
                      <div className="h-2 w-full overflow-hidden rounded bg-paper-soft">
                        <div
                          className={`h-full rounded ${barClass}`}
                          style={{ width: `${Math.max(4, r.barPct)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="mt-2 text-[11px] text-ink-muted">
        נתונים: ESPN · מתעדכן בכניסה לעמוד
      </p>
    </div>
  );
}
