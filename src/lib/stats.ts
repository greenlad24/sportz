// סטטיסטיקות NBA אמיתיות ומאומתות (לכתבות אבדיה/NBA), ממקור חינמי: ESPN.
// הכלל הקשיח באתר הוא "לעולם אל תמציא עובדות ספורט"; כדי בכל זאת לתת לכתבות
// עומק מספרי, אנחנו *מזריקים* לפרומפט ממוצעי-עונה אמיתיים מ-ESPN - המודל
// משתמש רק במספרים שסופקו לו ולא ממציא.
//
// חינמי לחלוטין, ללא מפתח (אותו מקור כמו טבלאות הליגה). בעבר נוסה balldontlie,
// אך נקודות הקצה של הסטטיסטיקות שם חסומות בלי מנוי בתשלום - ESPN נותן את זה חינם.

import type { PlayerSeasonStats } from "./types";

// מזהי שחקנים ב-ESPN (להזרקת ממוצעי-עונה). כרגע אבדיה בלבד (כוכב האתר).
const ESPN_ATHLETES: Record<string, number> = {
  avdija: 4683021, // Deni Avdija (Portland Trail Blazers)
};

// שמירת תוצאות במטמון בזיכרון: ממוצעי-עונה משתנים אטית (אחרי משחק). TTL 6 שעות.
const CACHE_TTL_MS = Number(process.env.STATS_TTL_HOURS || 6) * 36e5;
const cache = new Map<string, { at: number; value: PlayerSeasonStats | null }>();

interface EspnStatSplit {
  season?: { year?: number; displayName?: string };
  stats?: string[];
}
interface EspnStatCategory {
  name?: string;
  labels?: string[];
  statistics?: EspnStatSplit[];
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(n) ? undefined : n;
}

/** ממיר split (labels + stats) ל-PlayerSeasonStats לפי שמות העמודות של ESPN. */
function parseAverages(
  name: string,
  labels: string[],
  split: EspnStatSplit,
): PlayerSeasonStats {
  const by = new Map<string, string>();
  (split.stats ?? []).forEach((v, i) => by.set(labels[i], v));
  const g = (k: string) => num(by.get(k));
  return {
    name,
    season: split.season?.displayName || String(split.season?.year || ""),
    gamesPlayed: g("GP"),
    points: g("PTS"),
    rebounds: g("REB"),
    assists: g("AST"),
    steals: g("STL"),
    blocks: g("BLK"),
    fgPct: g("FG%"),
    fg3Pct: g("3P%"),
    minutes: g("MIN") !== undefined ? Math.round(g("MIN")!) : undefined,
  };
}

async function fetchEspnSeasonStats(
  name: string,
  athleteId: number,
): Promise<PlayerSeasonStats | null> {
  try {
    const res = await fetch(
      `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${athleteId}/stats`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) {
      console.warn(`[stats] espn ${athleteId} -> HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { categories?: EspnStatCategory[] };
    const avg = data.categories?.find((c) => c.name === "averages");
    const labels = avg?.labels;
    const splits = avg?.statistics;
    if (!labels || !splits || splits.length === 0) return null;
    // העונה האחרונה: בעלת ה-year הגבוה ביותר (נפילה לאחרון ברשימה).
    const latest =
      [...splits].sort(
        (a, b) => (a.season?.year ?? 0) - (b.season?.year ?? 0),
      )[splits.length - 1] ?? splits[splits.length - 1];
    return parseAverages(name, labels, latest);
  } catch (err) {
    console.warn(`[stats] espn ${athleteId} failed: ${(err as Error).message}`);
    return null;
  }
}

/**
 * ממוצעי-העונה של שחקן לפי שם (best-effort, ממוטמח). מחזיר null אם השחקן אינו
 * ברשימת המזהים או שהשאיבה נכשלה.
 */
export async function getPlayerSeasonStats(
  name: string,
): Promise<PlayerSeasonStats | null> {
  const key = name.toLowerCase().trim();
  const athleteId = ESPN_ATHLETES[key];
  if (!athleteId) return null;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const value = await fetchEspnSeasonStats(name, athleteId);
  // קובעים את שם התצוגה התקני
  if (value) value.name = "דני אבדיה";
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** סטטיסטיקות דני אבדיה לעונה הנוכחית (קיצור דרך). */
export function getAvdijaStats(): Promise<PlayerSeasonStats | null> {
  return getPlayerSeasonStats("Avdija");
}

// סטטיסטיקות זמינות תמיד (מקור חינמי, ללא מפתח).
export const statsConfig = { enabled: true };
