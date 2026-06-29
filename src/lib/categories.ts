import type { Category } from "./types";

export interface CategoryMeta {
  slug: string;
  category: Category;
  label: string; // תווית בעברית
  short: string; // תווית קצרה לצ'יפ
  description: string;
  /** משקל היעד בתמהיל התוכן (אחוז) */
  targetShare: number;
  accent: string; // צבע (tailwind class) לצ'יפ
  bar: string; // צבע (tailwind class) לפס כותרת המקטע
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  avdija: {
    slug: "avdija",
    category: "avdija",
    label: "דני אבדיה",
    short: "אבדיה",
    description:
      "כל מה שקורה עם דני אבדיה ופורטלנד טרייל בלייזרס - עדכונים, שמועות ועובדות ממקורות בארץ ובארה\"ב.",
    targetShare: 45,
    accent: "bg-brand text-white",
    bar: "bg-brand",
  },
  nba: {
    slug: "nba",
    category: "nba",
    label: "NBA",
    short: "NBA",
    description:
      "החדשות הגדולות מסביב ל-NBA - הכוכבים, העסקאות והמשחקים הגדולים, עם ניתוח כדורסל ודעה מקצועית.",
    targetShare: 25,
    accent: "bg-court text-white",
    bar: "bg-court",
  },
  israeli_basketball: {
    slug: "israeli-basketball",
    category: "israeli_basketball",
    label: "כדורסל ישראלי",
    short: "כדורסל",
    description:
      "מכבי תל אביב, הפועל תל אביב, הפועל ירושלים - תוצאות, קלעים מובילים, שמועות והעברות.",
    targetShare: 20,
    accent: "bg-ochre text-white",
    bar: "bg-ochre",
  },
  world_football: {
    slug: "world-football",
    category: "world_football",
    label: "כדורגל עולמי",
    short: "כדורגל",
    description:
      "ליגת האלופות, הליגות הגדולות באירופה, נבחרת ישראל ומונדיאל.",
    targetShare: 10,
    accent: "bg-olive text-white",
    bar: "bg-olive",
  },
};

export const CATEGORY_ORDER: Category[] = [
  "avdija",
  "nba",
  "israeli_basketball",
  "world_football",
];

export function categoryBySlug(slug: string): CategoryMeta | undefined {
  return Object.values(CATEGORIES).find((c) => c.slug === slug);
}
