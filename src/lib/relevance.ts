import type { Category, RawItem } from "./types";
import { SOURCES } from "./sources";
import { wordSimilarity } from "./utils";

// מילות מפתח לכל קטגוריה (עברית + אנגלית). ניקוד גבוה = רלוונטי יותר.
const KEYWORDS: Record<Category, { term: string; score: number }[]> = {
  avdija: [
    { term: "אבדיה", score: 10 },
    { term: "avdija", score: 10 },
    { term: "deni", score: 6 },
    { term: "דני אבדיה", score: 12 },
    { term: "בלייזרס", score: 5 },
    { term: "blazers", score: 5 },
    { term: "trail blazers", score: 6 },
    { term: "portland", score: 4 },
    { term: "פורטלנד", score: 4 },
  ],
  israeli_basketball: [
    { term: "מכבי תל אביב", score: 9 },
    { term: "הפועל תל אביב", score: 9 },
    { term: "הפועל ירושלים", score: 9 },
    { term: "מכבי", score: 4 },
    { term: "הפועל", score: 4 },
    { term: "יורוליג", score: 5 },
    { term: "euroleague", score: 5 },
    { term: "ליגת ווינר", score: 5 },
    { term: "כדורסל", score: 2 },
  ],
  world_football: [
    { term: "ליגת האלופות", score: 8 },
    { term: "champions league", score: 8 },
    { term: "נבחרת ישראל", score: 8 },
    { term: "מונדיאל", score: 7 },
    { term: "world cup", score: 7 },
    { term: "ריאל מדריד", score: 4 },
    { term: "ברצלונה", score: 4 },
    { term: "פרמייר ליג", score: 4 },
    { term: "כדורגל", score: 2 },
  ],
};

export interface ScoredItem extends RawItem {
  score: number;
}

/**
 * זיהוי קטגוריה לפי תוכן (לפריטים שנשאבו ישירות מאתרים ישראליים, שם אין
 * קטגוריה מובנית). מחזיר את הקטגוריה עם הניקוד הגבוה ביותר מעל סף, אחרת null.
 */
export function inferCategory(text: string): Category | null {
  const hay = text.toLowerCase();
  let best: Category | null = null;
  let bestScore = 0;
  (Object.keys(KEYWORDS) as Category[]).forEach((cat) => {
    let s = 0;
    for (const { term, score } of KEYWORDS[cat]) {
      if (hay.includes(term.toLowerCase())) s += score;
    }
    if (s > bestScore) {
      bestScore = s;
      best = cat;
    }
  });
  return bestScore >= 4 ? best : null;
}

function sourceWeight(sourceName: string): number {
  return SOURCES.find((s) => s.name === sourceName)?.weight ?? 3;
}

/** ניקוד רלוונטיות של פריט בודד */
export function scoreItem(item: RawItem): number {
  const hay = `${item.title} ${item.summary}`.toLowerCase();
  let kw = 0;
  for (const { term, score } of KEYWORDS[item.category]) {
    if (hay.includes(term.toLowerCase())) kw += score;
  }
  // בונוס למקורות חזקים/ייעודיים
  const weight = sourceWeight(item.source);
  // בונוס לטריות (עד 5 נקודות, יורד עם הזמן)
  const ageHours = (Date.now() - new Date(item.publishedAt).getTime()) / 36e5;
  const freshness = Math.max(0, 5 - ageHours / 6);
  // כותרת ארוכה מדי / קצרה מדי -> פחות אמין
  const titleOk = item.title.length >= 15 ? 1 : 0;
  return kw + weight * 0.4 + freshness + titleOk;
}

/**
 * סינון, ניקוד, סינון לפי טריות, והסרת כפילויות (clustering פשוט).
 * זה ה"מסנן החינמי" שמצמצם דרמטית את מספר הטוקנים שנשלחים ל-Claude.
 */
export function selectCandidates(
  items: RawItem[],
  opts: { lookbackHours: number; perCategory: Record<Category, number> },
): Record<Category, ScoredItem[]> {
  const cutoff = Date.now() - opts.lookbackHours * 36e5;

  const scored: ScoredItem[] = items
    .filter((it) => new Date(it.publishedAt).getTime() >= cutoff)
    .map((it) => ({ ...it, score: scoreItem(it) }))
    .filter((it) => it.score > 2) // דורש לפחות רמז אחד של רלוונטיות
    .sort((a, b) => b.score - a.score);

  // הסרת כפילויות: אם כותרת דומה מאוד לכותרת שכבר נבחרה, דלג
  const kept: ScoredItem[] = [];
  for (const it of scored) {
    const dup = kept.some(
      (k) =>
        k.link === it.link ||
        (k.category === it.category && wordSimilarity(k.title, it.title) > 0.55),
    );
    if (!dup) kept.push(it);
  }

  const byCat: Record<Category, ScoredItem[]> = {
    avdija: [],
    israeli_basketball: [],
    world_football: [],
  };
  for (const it of kept) byCat[it.category].push(it);

  // חיתוך למספר המקסימלי לכל קטגוריה (חוסך טוקנים)
  (Object.keys(byCat) as Category[]).forEach((cat) => {
    byCat[cat] = byCat[cat].slice(0, opts.perCategory[cat]);
  });

  return byCat;
}
