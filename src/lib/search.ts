import type { Article } from "./types";
import { CATEGORIES, CATEGORY_ORDER, type CategoryMeta } from "./categories";

// הסרת ניקוד + נרמול לחיפוש עברי/אנגלי עמיד
const NIQQUD = /[֑-ׇ]/g;

export function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(NIQQUD, "")
    .replace(/["'’“”]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(q: string): string[] {
  return normalize(q).split(" ").filter(Boolean);
}

interface Hit {
  article: Article;
  score: number;
}

/**
 * חיפוש מדורג עם משקלי שדות (כותרת > תגיות > קטגוריה > כותרת משנה > תקציר > גוף).
 * דורש שכל מילות החיפוש יימצאו (AND), ומדרג לפי רלוונטיות + טריות.
 */
export function searchArticles(
  articles: Article[],
  q: string,
  limit = 50,
): Article[] {
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];

  const hits: Hit[] = [];
  for (const a of articles) {
    const headline = normalize(a.headline);
    const subtitle = normalize(a.subtitle);
    const summary = normalize(a.summary);
    const body = normalize(a.body);
    const catLabel = normalize(CATEGORIES[a.category].label);
    const tagsNorm = a.tags.map(normalize);

    let score = 0;
    let matchedAll = true;
    for (const t of tokens) {
      let s = 0;
      if (headline.includes(t)) s += 10;
      if (tagsNorm.some((tag) => tag === t)) s += 14;
      else if (tagsNorm.some((tag) => tag.includes(t))) s += 7;
      if (catLabel.includes(t)) s += 6;
      if (subtitle.includes(t)) s += 5;
      if (summary.includes(t)) s += 4;
      if (body.includes(t)) s += 1;
      if (s === 0) {
        matchedAll = false;
        break;
      }
      score += s;
    }
    if (!matchedAll) continue;

    const ageHours = (Date.now() - new Date(a.publishedAt).getTime()) / 36e5;
    score += Math.max(0, 3 - ageHours / 48) + a.importance * 0.1;
    hits.push({ article: a, score });
  }

  hits.sort(
    (x, y) =>
      y.score - x.score ||
      new Date(y.article.publishedAt).getTime() -
        new Date(x.article.publishedAt).getTime(),
  );
  return hits.slice(0, limit).map((h) => h.article);
}

/** תגיות (נושאים) שתואמות את החיפוש, מדורגות לפי שכיחות */
export function matchingTags(
  articles: Article[],
  q: string,
  limit = 6,
): string[] {
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];
  const counts = new Map<string, number>();
  for (const a of articles) {
    for (const tag of a.tags) {
      const n = normalize(tag);
      if (tokens.some((t) => n.includes(t))) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map((e) => e[0]);
}

/** קטגוריות שתואמות את החיפוש */
export function matchingCategories(q: string): CategoryMeta[] {
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];
  return CATEGORY_ORDER.map((c) => CATEGORIES[c]).filter((c) =>
    tokens.some(
      (t) =>
        normalize(c.label).includes(t) || normalize(c.description).includes(t),
    ),
  );
}
