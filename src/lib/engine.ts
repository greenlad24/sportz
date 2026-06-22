import type {
  Article,
  Category,
  GeneratedArticle,
  LlmOutput,
  QueuedGroup,
  RawItem,
} from "./types";
import { SOURCES } from "./sources";
import { fetchAllSources } from "./rss";
import { scrapeIsraeliSites } from "./scrape";
import { selectCandidates, type ScoredItem } from "./relevance";
import { generateArticles, type GenerationContext } from "./llm";
import { enrichWithArticleText } from "./extract";
import { findImage, findVideo } from "./media";
import { refreshBroadcasts } from "./broadcasts";
import {
  mergeArticles,
  getArticles,
  getProcessedLinks,
  addProcessedLinks,
  addUpdates,
  getBroadcasts,
  enqueueGroups,
  popGroup,
  getQueue,
} from "./store";
import { hashId, slugify } from "./utils";
import { topicSignature, isDuplicateTopic, type CoveredTopic } from "./dedup";
import { CATEGORIES } from "./categories";

// חלון הדה-דופ: לא כותבים נושא שכבר כוסה ב-N השעות האחרונות (ברירת מחדל: שבוע).
const DEDUP_WINDOW_HOURS = Number(process.env.DEDUP_WINDOW_HOURS || 168);
// תקציב טוקנים לכתבה בודדת (כולל "חשיבה" של ה-Flash). מספיק לכתבה מלאה.
const ARTICLE_MAX_TOKENS = Number(process.env.ARTICLE_MAX_TOKENS || 8000);

/** תוצאת שלב התכנון: שאיבה -> אשכול -> דה-דופ -> הכנסה לתור */
export interface PlanResult {
  fetched: number;
  candidates: number; // אשכולות חדשים (אחרי סינון מול קישורים שעובדו)
  enqueued: number; // נכנסו לתור בפועל
  droppedDup: number; // נפסלו כפילות-נושא
  queueSize: number; // גודל התור אחרי
  perCategory: Record<Category, number>;
  durationMs: number;
}

/** תוצאת שלב הכתיבה: שליפת אשכול -> כתיבה -> שמירה */
export interface WriteResult {
  popped: number;
  written: number;
  skippedDup: number; // נושא שכוסה בין הכניסה לתור לכתיבה
  perCategory: Record<Category, number>;
  durationMs: number;
}

/** ריצה ידנית מלאה (תכנון + ניקוז התור) - ל-/api/refresh בלבד */
export interface RefreshResult {
  plan: PlanResult;
  write: WriteResult;
}

function emptyPerCat(): Record<Category, number> {
  return { avdija: 0, israeli_basketball: 0, world_football: 0 };
}

/**
 * תמהיל יעד "רך": אבדיה בעדיפות, אבל משאירים מקום למילוי משאר הקטגוריות.
 */
function computeTargets(total: number): Record<Category, number> {
  const avdija = Math.max(1, Math.round(total * 0.5));
  const israeli = Math.max(1, Math.round(total * 0.25));
  const football = Math.max(1, total - avdija - israeli);
  return { avdija, israeli_basketball: israeli, world_football: football };
}

