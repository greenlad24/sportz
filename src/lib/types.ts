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

/** מבנה הפלט המלא של ה-LLM */
export interface LlmOutput {
  articles: GeneratedArticle[];
  updates: GeneratedUpdate[];
}
