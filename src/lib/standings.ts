// טבלאות ליגה חיות מ-ESPN (חינמי, ללא מפתח). הנתון נשאב *בכניסה לעמוד* בלבד
// (עדכון עצל) ונשמר ב-store; ביקור נוסף בתוך חלון ה-TTL מחזיר את הנתון השמור.
// מקור הנתונים: site.api.espn.com - כולל לוגו לכל קבוצה.

import type { Category } from "./types";
import {
  getStandingsStore,
  saveStanding,
  getResultsStore,
  saveResults,
} from "./store";

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

// ── תוצאות משחקים (ממספר מקורות: ESPN + balldontlie ל-NBA) ─────────

export interface GameResult {
  date: string; // ISO
  homeName: string;
  homeAbbr: string;
  homeLogo?: string;
  homeScore?: number;
  awayName: string;
  awayAbbr: string;
  awayLogo?: string;
  awayScore?: number;
  status: string; // "סיום" / "חי" / זמן
  source: string; // מאיזה מקור הגיע (ESPN / balldontlie)
}

export interface LeagueResults {
  leagueKey: string;
  leagueLabel: string;
  sport: Sport;
  fetchedAt: string;
  games: GameResult[];
}

const RESULTS_TTL_MS =
  Number(process.env.RESULTS_TTL_MINUTES || 20) * 60_000;
const BALLDONTLIE_KEY = process.env.BALLDONTLIE_API_KEY;

interface EspnEvent {
  date?: string;
  status?: { type?: { completed?: boolean; description?: string; shortDetail?: string } };
  competitions?: {
    competitors?: {
      homeAway?: string;
      score?: string;
      team?: EspnTeam;
    }[];
  }[];
}

/** תוצאות מ-ESPN scoreboard (כל המשחקים האחרונים/הנוכחיים של הליגה). */
async function fetchEspnResults(def: LeagueDef): Promise<GameResult[]> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${def.espnPath}/scoreboard`,
      { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: EspnEvent[] };
    const games: GameResult[] = [];
    for (const ev of data.events ?? []) {
      const comp = ev.competitions?.[0];
      const cs = comp?.competitors ?? [];
      const home = cs.find((c) => c.homeAway === "home") ?? cs[0];
      const away = cs.find((c) => c.homeAway === "away") ?? cs[1];
      if (!home || !away) continue;
      games.push({
        date: ev.date || "",
        homeName: home.team?.displayName || "",
        homeAbbr: home.team?.abbreviation || "",
        homeLogo: logoOf(home.team),
        homeScore: home.score !== undefined ? Number(home.score) : undefined,
        awayName: away.team?.displayName || "",
        awayAbbr: away.team?.abbreviation || "",
        awayLogo: logoOf(away.team),
        awayScore: away.score !== undefined ? Number(away.score) : undefined,
        status: ev.status?.type?.shortDetail || ev.status?.type?.description || "",
        source: "ESPN",
      });
    }
    return games;
  } catch {
    return [];
  }
}

interface BdlGame {
  date?: string;
  status?: string;
  home_team?: { full_name?: string; abbreviation?: string };
  visitor_team?: { full_name?: string; abbreviation?: string };
  home_team_score?: number;
  visitor_team_score?: number;
}

/** תוצאות NBA אחרונות מ-balldontlie (מקור שני להצלבה/השלמה). */
async function fetchBalldontlieResults(): Promise<GameResult[]> {
  if (!BALLDONTLIE_KEY) return [];
  try {
    const res = await fetch(
      "https://api.balldontlie.io/v1/games?per_page=100&seasons[]=2024",
      { headers: { Authorization: BALLDONTLIE_KEY }, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: BdlGame[] };
    const finals = (data.data ?? []).filter((g) => (g.status || "").includes("Final"));
    finals.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return finals.slice(0, 8).map((g) => ({
      date: g.date || "",
      homeName: g.home_team?.full_name || "",
      homeAbbr: g.home_team?.abbreviation || "",
      homeScore: g.home_team_score,
      awayName: g.visitor_team?.full_name || "",
      awayAbbr: g.visitor_team?.abbreviation || "",
      awayScore: g.visitor_team_score,
      status: "סיום",
      source: "balldontlie",
    }));
  } catch {
    return [];
  }
}

function dedupeGames(games: GameResult[]): GameResult[] {
  const seen = new Set<string>();
  const out: GameResult[] = [];
  for (const g of games) {
    const day = (g.date || "").slice(0, 10);
    const teams = [g.homeAbbr, g.awayAbbr].sort().join("-");
    const k = `${day}|${teams}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(g);
  }
  return out;
}

async function fetchResults(def: LeagueDef): Promise<LeagueResults | null> {
  // מקור ראשי: ESPN. ל-NBA מוסיפים מקור שני (balldontlie) ומצליבים.
  const sources = [fetchEspnResults(def)];
  if (def.key === "nba") sources.push(fetchBalldontlieResults());
  const all = (await Promise.all(sources)).flat();
  const games = dedupeGames(all)
    .filter((g) => g.homeName && g.awayName)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 10);
  if (games.length === 0) return null;
  return {
    leagueKey: def.key,
    leagueLabel: def.label,
    sport: def.sport,
    fetchedAt: new Date().toISOString(),
    games,
  };
}

/** תוצאות ליגה - עדכון עצל בכניסה לעמוד (TTL), נשמר. ראה getStandings. */
export async function getResults(key: string): Promise<LeagueResults | null> {
  const def = LEAGUES[key];
  if (!def) return null;
  const store = await getResultsStore();
  const cached = store[key];
  const fresh =
    cached && Date.now() - new Date(cached.fetchedAt).getTime() < RESULTS_TTL_MS;
  if (fresh) return cached;
  const fetched = await fetchResults(def);
  if (fetched) {
    await saveResults(key, fetched);
    return fetched;
  }
  return cached ?? null;
}

/** כל תוצאות הליגות של קטגוריה (עדכון עצל). best-effort. */
export async function getCategoryResults(
  category: Category,
): Promise<LeagueResults[]> {
  const keys = CATEGORY_LEAGUES[category] ?? [];
  const all = await Promise.all(keys.map((k) => getResults(k)));
  return all.filter((r): r is LeagueResults => r !== null);
}
