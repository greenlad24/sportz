import type { Article, Category, GeneratedArticle, Update } from "./types";
import { SOURCES } from "./sources";
import { fetchAllSources } from "./rss";
import { scrapeIsraeliSites } from "./scrape";
import { selectCandidates, type ScoredItem } from "./relevance";
import {
  generateArticles,
  proofreadArticle,
  type GenerationContext,
} from "./llm";
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

/**
 * תמהיל יעד "רך": אבדיה בעדיפות, אבל משאירים מקום למילוי משאר הקטגוריות
 * כדי להגיע ל-total. ה-LLM ממלא את ה-total לפי החדשות שבפועל (ראה הפרומפט).
 */
function computeTargets(total: number): Record<Category, number> {
  const avdija = Math.max(1, Math.round(total * 0.5));
  const israeli = Math.max(1, Math.round(total * 0.25));
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

function validIso(value: string): string {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

/** הריצה המלאה: שאיבה -> סינון -> כתיבה ע"י Claude -> שמירה */
export async function runRefresh(): Promise<RefreshResult> {
  const startedAt = Date.now();

  // יעד: ~10 כתבות למחזור (אבדיה בעדיפות + מילוי משאר הקטגוריות), מתוך
  // חדשות 24 השעות האחרונות. ניתן לשנות ב-ENV.
  const perRun = Number(process.env.ARTICLES_PER_RUN || 10);
  const lookbackHours = Number(process.env.LOOKBACK_HOURS || 24);
  const targets = computeTargets(perRun);

  // 1) שאיבת כל המקורות: פידי Google News (RSS) + שאיבה ישירה מאתרים ישראליים.
  //    במקביל מרעננים את לוח השידורים (best-effort, עם שער רעננות פנימי - לא
  //    קורא לרשת אם הנתונים טריים). לעולם לא חוסם/מפיל את צינור הכתבות.
  const [rssItems, scrapedItems] = await Promise.all([
    fetchAllSources(SOURCES),
    scrapeIsraeliSites(),
    refreshBroadcasts().catch(() => null),
  ]);
  const raw = [...rssItems, ...scrapedItems];

  // 2) סינון חינמי: ניקוד רלוונטיות + טריות + הסרת כפילויות
  //    שולחים ל-Claude מעט יותר מועמדים מהיעד כדי לתת לו ממה לבחור.
  // שולחים הרבה יותר מועמדים מהיעד: כך ל-Claude יש כמה מקורות על אותו אירוע
  // להצליב ולאחד לכתבה אחת מקיפה (ולא רק חומר לבחירה).
  const perCategoryCap: Record<Category, number> = {
    avdija: targets.avdija + 12,
    israeli_basketball: targets.israeli_basketball + 12,
    world_football: targets.world_football + 12,
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

  // 2.3) העשרה: שאיבת גוף הכתבה המלא מהמקורות הישירים (אתרים ישראליים + פידי
  //      NBA ישירים). כך הכותב מקבל את העובדות המלאות - שמות, מספרים, ציטוטים -
  //      ולא רק כותרת/קטע קצר, מה שמייצר כתבות מעמיקות ומדויקות במקום עמומות.
  //      best-effort: קישורי Google News אינם נשאבים (הפניה) ונשארים עם הקטע.
  if (candidateCount > 0) {
    // מעשירים רק את המובילים בכל קטגוריה (לפי ניקוד) - אלה שיהפכו לכתבות + מעט
    // עומק להצלבה. כך חוסכים שאיבות וטוקנים בלי לפגוע באיכות הכתבות שנכתבות.
    const toEnrich = (Object.keys(candidates) as Category[]).flatMap((cat) =>
      candidates[cat].slice(0, targets[cat] + 3),
    );
    // העשרה רב-מקורית: גם מקורות-המשנה של הסיפורים המובילים (עד 2 לכל סיפור),
    // כדי שלכתבה יהיה "בשר" מכמה מקורות להצלבה - לא תלות במקור יחיד.
    const relatedToEnrich = toEnrich.flatMap((p) => (p.related ?? []).slice(0, 2));
    const enrichList = [...toEnrich, ...relatedToEnrich];
    const enriched = await enrichWithArticleText(enrichList);
    console.log(`[enrich] full text: ${enriched}/${enrichList.length} candidates`);
  }

  // 2.2) הקשר ל-LLM: נושאים שכבר כיסינו (דה-דופ ברמת נושא) + כתבות קיימות
  //      לקישור פנימי. סורקים את הכתבות מהשבוע האחרון.
  const existing = await getArticles();
  const weekAgo = Date.now() - 7 * 24 * 36e5;
  const recent = existing.filter(
    (a) => new Date(a.publishedAt).getTime() >= weekAgo,
  );
  // לוח השידורים הקרוב (אם נשאב) - מועבר ל-LLM כדי שישבץ זמני שידור מקושרים
  // בכתבות. מוגבל לימים הקרובים ולמספר שורות סביר כדי לא לנפח טוקנים.
  const broadcasts = await getBroadcasts();
  const upcomingBroadcasts = (broadcasts?.days ?? [])
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

  const llmContext: GenerationContext = {
    total: perRun,
    alreadyCovered: recent.slice(0, 80).map((a) => ({
      headline: a.headline,
      topic: a.subcategory || a.tags.slice(0, 3).join(", "),
    })),
    internalArticles: existing.slice(0, 40).map((a) => ({
      slug: a.slug,
      headline: a.headline,
      category: a.category,
    })),
    upcomingBroadcasts,
  };

  // 3) יצירת כתבות + עדכוני השעה (קריאה אחת מאוחדת ל-LLM) - רק אם יש תוכן חדש.
  const skippedLlm = candidateCount === 0;
  const generated = skippedLlm
    ? { articles: [], updates: [] }
    : await generateArticles(candidates, targets, llmContext);

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

  // 4) המרה לכתבות + העשרת מדיה לכל כתבה (במקביל, best-effort):
  //    תמונה (Brave - אתרי ארה"ב, השבוע האחרון, + קרדיט) ווידאו (YouTube).
  //    תמונת המקור משמשת רק כגיבוי אם חיפוש התמונה לא החזיר תוצאה.
  const imageByLink = new Map<string, string>();
  const imageByCat: Partial<Record<Category, string>> = {};
  for (const it of Object.values(candidates).flat()) {
    if (it.image) {
      imageByLink.set(it.link, it.image);
      if (!imageByCat[it.category]) imageByCat[it.category] = it.image;
    }
  }

  const articles = (
    await Promise.all(
      generated.articles.map(async (g) => {
        if (!g.headline || !g.headline.trim()) return null;

        // הגהה לשונית (Sonnet): תיקון דקדוק והפשטת שפה לפני יצירת ה-slug/id,
        // כדי שאלה ייגזרו מהכותרת המתוקנת. best-effort - נכשל? נשמר המקור.
        const fixed = await proofreadArticle({
          headline: g.headline,
          subtitle: g.subtitle || "",
          body: g.body || "",
        });
        const gFinal = fixed ? { ...g, ...fixed } : g;

        const base = toArticle(gFinal);
        if (!base.headline) return null;

        const query = (gFinal.imageQuery || gFinal.headline || "").trim();

        const [image, videoId] = await Promise.all([
          findImage(query),
          findVideo(query),
        ]);

        if (image) {
          base.imageUrl = image.url;
          base.imageCredit = { source: image.source, link: image.link };
        } else {
          base.imageUrl =
            imageByLink.get(base.sourceUrl) || imageByCat[base.category];
        }

        if (videoId) base.videoId = videoId;

        return base;
      }),
    )
  ).filter((a): a is Article => a !== null);

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
