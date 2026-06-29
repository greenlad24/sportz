// טבלאות ליגה חיות מ-ESPN (חינמי, ללא מפתח). הנתון נשאב *בכניסה לעמוד* בלבד
// (עדכון עצל) ונשמר ב-store; ביקור נוסף בתוך חלון ה-TTL מחזיר את הנתון השמור.
// מקור הנתונים: site.api.espn.com - כולל לוגו לכל קבוצה.

import type { Category } from "./types";
import { getStandingsStore, saveStanding } from "./store";

export type Sport = "basketball" | "football";

export interface LeagueDef {
  key: string; // מזהה פנימי
  espnPath: string; // הנתיב ב-ESPN (sport/league)
  label: string; // שם בעברית לתצוגה
  sport: Sport;
}

// הליגות שנתמכות (כולן זמינות חינם דרך ESPN).
export const LEAGUES: Record<string, LeagueDef> = {
  nba: { key: "nba", espnPath: "basketball/nba", label: "NBA", sport: "basketball" },
  euroleague: {
    key: "euroleague",
    espnPath: "basketball/euroleague",
    label: "יורוליג",
    sport: "basketball",
  },
  "isr-basket": {
    key: "isr-basket",
    espnPath: "basketball/isr.1",
    label: "ליגת העל בכדורסל",
    sport: "basketball",
  },
  epl: { key: "epl", espnPath: "soccer/eng.1", label: "פרמייר ליג", sport: "football" },
  ucl: {
    key: "ucl",
    espnPath: "soccer/uefa.champions",
    label: "ליגת האלופות",
    sport: "football",
  },
  "world-cup": {
    key: "world-cup",
    espnPath: "soccer/fifa.world",
    label: "מונדיאל",
    sport: "football",
  },
};

// אילו ליגות מוצגות בעמוד הטבלאות של כל קטגוריה באתר.
export const CATEGORY_LEAGUES: Record<Category, string[]> = {
  avdija: ["nba"],
  nba: ["nba"],
  israeli_basketball: ["isr-basket", "euroleague"],
  world_football: ["epl", "ucl", "world-cup"],
};

export interface StandingRow {
  rank: number;
  name: string;
  abbrev: string;
  logo?: string;
  wins: number;
  losses: number;
  ties?: number; // כדורגל
  points?: number; // נקודות ליגה (כדורגל)
  gamesPlayed?: number;
  winPct?: number; // כדורסל (0-1)
  barPct: number; // 0-100 - לרוחב פס ההמחשה
}

export interface StandingsGroup {
  label: string; // למשל "מזרח"/"מערב"/"בית A"/"טבלה"
  rows: StandingRow[];
}

export interface LeagueStandings {
  leagueKey: string;
  leagueLabel: string;
  sport: Sport;
  fetchedAt: string; // ISO
  groups: StandingsGroup[];
}

const TTL_MS = Number(process.env.STANDINGS_TTL_MINUTES || 30) * 60_000;

// ── שאיבה ופענוח מ-ESPN ───────────────────────────────────────────

interface EspnTeam {
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  logos?: { href?: string }[];
  logo?: string;
}
interface EspnStat {
  name?: string;
  displayValue?: string;
  value?: number;
}
interface EspnEntry {
  team?: EspnTeam;
  stats?: EspnStat[];
}
interface EspnNode {
  name?: string;
  displayName?: string;
  standings?: { name?: string; entries?: EspnEntry[] };
  children?: EspnNode[];
}

/** אוסף קבוצות (מזרח/מערב/בית/טבלה) עם תווית שמורה מצומת ההורה. */
function collectGroups(node: EspnNode, out: { label: string; entries: EspnEntry[] }[]) {
  if (!node || typeof node !== "object") return;
  if (node.standings?.entries?.length) {
    out.push({
      label: node.name || node.displayName || node.standings.name || "טבלה",
      entries: node.standings.entries,
    });
  }
  for (const c of node.children ?? []) collectGroups(c, out);
}

