import type { Article, Category, GeneratedArticle } from "./types";
import { SOURCES } from "./sources";
import { fetchAllSources } from "./rss";
import { scrapeIsraeliSites } from "./scrape";
import { selectCandidates } from "./relevance";
import { generateArticles } from "./claude";
import { mergeArticles } from "./store";
import { hashId, slugify } from "./utils";
import { CATEGORIES } from "./categories";

export interface RefreshResult {
  fetched: number;
  candidates: number;
  generated: number;
  added: number;
  perCategory: Record<Category, number>;
  durationMs: number;
}

/** מחשב כמה כתבות לכל קטגוריה לפי תמהיל היעד (70/20/10) */
function computeTargets(total: number): Record<Category, number> {
  // מבטיח לפחות כתבה אחת לכל קטגוריה כשיש מספיק תקציב
  const avdija = Math.max(1, Math.round(total * 0.7));
  const israeli = Math.max(1, Math.round(total * 0.2));
  const football = Math.max(1, total - avdija - israeli);
  return {
    avdija,
    israeli_basketball: israeli,
    world_football: football,
  };
}

function toArticle(g: GeneratedArticle): Article {
  const id = hashId(g.headline + g.sourceUrl);
  return {
    id,
    slug: slugify(g.headline, id),
    category: g.category,
    headline: g.headline.trim(),
    subtitle: (g.subtitle || "").trim(),
    summary: (g.summary || "").trim(),
    body: (g.body || "").trim(),
    tags: Array.isArray(g.tags) ? g.tags.slice(0, 6) : [],
    importance:
      typeof g.importance === "number"
        ? Math.min(10, Math.max(1, Math.round(g.importance)))
        : 5,
    sourceName: g.sourceName || "מקור חיצוני",
    sourceUrl: g.sourceUrl || "",
    publishedAt: validIso(g.publishedAt),
    createdAt: new Date().toISOString(),
  };
}

function validIso(value: string): string {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

/** הריצה המלאה: שאיבה -> סינון -> כתיבה ע"י Claude -> שמירה */
export async function runRefresh(): Promise<RefreshResult> {
  const startedAt = Date.now();

  const perRun = Number(process.env.ARTICLES_PER_RUN || 10);
  const lookbackHours = Number(process.env.LOOKBACK_HOURS || 48);
  const targets = computeTargets(perRun);

  // 1) שאיבת כל המקורות: פידי Google News (RSS) + שאיבה ישירה מאתרים ישראליים
  const [rssItems, scrapedItems] = await Promise.all([
    fetchAllSources(SOURCES),
    scrapeIsraeliSites(),
  ]);
  const raw = [...rssItems, ...scrapedItems];

  // 2) סינון חינמי: ניקוד רלוונטיות + טריות + הסרת כפילויות
  //    שולחים ל-Claude מעט יותר מועמדים מהיעד כדי לתת לו ממה לבחור.
  const perCategoryCap: Record<Category, number> = {
    avdija: targets.avdija + 4,
    israeli_basketball: targets.israeli_basketball + 3,
    world_football: targets.world_football + 2,
  };
  const candidates = selectCandidates(raw, {
    lookbackHours,
    perCategory: perCategoryCap,
  });
  const candidateCount = Object.values(candidates).reduce(
    (n, a) => n + a.length,
    0,
  );

  // 3) יצירת כתבות בעברית (קריאה אחת מאוחדת ל-Claude)
  const generated =
    candidateCount > 0 ? await generateArticles(candidates, targets) : [];

  // 4) המרה לכתבות ומיזוג לאחסון (הסרת כפילויות מול הקיים)
  const articles = generated.map(toArticle).filter((a) => a.headline);
  const added = articles.length > 0 ? await mergeArticles(articles) : [];

  const perCategory: Record<Category, number> = {
    avdija: 0,
    israeli_basketball: 0,
    world_football: 0,
  };
  for (const a of added) perCategory[a.category]++;

  return {
    fetched: raw.length,
    candidates: candidateCount,
    generated: generated.length,
    added: added.length,
    perCategory,
    durationMs: Date.now() - startedAt,
  };
}

export { CATEGORIES };
