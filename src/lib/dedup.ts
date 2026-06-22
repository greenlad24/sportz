// דה-דופ ברמת *נושא* (לא רק קישור): מונע כתבות כפולות על אותו אירוע, גם
// כשמקורות שונים מדווחים עליו במרווח של יום או יותר. זה הפתרון לבעיית הכתבות
// החוזרות - גייט קשיח בקוד, לא הנחיה "רכה" ל-LLM (שהתעלם ממנה).
//
// העיקרון: לכל כתבה/אשכול מחשבים "חתימה" - אוסף הטוקנים המשמעותיים (שמות,
// קבוצות, מספרים) מהכותרת, בלי מילות-קישור. שני נושאים נחשבים כפולים אם
// חתימותיהם חופפות מעל סף (Jaccard), באותה קטגוריה ובתוך חלון זמן.

import type { Category } from "./types";
import { normalizeForCompare, wordSimilarity } from "./utils";

// מילות-עצירה (עברית + אנגלית): נפוצות מדי מכדי לזהות נושא, ומדללות חפיפה
// אמיתית בין שמות/ישויות. מסירים אותן לפני חישוב החתימה.
const STOPWORDS = new Set([
  // עברית
  "של", "על", "את", "עם", "אל", "כי", "גם", "אך", "או", "זה", "זו", "הוא",
  "היא", "הם", "הן", "אני", "אתה", "אנחנו", "יש", "אין", "לא", "כן", "מה",
  "מי", "איך", "כמו", "אחרי", "לפני", "בין", "תחת", "מעל", "כל", "כבר",
  "רק", "עוד", "אחד", "אחת", "שני", "אבל", "מול", "נגד", "בתוך", "אצל",
  "היום", "אתמול", "מחר", "השבוע", "הערב", "צפוי", "דיווח", "לפי", "כך",
  // אנגלית
  "the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "with",
  "is", "are", "was", "were", "be", "as", "at", "by", "from", "this",
  "that", "it", "his", "her", "they", "vs", "after", "before", "over",
  "new", "says", "report", "amid", "into", "out", "up", "down",
]);

/**
 * חתימת נושא: עד 12 הטוקנים המשמעותיים מהטקסט (שמות, קבוצות, מספרים),
 * ממוינים אלפביתית כדי שהשוואה תהיה עמידה לסדר מילים.
 */
export function topicSignature(text: string): string {
  const tokens = normalizeForCompare(text)
    .split(" ")
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
  // ייחוד + מיון: החתימה לא תלויה בסדר/חזרות
  return [...new Set(tokens)].sort().slice(0, 12).join(" ");
}

export interface CoveredTopic {
  sig: string;
  category: Category;
  at: number; // ms - מתי כוסה (לחלון זמן)
}

const DEFAULT_THRESHOLD = Number(process.env.DEDUP_SIMILARITY || 0.5);

/**
 * האם הנושא (לפי חתימתו וקטגוריה) כבר כוסה. כפילות = אותה קטגוריה +
 * חפיפת חתימות מעל הסף. בדיקה מול רשימת נושאים שכוסו (כתבות אחרונות + מה
 * שכבר מאושר/בתור באותה ריצה).
 */
export function isDuplicateTopic(
  sig: string,
  category: Category,
  covered: CoveredTopic[],
  threshold = DEFAULT_THRESHOLD,
): boolean {
  if (!sig) return false;
  for (const c of covered) {
    if (c.category !== category) continue;
    if (wordSimilarity(sig, c.sig) >= threshold) return true;
  }
  return false;
}