function statNum(stats: EspnStat[] | undefined, name: string): number | undefined {
  const s = stats?.find((x) => x.name === name);
  if (!s) return undefined;
  if (typeof s.value === "number") return s.value;
  const n = parseFloat((s.displayValue || "").replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(n) ? undefined : n;
}

function logoOf(team?: EspnTeam): string | undefined {
  return team?.logos?.[0]?.href || team?.logo || undefined;
}

function parseGroup(
  raw: { label: string; entries: EspnEntry[] },
  sport: Sport,
): StandingsGroup {
  const rows: StandingRow[] = raw.entries.map((e, i) => {
    const wins = statNum(e.stats, "wins") ?? 0;
    const losses = statNum(e.stats, "losses") ?? 0;
    const ties = statNum(e.stats, "ties");
    const gamesPlayed = statNum(e.stats, "gamesPlayed");
    const points = statNum(e.stats, "points"); // כדורגל: נקודות ליגה
    const total = wins + losses + (ties ?? 0);
    const winPct = total > 0 ? wins / total : 0;
    return {
      rank: statNum(e.stats, "rank") ?? i + 1,
      name: e.team?.displayName || e.team?.shortDisplayName || "—",
      abbrev: e.team?.abbreviation || "",
      logo: logoOf(e.team),
      wins,
      losses,
      ties,
      gamesPlayed,
      points,
      winPct: sport === "basketball" ? winPct : undefined,
      barPct: 0, // ממולא בהמשך יחסית למקסימום בקבוצה
    };
  });
  rows.sort((a, b) => a.rank - b.rank);
  // פס המחשה: כדורסל לפי אחוז ניצחון, כדורגל לפי נקודות (יחסית למקסימום בטבלה)
  if (sport === "basketball") {
    for (const r of rows) r.barPct = Math.round((r.winPct ?? 0) * 100);
  } else {
    const maxPts = Math.max(1, ...rows.map((r) => r.points ?? 0));
    for (const r of rows) r.barPct = Math.round(((r.points ?? 0) / maxPts) * 100);
  }
  return { label: raw.label, rows };
}

async function fetchStandings(def: LeagueDef): Promise<LeagueStandings | null> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/v2/sports/${def.espnPath}/standings`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) {
      console.warn(`[standings] ${def.key} -> HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as EspnNode;
    const raw: { label: string; entries: EspnEntry[] }[] = [];
    collectGroups(data, raw);
    const groups = raw
      .map((g) => parseGroup(g, def.sport))
      .filter((g) => g.rows.length > 0);
    if (groups.length === 0) return null;
    return {
      leagueKey: def.key,
      leagueLabel: def.label,
      sport: def.sport,
      fetchedAt: new Date().toISOString(),
      groups,
    };
  } catch (err) {
    console.warn(`[standings] ${def.key} failed: ${(err as Error).message}`);
    return null;
  }
}

/**
 * טבלת ליגה - *עדכון עצל*: אם השמור ישן מ-TTL (או חסר), שואב מ-ESPN ושומר;
 * אחרת מחזיר את השמור. בכישלון שאיבה מחזיר את השמור (גם אם ישן) או null.
 * נקרא מתוך עמוד הטבלאות (רכיב שרת) - כך העדכון קורה רק בכניסה לעמוד.
 */
export async function getStandings(key: string): Promise<LeagueStandings | null> {
  const def = LEAGUES[key];
  if (!def) return null;
  const store = await getStandingsStore();
  const cached = store[key];
  const fresh =
    cached && Date.now() - new Date(cached.fetchedAt).getTime() < TTL_MS;
  if (fresh) return cached;

  const fetched = await fetchStandings(def);
  if (fetched) {
    await saveStanding(key, fetched);
    return fetched;
  }
  return cached ?? null; // שאיבה נכשלה - מחזירים שמור (אם יש)
}

/** כל הטבלאות של קטגוריה (עדכון עצל לכל אחת). best-effort. */
export async function getCategoryStandings(
  category: Category,
): Promise<LeagueStandings[]> {
  const keys = CATEGORY_LEAGUES[category] ?? [];
  const all = await Promise.all(keys.map((k) => getStandings(k)));
  return all.filter((s): s is LeagueStandings => s !== null);
}
