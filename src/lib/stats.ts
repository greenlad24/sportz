// סטטיסטיקות NBA אמיתיות ומאומתות (לכתבות אבדיה/NBA), ממקור חינמי: balldontlie.
// הכלל הקשיח באתר הוא "לעולם אל תמציא עובדות ספורט"; כדי בכל זאת לתת לכתבות
// עומק מספרי, אנחנו *מזריקים* לפרומפט נתוני עונה אמיתיים מ-API חיצוני - המודל
// משתמש רק במספרים שסופקו לו ולא ממציא.
//
// אופציונלי לחלוטין (כמו Brave/YouTube): בלי BALLDONTLIE_API_KEY המודול מושבת
// ומחזיר null, והכתבות נכתבות כרגיל ללא מספרים. מפתח חינמי: https://balldontlie.io

import type { PlayerSeasonStats } from "./types";

const BALLDONTLIE_KEY = process.env.BALLDONTLIE_API_KEY;
const BASE = "https://api.balldontlie.io/v1";

// העונה הנוכחית (שנת הפתיחה). ניתן לעקוף ב-ENV כשמתחילה עונה חדשה.
// balldontlie מצפה לשנת הפתיחה (2025 = עונת 2025-26).
const SEASON = Number(process.env.NBA_SEASON || 2025);

// שמירת תוצאות במטמון בזיכרון: נתוני עונה משתנים אטית (אחרי משחק), אין טעם
// לקרוא ל-API בכל כתבה. TTL ברירת מחדל 6 שעות.
const CACHE_TTL_MS = Number(process.env.STATS_TTL_HOURS || 6) * 36e5;
const cache = new Map<string, { at: number; value: PlayerSeasonStats | null }>();

interface BdlPlayer {
  id: number;
  first_name: string;
  last_name: string;
  team?: { full_name?: string };
}

interface BdlSeasonAverages {
  pts?: number;
  reb?: number;
  ast?: number;
  stl?: number;
  blk?: number;
  fg_pct?: number;
  fg3_pct?: number;
  min?: string | number;
  games_played?: number;
}

async function bdlFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: BALLDONTLIE_KEY as string },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn(`[stats] balldontlie ${path} -> HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[stats] balldontlie ${path} failed: ${(err as Error).message}`);
    return null;
  }
}

/** "34:12" / 34 -> 34 (דקות שלמות) */
function toMinutes(min: string | number | undefined): number | undefined {
  if (min === undefined) return undefined;
  if (typeof min === "number") return Math.round(min);
  const n = parseInt(String(min).split(":")[0], 10);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * סטטיסטיקות העונה של שחקן לפי שם (best-effort). מאתר את מזהה השחקן ואז שולף
 * ממוצעי עונה. ממוּטמח. מחזיר null אם אין מפתח / לא נמצא / נכשל.
 */
export async function getPlayerSeasonStats(
  name: string,
): Promise<PlayerSeasonStats | null> {
  if (!BALLDONTLIE_KEY) return null;
  const key = name.toLowerCase().trim();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const value = await fetchPlayerSeasonStats(name);
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function fetchPlayerSeasonStats(
  name: string,
): Promise<PlayerSeasonStats | null> {
  const search = await bdlFetch<{ data?: BdlPlayer[] }>(
    `/players?search=${encodeURIComponent(name)}&per_page=5`,
  );
  const player = search?.data?.[0];
  if (!player) return null;

  const avg = await bdlFetch<{ data?: BdlSeasonAverages[] }>(
    `/season_averages?season=${SEASON}&player_ids[]=${player.id}`,
  );
  const a = avg?.data?.[0];
  if (!a) return null;

  const round1 = (n?: number) =>
    typeof n === "number" ? Math.round(n * 10) / 10 : undefined;

  return {
    name: `${player.first_name} ${player.last_name}`.trim(),
    season: `${SEASON}-${String((SEASON + 1) % 100).padStart(2, "0")}`,
    team: player.team?.full_name,
    gamesPlayed: a.games_played,
    points: round1(a.pts),
    rebounds: round1(a.reb),
    assists: round1(a.ast),
    steals: round1(a.stl),
    blocks: round1(a.blk),
    fgPct: round1(a.fg_pct),
    fg3Pct: round1(a.fg3_pct),
    minutes: toMinutes(a.min),
  };
}

/** סטטיסטיקות דני אבדיה לעונה הנוכחית (קיצור דרך). */
export function getAvdijaStats(): Promise<PlayerSeasonStats | null> {
  return getPlayerSeasonStats("Avdija");
}

export const statsConfig = { enabled: Boolean(BALLDONTLIE_KEY) };
