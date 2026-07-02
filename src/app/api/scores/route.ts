import { NextResponse } from "next/server";
import { LEAGUES, getResults } from "@/lib/standings";
import { teamHe, statusHe } from "@/lib/teams-he";

// רצועת "תוצאות חיות" בכותרת: משחקים חיים + תוצאות סיום אחרונות מכל הליגות.
// עדכון עצל דרך getResults (TTL) - כך הרצועה מרעננת גם את results.json בדרך.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// עד כמה אחורה נחשב "תוצאה אחרונה", וכמה קדימה "משחק היום" ראויים לרצועה.
const RECENT_FINAL_MS = 48 * 60 * 60 * 1000;
const UPCOMING_MS = 18 * 60 * 60 * 1000;

// שעת פתיחה קומפקטית בשעון ישראל למשחק עתידי (למשל "22:00").
function tipoff(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  }).format(d);
}

interface StripGame {
  league: string;
  home: string;
  away: string;
  hs: string;
  as: string;
  status: string;
  live: boolean;
}

export async function GET() {
  const keys = Object.keys(LEAGUES);
  const results = await Promise.all(
    keys.map((k) => getResults(k).catch(() => null)),
  );
  const now = Date.now();

  // דירוג-על: חיים (2) קודם, אחריהם משחקי היום הקרובים (1), ואז סיומים אחרונים (0).
  const rows: (StripGame & { tier: number; sort: number })[] = [];
  for (const r of results) {
    if (!r) continue;
    for (const g of r.games) {
      const t = new Date(g.date).getTime();
      const valid = !Number.isNaN(t);
      const recent = valid && now - t <= RECENT_FINAL_MS;
      const upcoming = valid && t > now && t - now <= UPCOMING_MS;

      let tier: number;
      let status: string;
      if (g.live) {
        tier = 2;
        status = statusHe(g.status) || "חי";
      } else if (g.completed && recent) {
        tier = 0;
        status = "סיום";
      } else if (!g.completed && upcoming) {
        tier = 1;
        status = tipoff(g.date);
      } else {
        continue; // לא חי, לא סיום-אחרון, לא משחק-היום - מדלגים.
      }

      rows.push({
        league: r.leagueLabel,
        home: teamHe(g.homeName, g.homeAbbr),
        away: teamHe(g.awayName, g.awayAbbr),
        // משחק עתידי: בלי תוצאה (מציגים שעת פתיחה במקום).
        hs: tier === 1 ? "" : g.homeScore !== undefined ? String(g.homeScore) : "",
        as: tier === 1 ? "" : g.awayScore !== undefined ? String(g.awayScore) : "",
        status,
        live: !!g.live,
        tier,
        // בתוך שכבה: קרוב-לעכשיו קודם (עתידי=הכי מוקדם, סיום=הכי חדש).
        sort: tier === 1 ? -t : t,
      });
    }
  }

  rows.sort((a, b) => b.tier - a.tier || b.sort - a.sort);
  const games: StripGame[] = rows
    .slice(0, 14)
    .map(({ tier, sort, ...g }) => g);
  return NextResponse.json({ games });
}
