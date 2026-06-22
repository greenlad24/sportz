// דירוג כתבות להצגה + סינון טריות. שני עקרונות שהאתר אוכף:
//  1. "סיפור השעה": בכל מקטע, הכתבה בראש היא החשובה ביותר בשעה האחרונה -
//     לא זו שנכתבה ראשונה/אחרונה. דירוג = דלי-שעה (חדש לישן) ואז importance.
//  2. טריות: מציגים רק חדשות מ-24 השעות האחרונות (לפי זמן הפרסום של המקור).

import type { Article } from "./types";
import { isFamilySafe } from "./safety";

// חלון ההצגה: כתבות ישנות מ-N שעות לא מוצגות (ברירת מחדל 24).
const MAX_AGE_HOURS = Number(process.env.DISPLAY_MAX_AGE_HOURS || 24);

function timeOf(ts: string): number {
  const t = new Date(ts).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** דלי-שעה: מספר השעות מאז עידן יוניקס (לקיבוץ "סיפורי השעה") */
function hourBucket(ts: string): number {
  return Math.floor(timeOf(ts) / 3_600_000);
}

/** משקל חשיבות, עם בונוס לאבדיה (הכוכב של האתר) */
function weight(a: Article): number {
  return a.importance + (a.category === "avdija" ? 3 : 0);
}

/**
 * דירוג להצגה: קודם לפי שעת הפרסום (השעה האחרונה ראשונה), ובתוך אותה שעה
 * לפי חשיבות - ולא לפי סדר הכניסה. כך הכתבה בראש כל מקטע היא "סיפור השעה".
 */
export function rankArticles(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const hb = hourBucket(b.publishedAt) - hourBucket(a.publishedAt);
    if (hb !== 0) return hb;
    const w = weight(b) - weight(a);
    if (w !== 0) return w;
    return timeOf(b.publishedAt) - timeOf(a.publishedAt);
  });
}

/**
 * סינון טריות: רק כתבות מ-N השעות האחרונות (לפי publishedAt). אם לא נשארה
 * אף כתבה טרייה (שעה שקטה במיוחד) - מחזירים את החדשות ביותר כדי לא להציג עמוד ריק.
 */
export function freshArticles(
  articles: Article[],
  maxAgeHours = MAX_AGE_HOURS,
): Article[] {
  const cutoff = Date.now() - maxAgeHours * 36e5;
  const fresh = articles.filter((a) => timeOf(a.publishedAt) >= cutoff);
  if (fresh.length > 0) return fresh;
  return [...articles]
    .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt))
    .slice(0, 12);
}

/**
 * כתבות להצגה: טריות (24ש') *וגם* ידידותיות-למשפחה. שכבת הגנה נוספת שמסתירה
 * גם כתבות לא-הולמות שאולי נשמרו לפני שהגייט הופעל (לא רק חוסמת כתבות חדשות).
 */
export function visibleArticles(
  articles: Article[],
  maxAgeHours = MAX_AGE_HOURS,
): Article[] {
  const safe = articles.filter((a) =>
    isFamilySafe(`${a.headline} ${a.subtitle} ${a.summary}`),
  );
  return freshArticles(safe, maxAgeHours);
}
