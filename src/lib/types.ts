// טיפוסי הליבה של מנוע הניוז ושל אתר SPORTZ

export type Category = "avdija" | "israeli_basketball" | "world_football";

/** פריט גולמי שנשאב מ-RSS לפני עיבוד ע"י Claude */
export interface RawItem {
  title: string;
  summary: string;
  link: string;
  source: string; // שם המקור (הפיד)
  lang: "he" | "en";
  category: Category;
  publishedAt: string; // ISO
  image?: string; // תמונה שחולצה מהמקור (אם קיימת)
  fullText?: string; // גוף הכתבה המלא מהמקור (נשאב לפני יצירה, לעומק ודיוק)
}

/** כתבה מוגמרת בעברית, כפי שמוצגת באתר ונשמרת באחסון */
export interface Article {
  id: string;
  slug: string;
  category: Category;
  subcategory?: string; // תת-קטגוריה חופשית שה-AI מקצה (למשל "פלייאוף NBA", "יורוליג")
  headline: string; // כותרת ראשית
  subtitle: string; // כותרת משנה
  summary: string; // תקציר קצר לכרטיס / meta description
  body: string; // גוף הכתבה (פסקאות מופרדות בשורה ריקה; כותרות משנה ב-## )
  tags: string[];
  importance: number; // 1-10
  sourceName: string;
  sourceUrl: string;
  imageUrl?: string;
  imageCredit?: { source: string; link: string }; // קרדיט לתמונה (Google, אתרי ארה"ב)
  videoId?: string; // מזהה סרטון YouTube להטמעה בתוך הכתבה (אם נמצא)
  publishedAt: string; // ISO - זמן האירוע/המקור
  createdAt: string; // ISO - זמן יצירת הכתבה אצלנו
  updatedAt?: string; // ISO - עודכן לאחרונה (כשסיפור מתפתח וגדל); קיים רק אם עודכן
}

/** מבנה הפלט שמבקשים מ-Claude */
export interface GeneratedArticle {
  category: Category;
  subcategory?: string;
  headline: string;
  subtitle: string;
  summary: string;
  body: string;
  tags: string[];
  importance: number;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  /** מונחי חיפוש באנגלית לאיתור תמונה/וידאו רלוונטיים (אתרי ארה"ב) */
  imageQuery?: string;
}

/** "עדכון" = עובדה מאומתת/מקור שעליו מבוססות הכתבות (הרכב, תוצאה, דיווח, שמועה) */
export interface GeneratedUpdate {
  category: Category;
  text: string;
}

export interface Update {
  id: string;
  category: Category;
  text: string;
  createdAt: string; // ISO
}

export interface Comment {
  id: string;
  articleId: string;
  name: string;
  text: string;
  createdAt: string; // ISO
}

/** שידור בודד בלוח השידורים (משחק/תכנית בערוץ ספורט, בשעה נתונה) */
export interface Broadcast {
  channel: string; // שם הערוץ, למשל "ערוץ הספורט"
  time: string; // "20:00" (שעון ישראל)
  event: string; // "ליגת העל בכדורסל: מכבי ת\"א - הפועל ת\"א"
  isLive: boolean; // שידור ישיר
}

/** יום בלוח השידורים: תאריך + רשימת השידורים שלו */
export interface BroadcastDay {
  date: string; // "YYYY-MM-DD" (שעון ישראל) - מפתח
  dmy: string; // "DD/MM/YYYY" - תצוגה
  dayLabel: string; // "יום ראשון"
  items: Broadcast[];
}

/** לוח השידורים השמור (כולל חותמת זמן השאיבה, לבקרת רעננות) */
export interface BroadcastStore {
  fetchedAt: string; // ISO - מתי נשאב לאחרונה מהמקור
  days: BroadcastDay[];
}

/** מבנה הפלט המלא של ה-LLM */
export interface LlmOutput {
  articles: GeneratedArticle[];
  updates: GeneratedUpdate[];
}

/**
 * "אשכול ממתין" - סיפור אחד (פריט ראשי + מקורות-משנה על אותו אירוע) שנשאב,
 * הועשר בטקסט מלא, עבר דה-דופ, וממתין בתור להיכתב. שלב התכנון (planRefresh)
 * דוחף אותם לתור; שלב הכתיבה (writeNext) שולף אחד-אחד וכותב כתבה לכל אשכול.
 */
export interface QueuedGroup {
  id: string; // זהות יציבה (hash של קישור הפריט הראשי) - למניעת כפילות בתור
  category: Category;
  primary: RawItem; // הפריט הראשי (עם fullText אם נשאב)
  related: RawItem[]; // מקורות נוספים על אותו סיפור (עם fullText כשנשאב)
  sig: string; // חתימת נושא (טוקנים מנורמלים) - לזיהוי כפילויות בין-ריצתי
  score: number; // ניקוד רלוונטיות (לדירוג בתור)
  enqueuedAt: string; // ISO - מתי נכנס לתור (ל-TTL וסדר שליפה)
  /**
   * אם מוגדר: האשכול הזה אינו כתבה חדשה אלא *התפתחות* של סיפור שכבר כיסינו.
   * הערך הוא ה-id של הכתבה הקיימת; שלב הכתיבה ירחיב/יעדכן אותה במקום ליצור כפילות.
   */
  updateOf?: string;
}

/** סטטיסטיקות עונה מאומתות לשחקן (מקור חיצוני חינמי) - להזרקה לפרומפט */
export interface PlayerSeasonStats {
  name: string; // שם השחקן
  season: string; // תווית העונה, למשל "2025-26"
  team?: string; // קבוצה נוכחית
  gamesPlayed?: number;
  points?: number; // ממוצע נקודות למשחק
  rebounds?: number; // ממוצע ריבאונדים
  assists?: number; // ממוצע אסיסטים
  steals?: number;
  blocks?: number;
  fgPct?: number; // אחוז קליעה מהשדה (0-1)
  fg3Pct?: number; // אחוז קליעה לשלוש
  minutes?: number; // דקות ממוצעות
}
