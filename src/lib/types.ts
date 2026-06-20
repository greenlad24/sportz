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
}

/** כתבה מוגמרת בעברית, כפי שמוצגת באתר ונשמרת באחסון */
export interface Article {
  id: string;
  slug: string;
  category: Category;
  headline: string; // כותרת ראשית
  subtitle: string; // כותרת משנה
  summary: string; // תקציר קצר לכרטיס / meta description
  body: string; // גוף הכתבה (פסקאות מופרדות בשורה ריקה)
  tags: string[];
  importance: number; // 1-10
  sourceName: string;
  sourceUrl: string;
  imageUrl?: string;
  publishedAt: string; // ISO - זמן האירוע/המקור
  createdAt: string; // ISO - זמן יצירת הכתבה אצלנו
}

/** מבנה הפלט שמבקשים מ-Claude */
export interface GeneratedArticle {
  category: Category;
  headline: string;
  subtitle: string;
  summary: string;
  body: string;
  tags: string[];
  importance: number;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
}