function validIso(value: string): string {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

function toArticle(g: GeneratedArticle): Article {
  const id = hashId(g.headline + g.sourceUrl);
  return {
    id,
    slug: slugify(g.headline, id),
    category: g.category,
    subcategory: (g.subcategory || "").trim() || undefined,
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

// ── עזרי אשכול ───────────────────────────────────────────────────

/** מסיר שדות ניקוד/אשכול ומחזיר RawItem נקי לאחסון בתור */
function stripScored(it: ScoredItem | RawItem): RawItem {
  return {
    title: it.title,
    summary: it.summary,
    link: it.link,
    source: it.source,
    lang: it.lang,
    category: it.category,
    publishedAt: it.publishedAt,
    image: it.image,
    fullText: it.fullText,
  };
}

/** כותרת לחישוב חתימת-נושא: מעדיפים מקור עברי (הכתבה הסופית בעברית) */
function groupSigTitle(primary: RawItem, related: RawItem[]): string {
  const he = [primary, ...related].find((x) => x.lang === "he");
  return (he ?? primary).title;
}

function toQueuedGroup(it: ScoredItem): QueuedGroup {
  const primary = stripScored(it);
  const related = (it.related ?? []).map(stripScored);
  return {
    id: hashId(it.link),
    category: it.category,
    primary,
    related,
    sig: topicSignature(groupSigTitle(primary, related)),
    score: it.score,
    enqueuedAt: new Date().toISOString(),
  };
}

/** נושאים שכוסו לאחרונה (כתבות מתוך חלון הדה-דופ) - לבדיקת כפילות */
async function recentCoveredTopics(): Promise<CoveredTopic[]> {
  const articles = await getArticles();
  const cutoff = Date.now() - DEDUP_WINDOW_HOURS * 36e5;
  return articles
    .filter((a) => {
      const t = Math.max(
        new Date(a.publishedAt).getTime(),
        new Date(a.createdAt).getTime(),
      );
      return t >= cutoff;
    })
    .map((a) => ({
      sig: topicSignature(`${a.headline} ${a.tags.join(" ")}`),
      category: a.category,
      at: new Date(a.createdAt).getTime(),
    }));
}

/** לוח השידורים הקרוב (יום/שעה/ערוץ) לשיבוץ מקושר בכתבות */
async function upcomingBroadcastList(): Promise<
  GenerationContext["upcomingBroadcasts"]
> {
  const broadcasts = await getBroadcasts();
  return (broadcasts?.days ?? [])
    .slice(0, 3)
    .flatMap((d) =>
      d.items.map((b) => ({
        dayLabel: d.dayLabel,
        dmy: d.dmy,
        time: b.time,
        channel: b.channel,
        event: b.event,
      })),
    )
    .slice(0, 60);
}

/** הקשר לכותב: קישורים פנימיים + לוח שידורים. דה-דופ נאכף בקוד, לא בפרומפט. */
async function buildWriteContext(): Promise<GenerationContext> {
  const existing = await getArticles();
  return {
    total: 1,
    alreadyCovered: [],
    internalArticles: existing.slice(0, 40).map((a) => ({
      slug: a.slug,
      headline: a.headline,
      category: a.category,
    })),
    upcomingBroadcasts: await upcomingBroadcastList(),
  };
}

/** המרת פלט הכותב לכתבה + העשרת מדיה (תמונה/וידאו), best-effort */
async function enrichArticleMedia(
  g: GeneratedArticle,
  primary: RawItem,
): Promise<Article> {
  const base = toArticle(g);
  const query = (g.imageQuery || g.headline || "").trim();
  const [image, videoId] = await Promise.all([
    findImage(query),
    findVideo(query),
  ]);
  if (image) {
    base.imageUrl = image.url;
    base.imageCredit = { source: image.source, link: image.link };
  } else if (primary.image) {
    base.imageUrl = primary.image; // גיבוי: תמונת המקור
  }
  if (videoId) base.videoId = videoId;
  return base;
}

// ── שלב התכנון: שאיבה -> אשכול -> טקסט מלא -> דה-דופ -> תור ─────────
export async function planRefresh(): Promise<PlanResult> {
  const startedAt = Date.now();
  const perRun = Number(process.env.ARTICLES_PER_RUN || 10);
  const lookbackHours = Number(process.env.LOOKBACK_HOURS || 24);
  const targets = computeTargets(perRun);

  // 1) שאיבת כל המקורות + רענון לוח השידורים (best-effort).
  const [rssItems, scrapedItems] = await Promise.all([
    fetchAllSources(SOURCES),
    scrapeIsraeliSites(),
    refreshBroadcasts().catch(() => null),
  ]);
  const raw = [...rssItems, ...scrapedItems];

  // 2) סינון חינמי + אשכול (כמה מקורות על אותו אירוע -> אשכול אחד).
  const perCategoryCap: Record<Category, number> = {
    avdija: targets.avdija + 12,
    israeli_basketball: targets.israeli_basketball + 12,
    world_football: targets.world_football + 12,
  };
  const selected = selectCandidates(raw, {
    lookbackHours,
    perCategory: perCategoryCap,
  });

  // 2.1) הסרת אשכולות שמקורם כבר עובד (לפי קישור).
  const processed = await getProcessedLinks();
  const groups: ScoredItem[] = (Object.keys(selected) as Category[])
    .flatMap((cat) => selected[cat])
    .filter((it) => !processed.has(it.link))
    .sort((a, b) => b.score - a.score);
  const candidateCount = groups.length;

  // 2.2) העשרה: שאיבת הטקסט המלא לכל אשכול (ראשי + מקורות-משנה). פותר
  //      קישורי Google News ל-URL המקור ושואב את גוף הכתבה. best-effort.
  if (candidateCount > 0) {
    const enrichList: RawItem[] = groups.flatMap((g) => [
      g as RawItem,
      ...(g.related ?? []),
    ]);
    const enriched = await enrichWithArticleText(enrichList);
    console.log(`[plan] full text: ${enriched}/${enrichList.length} items`);
  }

  // 3) דה-דופ קשיח ברמת נושא: מול כתבות שכוסו (חלון) + מול אשכולות שכבר
  //    אושרו בריצה זו. זהו הפתרון לכתבות החוזרות - גייט בקוד, לא בפרומפט.
  const accepted: CoveredTopic[] = await recentCoveredTopics();
  const survivors: QueuedGroup[] = [];
  let droppedDup = 0;
  const perCategory = emptyPerCat();
  for (const it of groups) {
    const grp = toQueuedGroup(it);
    if (isDuplicateTopic(grp.sig, grp.category, accepted)) {
      droppedDup++;
      continue;
    }
    accepted.push({ sig: grp.sig, category: grp.category, at: Date.now() });
    survivors.push(grp);
    perCategory[grp.category]++;
  }

  // 4) הכנסה לתור + סימון כל הקישורים שנשקלו כ"עובדו".
  const enqueued = await enqueueGroups(survivors);
  if (candidateCount > 0) {
    await addProcessedLinks(
      groups.flatMap((g) => [g.link, ...(g.related ?? []).map((r) => r.link)]),
    );
  }
  const queueSize = (await getQueue()).length;

  return {
    fetched: raw.length,
    candidates: candidateCount,
    enqueued,
    droppedDup,
    queueSize,
    perCategory,
    durationMs: Date.now() - startedAt,
  };
}

// ── שלב הכתיבה: שליפת אשכול -> כתיבת כתבה אחת -> מדיה -> שמירה ──────
export async function writeNext(max = 1): Promise<WriteResult> {
  const startedAt = Date.now();
  let popped = 0;
  let written = 0;
  let skippedDup = 0;
  const perCategory = emptyPerCat();

  for (let i = 0; i < max; i++) {
    const group = await popGroup();
    if (!group) break;
    popped++;

    // דה-דופ חוזר בזמן הכתיבה: אולי פורסם נושא דומה מאז שהאשכול נכנס לתור.
    const covered = await recentCoveredTopics();
    if (isDuplicateTopic(group.sig, group.category, covered)) {
      skippedDup++;
      continue;
    }

    // בניית "מועמד" יחיד מהאשכול (ראשי + מקורות-משנה) ובקשת כתבה אחת.
    const item: ScoredItem = {
      ...group.primary,
      score: group.score,
      related: group.related.map((r) => ({ ...r, score: 0 })),
    };
    const candidates: Record<Category, ScoredItem[]> = {
      avdija: [],
      israeli_basketball: [],
      world_football: [],
    };
    candidates[group.category] = [item];
    const tg = emptyPerCat();
    tg[group.category] = 1;
    const ctx = await buildWriteContext();

    let gen: LlmOutput | null = null;
    try {
      gen = await generateArticles(candidates, tg, ctx, ARTICLE_MAX_TOKENS);
    } catch (err) {
      console.warn(`[write] generation failed: ${(err as Error).message}`);
      continue;
    }
    if (!gen) continue;

    if (gen.updates.length > 0) {
      const now = new Date().toISOString();
      await addUpdates(
        gen.updates.map((u) => ({
          id: hashId(u.text),
          category: u.category,
          text: u.text.trim(),
          createdAt: now,
        })),
      );
    }

    const g = gen.articles[0];
    if (!g || !g.headline || !g.headline.trim()) continue;
    const article = await enrichArticleMedia(g, group.primary);
    if (!article.headline) continue;
    const added = await mergeArticles([article]);
    if (added.length > 0) {
      written++;
      perCategory[group.category]++;
    }
  }

  return {
    popped,
    written,
    skippedDup,
    perCategory,
    durationMs: Date.now() - startedAt,
  };
}

/** ריצה ידנית מלאה: תכנון ואז ניקוז כל התור. ל-/api/refresh (גיבוי/בדיקה). */
export async function runRefresh(): Promise<RefreshResult> {
  const plan = await planRefresh();
  const write = await writeNext(plan.enqueued + 5);
  return { plan, write };
}

export { CATEGORIES };
