import type { Category } from "./types";

// פרופיל תחומי עניין נשמר ב-localStorage לפי כתבות שנצפו (ללא שרת, פרטי למשתמש)
const KEY = "sportz:interests";

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
