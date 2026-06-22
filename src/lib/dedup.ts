// דה-דופ ברמת *נושא* (לא רק קישור): מונע כתבות כפולות על אותו אירוע, גם
// כשמקורות שונים מדווחים עליו במרווח של יום או יותר. זה הפתרון לבעיית הכתבות
// החוזרות - גייט קשיח בקוד, לא הנחיה "רכה" ל-LLM (שהתעלם ממנה).
//
// העיקרון: לכל כתבה/אשכול מחשבים "חתימה" - אוסף הטוקנים המשמעותיים (שמות,
// קבוצות, מספרים) מהכותרת, בלי מילות-קישור. שני נושאים נחשבים כפולים אם
// חתימותיהם חופפות מעל סף (Jaccard), באותה קטגוריה ובתוך חלון זמן.

import type { Category } from "./types";
import { normalizeForCompare } from "./utils";

// תחיliות עבריות נפוצות (מילות-יחס/כינוי) שמודבקות למילה ומשנות את הטוקן בלי
// לשנות את המשמעות: "ומשפחות"=="משפחות", "במונדיאל"=="מונדיאל". מסירים אותן
// כדי שאותו שם/מושג ייתן אותו טוקן בשני המקורות. *לא* מסירים מ' - היא לרוב
// אות-שורש (מכבי, מונדיאל, מאמן) ולא תחילית.
const STRIP_PREFIX = new Set(["ו", "ה", "ב", "ל", "כ", "ש"]);

function stemHe(word: string): string {
  let s = word;
  // מסירים עד 2 תחיליות, אך לא מקצרים מתחת ל-2 תווים
  for (let i = 0; i < 2 && s.length > 2 && STRIP_PREFIX.has(s[0]); i++) {
    s = s.slice(1);
  }
  return s;
}

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
 * חתימת נושא: עד 24 הטוקנים המשמעותיים (גזורי-תחילית) מהטקסט - שמות, קבוצות,
 * מספרים - ממוינים, ללא מילות-עצירה. הזֵן טקסט עשיר (כותרת + כותרת-משנה +
 * תקציר) כדי לתפוס "אותו סיפור" גם כשהכותרות מנוסחות אחרת.
 */
export function topicSignature(text: string): string {
  const tokens = normalizeForCompare(text)
    .split(" ")
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
    .map(stemHe)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
  return [...new Set(tokens)].sort().slice(0, 24).join(" ");
}

export interface CoveredTopic {
  sig: string;
  category: Category;
  at: number; // ms - מתי כוסה (לחלון זמן)
}

const DEFAULT_THRESHOLD = Number(process.env.DEDUP_SIMILARITY || 0.38);
// הרבה טוקנים-שורש משותפים = "אותו סיפור" כמעט בוודאות, גם אם המקדם נמוך
// (טקסטים באורך שונה מאוד). מוגדר גבוה כדי לא לתפוס כתבות שונות של אותה קבוצה
// (ששיתפו רק שם-קבוצה/מאמן - מעט טוקנים).
const SHARED_TOKENS_DUP = Number(process.env.DEDUP_SHARED_TOKENS || 6);

/**
 * מדד דמיון בין שתי חתימות: מקדם חפיפה (חיתוך / הקטן שבין הסטים) - עמיד יותר
 * מ-Jaccard כשאורכי הטקסטים שונים. מחזיר גם את מספר הטוקנים המשותפים.
 */
function overlap(a: string, b: string): { coef: number; shared: number } {
  const sa = new Set(a.split(" ").filter(Boolean));
  const sb = new Set(b.split(" ").filter(Boolean));
  if (sa.size === 0 || sb.size === 0) return { coef: 0, shared: 0 };
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return { coef: inter / Math.min(sa.size, sb.size), shared: inter };
}

/**
 * האם הנושא כבר כוסה. כפילות = אותה קטגוריה + (מקדם חפיפה מעל הסף עם לפחות 3
 * טוקנים משותפים, או לפחות SHARED_TOKENS_DUP טוקני-שורש משותפים). תופס "אותו
 * סיפור" גם כשנוסח אחרת ע"י מקור אחר.
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
    const { coef, shared } = overlap(sig, c.sig);
    if (shared >= SHARED_TOKENS_DUP) return true;
    if (coef >= threshold && shared >= 3) return true;
  }
  return false;
}
