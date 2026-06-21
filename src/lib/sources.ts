import type { Category } from "./types";

export interface Source {
  id: string;
  name: string; // שם תצוגה
  lang: "he" | "en";
  category: Category;
  url: string;
  /** משקל בסיסי לרלוונטיות - מקורות ישראליים/ייעודיים מקבלים יותר */
  weight: number;
  /**
   * מקור "רחב" = פיד NBA כללי (לא ממוקד באבדיה). מפריטים כאלה נשמרים רק
   * פריטים שמזכירים במפורש את אבדיה/בלייזרס, כדי לא להציף את הקטגוריה
   * בחדשות NBA לא רלוונטיות.
   */
  broad?: boolean;
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
    // חיפוש "דני אבדיה" מ-24 השעות האחרונות (when:1d)
    url: googleNews("דני אבדיה when:1d", "he"),
    weight: 10,
  },
  {
    id: "gn-avdija-en",
    name: "Google News (Avdija)",
    lang: "en",
    category: "avdija",
    // חיפוש "Deni Avdija" מ-24 השעות האחרונות (when:1d)
    url: googleNews("Deni Avdija when:1d", "en"),
    weight: 10,
  },
  {
    id: "gn-blazers-en",
    name: "Google News (Blazers)",
    lang: "en",
    category: "avdija",
    url: googleNews("Portland Trail Blazers Avdija when:1d", "en"),
    weight: 8,
  },
  {
    id: "reddit-ripcity",
    name: "r/ripcity",
    lang: "en",
    category: "avdija",
    url: "https://www.reddit.com/r/ripcity/.rss",
    weight: 4,
    broad: true,
  },

  // ─── פידי NBA כלליים (אנגלית) - מהם נשמרים רק פריטי אבדיה/בלייזרס ───
  {
    id: "espn-nba",
    name: "ESPN NBA",
    lang: "en",
    category: "avdija",
    url: "https://www.espn.com/espn/rss/nba/news",
    weight: 6,
    broad: true,
  },
  {
    id: "cbs-nba",
    name: "CBS Sports NBA",
    lang: "en",
    category: "avdija",
    url: "https://www.cbssports.com/rss/headlines/nba/",
    weight: 5,
    broad: true,
  },
  {
    id: "yahoo-nba",
    name: "Yahoo Sports NBA",
    lang: "en",
    category: "avdija",
    url: "https://sports.yahoo.com/nba/rss/",
    weight: 5,
    broad: true,
  },
  {
    id: "reddit-nba",
    name: "r/nba",
    lang: "en",
    category: "avdija",
    url: "https://www.reddit.com/r/nba/.rss",
    weight: 3,
    broad: true,
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
  {
    id: "gn-euroleague",
    name: "Google News (יורוליג)",
    lang: "he",
    category: "israeli_basketball",
    url: googleNews("יורוליג כדורסל", "he"),
    weight: 6,
  },
  {
    id: "gn-winner",
    name: "Google News (ליגת ווינר)",
    lang: "he",
    category: "israeli_basketball",
    url: googleNews("ליגת ווינר כדורסל", "he"),
    weight: 6,
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
  {
    id: "gn-premier",
    name: "Google News (פרמייר ליג)",
    lang: "he",
    category: "world_football",
    url: googleNews("פרמייר ליג כדורגל", "he"),
    weight: 5,
  },
  {
    id: "gn-laliga",
    name: "Google News (לה ליגה)",
    lang: "he",
    category: "world_football",
    url: googleNews("לה ליגה ריאל מדריד ברצלונה", "he"),
    weight: 5,
  },
  {
    id: "gn-transfers",
    name: "Google News (העברות)",
    lang: "he",
    category: "world_football",
    url: googleNews("העברות כדורגל אירופה", "he"),
    weight: 4,
  },
];
