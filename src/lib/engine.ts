import type { Article, Category, GeneratedArticle, Update } from "./types";
import { SOURCES } from "./sources";
import { fetchAllSources } from "./rss";
import { scrapeIsraeliSites } from "./scrape";
import { selectCandidates, type ScoredItem } from "./relevance";
import { generateArticles } from "./llm";
import {
  mergeArticles,
  getProcessedLinks,
  addProcessedLinks,
  addUpdates,
} from "./store";
import { hashId, slugify } from "./utils";
import { CATEGORIES } from "./categories";

export interface RefreshResult {
  fetched: number;
  candidates: number; // מועמדים *חדשים* (אחרי סינון מול קישורים שכבר עובדו)
  generated: number;
  added: number;
  skippedLlm: boolean; // האם דילגנו על קריאת ה-API (אין תוכן חדש)
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

  // ברירת מחדל נמוכה: כתבות מעמיקות (5-7 דק') יקרות בטוקנים וכולן נכתבות
  // בקריאה אחת. מעט כתבות מלאות למחזור מהיר ויציב (~3-4 דק'); המתזמן צובר
  // עוד מדי שעה. ניתן לשנות ב-ENV.
  const perRun = Number(process.env.ARTICLES_PER_RUN || 3);
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
  // שולחים הרבה יותר מועמדים מהיעד: כך ל-Claude יש כמה מקורות על אותו אירוע
  // להצליב ולאחד לכתבה אחת מקיפה (ולא רק חומר לבחירה).
  const perCategoryCap: Record<Category, number> = {
    avdija: targets.avdija + 8,
    israeli_basketball: targets.israeli_basketball + 6,
    world_football: targets.world_football + 5,
  };
  const selected = selectCandidates(raw, {
    lookbackHours,
    perCategory: perCategoryCap,
  });

  // 2.1) דה-דופ מול ה-API: מסירים מועמדים שכבר עובדו בעבר (לפי הקישור).
  //      זהו החיסכון העיקרי - לא משלמים על API עבור חדשות שכבר כיסינו.
  const processed = await getProcessedLinks();
  const candidates: Record<Category, ScoredItem[]> = {
    avdija: selected.avdija.filter((it) => !processed.has(it.link)),
    israeli_basketball: selected.israeli_basketball.filter(
      (it) => !processed.has(it.link),
    ),
    world_football: selected.world_football.filter(
      (it) => !processed.has(it.link),
    ),
  };
  const candidateCount = Object.values(candidates).reduce(
    (n, a) => n + a.length,
    0,
  );

  // 3) יצירת כתבות + עדכוני השעה (קריאה אחת מאוחדת ל-LLM) - רק אם יש תוכן חדש.
  const skippedLlm = candidateCount === 0;
  const generated = skippedLlm
    ? { articles: [], updates: [] }
    : await generateArticles(candidates, targets);

  // 3.1) מסמנים את כל הקישורים ששלחנו כ"עובדו" (גם אם לא נכתבה כתבה מכולם),
  //      כדי לא לבזבז עליהם קריאת API חוזרת בריצות הבאות.
  if (!skippedLlm) {
    const sentLinks = Object.values(candidates)
      .flat()
      .map((it) => it.link);
    await addProcessedLinks(sentLinks);
  }

  // 3.2) שמירת עדכוני השעה (העובדות הגולמיות שעליהן מבוססות הכתבות)
  if (generated.updates.length > 0) {
    const now = new Date().toISOString();
    const updateObjs: Update[] = generated.updates.map((u) => ({
      id: hashId(u.text),
      category: u.category,
      text: u.text.trim(),
      createdAt: now,
    }));
    await addUpdates(updateObjs);
  }

  // 4) המרה לכתבות + שיוך תמונה מהמקור (לפי הקישור, אחרת תמונה כללית מהקטגוריה)
  const imageByLink = new Map<string, string>();
  const imageByCat: Partial<Record<Category, string>> = {};
  for (const it of Object.values(candidates).flat()) {
    if (it.image) {
      imageByLink.set(it.link, it.image);
      if (!imageByCat[it.category]) imageByCat[it.category] = it.image;
    }
  }

  const articles = generated.articles
    .map(toArticle)
    .map((a) => ({
      ...a,
      imageUrl: imageByLink.get(a.sourceUrl) || imageByCat[a.category],
    }))
    .filter((a) => a.headline);
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
    generated: generated.articles.length,
    added: added.length,
    skippedLlm,
    perCategory,
    durationMs: Date.now() - startedAt,
  };
}

export { CATEGORIES };
