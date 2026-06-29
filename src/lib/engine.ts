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
import { selectCandidates, isTransaction, type ScoredItem } from "./relevance";
import {
  generateArticles,
  expandArticle,
  type GenerationContext,
} from "./llm";
import { enrichWithArticleText } from "./extract";
import { findImage, findVideo } from "./media";
import { getAvdijaStats } from "./stats";
import { refreshBroadcasts } from "./broadcasts";
import {
  mergeArticles,
  updateArticle,
  getArticleById,
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
import {
  topicSignature,
  isDuplicateTopic,
  findDuplicateTopic,
  type CoveredTopic,
} from "./dedup";
import { isFamilySafe } from "./safety";
import { CATEGORIES } from "./categories";

// חלון הדה-דופ: לא כותבים נושא שכבר כוסה ב-N השעות האחרונות (ברירת מחדל: שבוע).
const DEDUP_WINDOW_HOURS = Number(process.env.DEDUP_WINDOW_HOURS || 168);
// תקציב טוקנים לכתבה בודדת (כולל "חשיבה" של ה-Flash). מספיק לכתבה מלאה.
const ARTICLE_MAX_TOKENS = Number(process.env.ARTICLE_MAX_TOKENS || 8000);
// גייט טריות קשיח: נכתבים רק אשכולות שתאריך הפרסום שלהם *אומת מעמוד הכתבה*
// (JSON-LD/meta) *וגם* נמצא בתוך חלון N השעות (ברירת מחדל 24). פריט שלא ניתן
// לאמת את תאריכו - נזרק (מדיניות "verified-fresh only"). זה מונע "חדשות ישנות"
// שמופיעות ב-Google News אך אינן חדשות אמיתיות, ולא סומכים על תאריך הפיד/האינדוקס.
const FRESH_WINDOW_HOURS = Number(process.env.FRESH_WINDOW_HOURS || 24);
// מרווח להמתנת אשכול בתור (תואם ל-QUEUE_TTL_HOURS): פריט שאומת כטרי בזמן
// התכנון רשאי להיכתב גם אם בינתיים המתין בתור עד QUEUE_TTL_HOURS שעות.
const QUEUE_TTL_HOURS = Number(process.env.QUEUE_TTL_HOURS || 6);

/**
 * האם הפריט עבר אימות-טריות: תאריכו *אומת* מעמוד הכתבה (dateVerified) *וגם* הוא
 * בתוך חלון השעות הנתון. windowHours ברירת מחדל = FRESH_WINDOW_HOURS; בזמן
 * הכתיבה נותנים גם מרווח להמתנה בתור (ראו הקריאה ב-writeNext).
 */
function isVerifiedFresh(
  item: { publishedAt: string; dateVerified?: boolean },
  windowHours = FRESH_WINDOW_HOURS,
): boolean {
  if (!item.dateVerified) return false; // לא אומת = לא ניתן לקבוע שזו חדשה -> נזרק
  const t = new Date(item.publishedAt).getTime();
  if (Number.isNaN(t)) return false;
  return t >= Date.now() - windowHours * 36e5;
}

/** תוצאת שלב התכנון: שאיבה -> אשכול -> דה-דופ -> הכנסה לתור */
export interface PlanResult {
  fetched: number;
  candidates: number; // אשכולות חדשים (אחרי סינון מול קישורים שעובדו)
  enqueued: number; // נכנסו לתור בפועל (כתבות חדשות + עדכוני-הרחבה)
  droppedDup: number; // נפסלו כפילות-נושא
  droppedStale: number; // נפסלו - תאריכם אינו מ-24 השעות האחרונות (או לא נודע)
  updates: number; // אשכולות שמיועדים להרחיב כתבה קיימת (סיפור מתפתח)
  queueSize: number; // גודל התור אחרי
  perCategory: Record<Category, number>;
  durationMs: number;
}

/** תוצאת שלב הכתיבה: שליפת אשכול -> כתיבה -> שמירה */
export interface WriteResult {
  popped: number;
  written: number; // כתבות חדשות שנכתבו
  updated: number; // כתבות קיימות שהורחבו (סיפור מתפתח)
  skippedDup: number; // נושא שכוסה בין הכניסה לתור לכתיבה
  skippedStale: number; // נפסל באימות-טריות לפני הכתיבה (לא מאומת/ישן מ-24 שעות)
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

// publishedAt נלקח מזמן הפרסום *האמיתי* של המקור (שכבר סונן ל-24 שעות), ולא
// מהשדה שה-LLM מחזיר - שעלול להיות מומצא/ישן ולגרום לכתבות "מלפני חודשים".
function toArticle(g: GeneratedArticle, sourcePublishedAt?: string): Article {
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
    publishedAt: validIso(sourcePublishedAt || g.publishedAt),
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
    dateVerified: it.dateVerified,
    image: it.image,
    fullText: it.fullText,
  };
}

// טקסט עשיר לחתימת-נושא: כותרות + תקצירים של כל מקורות האשכול. כך תופסים
// "אותו סיפור" גם כשכותרות שונות (ריבוי מקורות/זוויות על אותו אירוע).
function groupSigText(primary: RawItem, related: RawItem[]): string {
  return [primary, ...related]
    .map((x) => `${x.title} ${x.summary || ""}`)
    .join(" ");
}

function toQueuedGroup(it: ScoredItem): QueuedGroup {
  const primary = stripScored(it);
  const related = (it.related ?? []).map(stripScored);
  return {
    id: hashId(it.link),
    category: it.category,
    primary,
    related,
    sig: topicSignature(groupSigText(primary, related)),
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
      sig: topicSignature(
        `${a.headline} ${a.subtitle} ${a.summary} ${a.tags.join(" ")}`,
      ),
      category: a.category,
      at: new Date(a.createdAt).getTime(),
      articleId: a.id,
      slug: a.slug,
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

/** הקשר לכותב: קישורים פנימיים + לוח שידורים + סטטיסטיקות. דה-דופ נאכף בקוד. */
async function buildWriteContext(category: Category): Promise<GenerationContext> {
  const existing = await getArticles();
  // סטטיסטיקות עונה אמיתיות לאבדיה - רק לכתבות בקטגוריית אבדיה, best-effort
  // (מושבת בלי BALLDONTLIE_API_KEY). מזריקים מספרים מאומתים, לא ממציאים.
  const playerStats =
    category === "avdija"
      ? [await getAvdijaStats().catch(() => null)].filter(
          (s): s is NonNullable<typeof s> => s !== null,
        )
      : [];
  return {
    total: 1,
    alreadyCovered: [],
    internalArticles: existing.slice(0, 40).map((a) => ({
      slug: a.slug,
      headline: a.headline,
      category: a.category,
    })),
    upcomingBroadcasts: await upcomingBroadcastList(),
    playerStats: playerStats.length > 0 ? playerStats : undefined,
  };
}

interface FoundMedia {
  imageUrl?: string;
  imageCredit?: { source: string; link: string };
  videoId?: string;
}

interface MediaQuery {
  imageQuery: string; // שאילתת תמונה (אנגלית, שם שחקן/קבוצה)
  videoHe?: string; // שאילתת סרטון עברי מועדף (כותרת הכתבה)
  videoEn?: string; // שאילתת סרטון אנגלי (גיבוי ערוץ ESPN)
  fallbackImage?: string; // תמונת מקור כגיבוי
}

/** איתור מדיה (תמונה + וידאו עברי-מועדף/ESPN) לפי שאילתות. best-effort. */
async function fetchMedia(q: MediaQuery): Promise<FoundMedia> {
  const imageQ = q.imageQuery.trim();
  const out: FoundMedia = {};
  const [image, videoId] = await Promise.all([
    imageQ ? findImage(imageQ) : Promise.resolve(null),
    findVideo({ he: q.videoHe, en: q.videoEn }),
  ]);
  if (image) {
    out.imageUrl = image.url;
    out.imageCredit = { source: image.source, link: image.link };
  } else if (q.fallbackImage) {
    out.imageUrl = q.fallbackImage;
  }
  if (videoId) out.videoId = videoId;
  return out;
}

/** המרת פלט הכותב לכתבה + העשרת מדיה (תמונה/וידאו), best-effort */
async function enrichArticleMedia(
  g: GeneratedArticle,
  primary: RawItem,
): Promise<Article> {
  const base = toArticle(g, primary.publishedAt);
  const media = await fetchMedia({
    imageQuery: g.imageQuery || g.headline || "",
    videoHe: g.headline, // כותרת עברית -> סרטון עברי מועדף
    videoEn: g.imageQuery, // שם שחקן/קבוצה באנגלית -> גיבוי ערוץ ESPN
    fallbackImage: primary.image,
  });
  if (media.imageUrl) base.imageUrl = media.imageUrl;
  if (media.imageCredit) base.imageCredit = media.imageCredit;
  if (media.videoId) base.videoId = media.videoId;
  return base;
}

/**
 * בונה את הגרסה המעודכנת של כתבה קיימת (סיפור מתפתח): שומר על הזהות היציבה
 * (id, slug, createdAt) כדי שה-URL והקישורים לא יישברו, מאמץ את הגוף/הכותרת
 * המעודכנים מהכותב, מסמן updatedAt=עכשיו, ודוחף את publishedAt לזמן ההתפתחות
 * האחרונה כדי שהכתבה תרענן את מיקומה. שומר תמונה קיימת; משלים מדיה אם חסרה.
 */
async function buildUpdatedArticle(
  existing: Article,
  g: GeneratedArticle,
  newPrimary: RawItem,
): Promise<Article> {
  const newTs = new Date(newPrimary.publishedAt).getTime();
  const oldTs = new Date(existing.publishedAt).getTime();
  const publishedAt =
    !Number.isNaN(newTs) && newTs > (Number.isNaN(oldTs) ? 0 : oldTs)
      ? new Date(newTs).toISOString()
      : existing.publishedAt;

  const updated: Article = {
    ...existing,
    subcategory: (g.subcategory || existing.subcategory || "").trim() || undefined,
    headline: (g.headline || existing.headline).trim(),
    subtitle: (g.subtitle || existing.subtitle || "").trim(),
    summary: (g.summary || existing.summary || "").trim(),
    body: (g.body || existing.body).trim(),
    tags: Array.isArray(g.tags) && g.tags.length > 0 ? g.tags.slice(0, 6) : existing.tags,
    importance:
      typeof g.importance === "number"
        ? Math.min(10, Math.max(1, Math.round(g.importance)))
        : existing.importance,
    publishedAt,
    updatedAt: new Date().toISOString(),
  };

  // שומרים את התמונה/וידאו הקיימים; משלימים רק אם אין תמונה כלל.
  if (!updated.imageUrl) {
    const media = await fetchMedia({
      imageQuery: g.imageQuery || updated.headline,
      videoHe: updated.headline,
      videoEn: g.imageQuery,
      fallbackImage: newPrimary.image,
    });
    if (media.imageUrl) updated.imageUrl = media.imageUrl;
    if (media.imageCredit) updated.imageCredit = media.imageCredit;
    if (!updated.videoId && media.videoId) updated.videoId = media.videoId;
  }
  return updated;
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
    // אתר ידידותי-למשפחה (13+): חוסמים מקורות עם תוכן מיני/גס לפני כתיבה.
    .filter((it) => isFamilySafe(`${it.title} ${it.summary}`))
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

  // 2.3) גייט טריות קשיח (verified-fresh only): אחרי ששאבנו את תאריך הפרסום
  //      *המאומת* מעמוד כל אשכול, שומרים רק אשכולות שתאריכם אומת *וגם* נמצא
  //      בתוך 24 השעות. אשכול ישן, או שלא ניתן לאמת את תאריכו - נזרק (לא ייכתב).
  const fresh = groups.filter((it) => isVerifiedFresh(it));
  const droppedStale = groups.length - fresh.length;
  if (droppedStale > 0) {
    console.log(
      `[plan] dropped unverified/stale (not verified within ${FRESH_WINDOW_HOURS}h): ${droppedStale}`,
    );
  }

  // 3) דה-דופ קשיח ברמת נושא: מול כתבות שכוסו (חלון) + מול אשכולות שכבר
  //    אושרו בריצה זו. זהו הפתרון לכתבות החוזרות - גייט בקוד, לא בפרומפט.
  const accepted: CoveredTopic[] = await recentCoveredTopics();
  const survivors: QueuedGroup[] = [];
  let droppedDup = 0;
  let updates = 0;
  // כתבות שכבר סומנו להרחבה בריצה זו - כדי לא להרחיב את אותה כתבה פעמיים.
  const updatingIds = new Set<string>();
  const perCategory = emptyPerCat();
  for (const it of fresh) {
    const grp = toQueuedGroup(it);
    const match = findDuplicateTopic(grp.sig, grp.category, accepted);
    if (match) {
      // נושא שכבר כוסה. אם הוא מכסה כתבה קיימת *שפורסמה* (יש articleId) -
      // זהו סיפור מתפתח: נרחיב את הכתבה הקיימת במקום לזרוק או לשכפל. אחרת
      // (התאמה לאשכול אחר מאותה ריצה, או כבר מרחיבים את הכתבה) - כפילות, דלג.
      if (match.articleId && !updatingIds.has(match.articleId)) {
        grp.updateOf = match.articleId;
        updatingIds.add(match.articleId);
        survivors.push(grp);
        updates++;
      } else {
        droppedDup++;
      }
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
    droppedStale,
    updates,
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
  let updated = 0;
  let skippedDup = 0;
  let skippedStale = 0;
  const perCategory = emptyPerCat();

  for (let i = 0; i < max; i++) {
    const group = await popGroup();
    if (!group) break;
    popped++;

    // אימות-טריות סופי *ממש לפני הכתיבה*: נכתבים רק אשכולות שתאריכם אומת מעמוד
    // הכתבה ועדיין בתוך החלון (24 שעות + מרווח ההמתנה בתור). זהו הגייט שמבטיח
    // שלא נכתבת כתבה על חדשה ישנה - גם אם משהו השתנה מאז התכנון.
    if (!isVerifiedFresh(group.primary, FRESH_WINDOW_HOURS + QUEUE_TTL_HOURS)) {
      skippedStale++;
      continue;
    }

    // בניית "מועמד" יחיד מהאשכול (ראשי + מקורות-משנה) - משמש את שני המסלולים.
    const item: ScoredItem = {
      ...group.primary,
      score: group.score,
      related: group.related.map((r) => ({ ...r, score: 0 })),
    };
    const ctx = await buildWriteContext(group.category);

    // כתבת כדורסל על עסקה/חתימה -> מפעיל מקטע ניתוח עומק (דינמיקת קבוצה +
    // הערכת חשיבת ההנהלה). חל על אבדיה/NBA וכדורסל ישראלי בלבד.
    const isBasketball =
      group.category === "avdija" || group.category === "israeli_basketball";
    const groupText = [group.primary, ...group.related]
      .map((s) => `${s.title} ${s.summary || ""} ${s.fullText || ""}`)
      .join(" ");
    ctx.basketballTransaction = isBasketball && isTransaction(groupText);

    // ── מסלול הרחבה: סיפור מתפתח שמעדכן כתבה קיימת במקום לשכפל אותה ──
    if (group.updateOf) {
      const existing = await getArticleById(group.updateOf);
      if (existing) {
        let g2: GeneratedArticle | null = null;
        try {
          g2 = await expandArticle(existing, item, ctx, ARTICLE_MAX_TOKENS);
        } catch (err) {
          console.warn(`[write] expand failed: ${(err as Error).message}`);
          continue;
        }
        if (!g2) continue;
        if (
          !isFamilySafe(
            `${g2.headline} ${g2.subtitle || ""} ${g2.summary || ""} ${g2.body || ""}`,
          )
        ) {
          console.warn(`[write] dropped unsafe update: ${g2.headline}`);
          continue;
        }
        const updatedArticle = await buildUpdatedArticle(existing, g2, group.primary);
        if (await updateArticle(updatedArticle)) {
          updated++;
          perCategory[group.category]++;
        }
        continue;
      }
      // הכתבה המקורית כבר אינה קיימת (נחתכה מהאחסון) - נכתוב כתבה חדשה במקום.
    }

    // דה-דופ חוזר (כתבה חדשה בלבד): אולי פורסם נושא דומה מאז שהאשכול נכנס לתור.
    const covered = await recentCoveredTopics();
    if (isDuplicateTopic(group.sig, group.category, covered)) {
      skippedDup++;
      continue;
    }

    const candidates: Record<Category, ScoredItem[]> = {
      avdija: [],
      israeli_basketball: [],
      world_football: [],
    };
    candidates[group.category] = [item];
    const tg = emptyPerCat();
    tg[group.category] = 1;

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
    // גייט בטיחות סופי: לא מפרסמים כתבה עם תוכן מיני/גס (13+).
    if (!isFamilySafe(`${g.headline} ${g.subtitle || ""} ${g.summary || ""} ${g.body || ""}`)) {
      console.warn(`[write] dropped unsafe article: ${g.headline}`);
      continue;
    }
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
    updated,
    skippedDup,
    skippedStale,
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
