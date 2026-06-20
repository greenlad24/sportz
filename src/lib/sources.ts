import type { Category } from "./types";

export interface Source {
  id: string;
  name: string; // שם תצוגה
  lang: "he" | "en";
  category: Category;
  url: string;
  /** משקל בסיסי לרלוונטיות - מקורות ישראליים/ייעודיים מקבלים יותר */
  weight: number;
}

/**
 * אנו נשענים בעיקר על חיפושי Google News RSS - הם מחזירים חדשות מיידיות
 * ממגוון רחב של מקורות (בדיוק מה שצריך), גם בעברית וגם מארה"ב, ואפשר
 * לכוון אותם לפי שאילתה. בנוסף יש כמה פידים ישירים מאתרי ספורט ישראליים.
 *
 * פורמט חיפוש Google News:
 *   עברית: hl=he&gl=IL&ceid=IL:he
 *   אנגלית: hl=en-US&gl=US&ceid=US:en
 */
function googleNews(query: string, lang: "he" | "en"): string {
  const params =
    lang === "he"
      ? "hl=he&gl=IL&ceid=IL:he"
      : "hl=en-US&gl=US&ceid=US:en";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(
    query,
  )}&${params}`;
}

export const SOURCES: Source[] = [
  // ─── דני אבדיה / פורטלנד בלייזרס (70-80%) ───
  {
    id: "gn-avdija-he",
    name: "Google News (אבדיה)",
    lang: "he",
    category: "avdija",
    url: googleNews("דני אבדיה", "he"),
    weight: 10,
  },
  {
    id: "gn-avdija-en",
    name: "Google News (Avdija)",
    lang: "en",
    category: "avdija",
    url: googleNews("Deni Avdija", "en"),
    weight: 10,
  },
  {
    id: "gn-blazers-en",
    name: "Google News (Blazers)",
    lang: "en",
    category: "avdija",
    url: googleNews("Portland Trail Blazers Avdija", "en"),
    weight: 8,
  },
  {
    id: "reddit-ripcity",
    name: "r/ripcity",
    lang: "en",
    category: "avdija",
    url: "https://www.reddit.com/r/ripcity/.rss",
    weight: 4,
  },

  // ─── כדורסל ישראלי (20%) ───
  {
    id: "gn-maccabi",
    name: "Google News (מכבי ת\"א)",
    lang: "he",
    category: "israeli_basketball",
    url: googleNews("מכבי תל אביב כדורסל", "he"),
    weight: 8,
  },
  {
    id: "gn-hapoel-tlv",
    name: "Google News (הפועל ת\"א)",
    lang: "he",
    category: "israeli_basketball",
    url: googleNews("הפועל תל אביב כדורסל", "he"),
    weight: 7,
  },
  {
    id: "gn-hapoel-jlm",
    name: "Google News (הפועל י-ם)",
    lang: "he",
    category: "israeli_basketball",
    url: googleNews("הפועל ירושלים כדורסל", "he"),
    weight: 7,
  },

  // ─── כדורגל עולמי (10%) ───
  {
    id: "gn-ucl",
    name: "Google News (ליגת האלופות)",
    lang: "he",
    category: "world_football",
    url: googleNews("ליגת האלופות כדורגל", "he"),
    weight: 5,
  },
  {
    id: "gn-israel-nt",
    name: "Google News (נבחרת ישראל)",
    lang: "he",
    category: "world_football",
    url: googleNews("נבחרת ישראל כדורגל", "he"),
    weight: 6,
  },
];
