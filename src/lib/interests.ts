import type { Category } from "./types";

// פרופיל תחומי עניין נשמר ב-localStorage לפי כתבות שנצפו (ללא שרת, פרטי למשתמש)
const KEY = "sportz:interests";
// כתבות שהמשתמש כבר *נכנס אליהן* - לא יוצגו שוב בהמלצות (פרטי למשתמש).
const READ_KEY = "sportz:read";
const READ_CAP = 1000;

export interface Interests {
  categories: Record<string, number>;
  tags: Record<string, number>;
}

function empty(): Interests {
  return { categories: {}, tags: {} };
}

export function readInterests(): Interests {
  if (typeof window === "undefined") return empty();
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "");
    if (p && typeof p === "object" && p.categories && p.tags) return p;
  } catch {
    /* ignore */
  }
  return empty();
}

export function recordView(category: Category, tags: string[]): void {
  if (typeof window === "undefined") return;
  const p = readInterests();
  p.categories[category] = (p.categories[category] || 0) + 1;
  for (const t of tags.slice(0, 6)) {
    p.tags[t] = (p.tags[t] || 0) + 1;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

// ── כתבות שנקראו (לסינון מההמלצות) ────────────────────────────────

/** מזהי הכתבות שהמשתמש כבר נכנס אליהן (לא יוצגו שוב בהמלצות). */
export function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const a = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
    return new Set(Array.isArray(a) ? (a as string[]) : []);
  } catch {
    return new Set();
  }
}

/** מסמן כתבה כ"נקראה" (נכנסו אליה) - תוסר מההמלצות מכאן ואילך. */
export function recordRead(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const raw = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
    const list = (Array.isArray(raw) ? (raw as string[]) : []).filter(
      (x) => x !== id,
    );
    list.push(id); // האחרון שנקרא בסוף
    localStorage.setItem(READ_KEY, JSON.stringify(list.slice(-READ_CAP)));
  } catch {
    /* ignore */
  }
}

// ── ערבוב יומי (המלצות שונות כל 24 שעות) ──────────────────────────

/** מספר היום (מאז עידן יוניקס) - משתנה כל 24 שעות, יציב במהלך היום. */
function daySeed(): number {
  return Math.floor(Date.now() / 86_400_000);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ערבוב דטרמיניסטי לפי היום: אותו קלט מחזיר אותו סדר במהלך אותו יום, וסדר
 * *שונה* בכל יום חדש. כך "המלצות לקריאה" מתחלפות כל 24 שעות.
 */
export function dailyShuffle<T>(arr: T[]): T[] {
  const rng = mulberry32(daySeed());
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** קטגוריות ותגיות מדורגות לפי עניין (לבניית בקשת ההמלצות) */
export function topInterests(): { cats: string[]; tags: string[] } {
  const p = readInterests();
  const cats = Object.entries(p.categories)
    .sort((a, b) => b[1] - a[1])
    .map((e) => e[0]);
  const tags = Object.entries(p.tags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((e) => e[0]);
  return { cats, tags };
}
