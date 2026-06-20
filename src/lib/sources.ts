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
    id: "hoopshype",
    name: "HoopsHype",
    lang: "en",
    category: "avdija",
    url: "https://hoopshype.com/feed/",
    weight: 5,
    broad: true,
  },
  {
    id: "slamonline",
    name: "SLAM",
    lang: "en",
    category: "avdija",
    url: "https://www.slamonline.com/category/nba/feed/",
    weight: 5,
    broad: true,
  },
  // פידי NBA נוספים דרך Feedspot (חלקם ממקורות בתשלום כמו The Athletic)
  {
    id: "fs-athletic-nba",
    name: "The Athletic NBA",
    lang: "en",
    category: "avdija",
    url: "https://www.feedspot.com/infiniterss.php?_src=feed_title&followfeedid=5251056&q=site:https%3A%2F%2Ftheathletic.com%2Fnba%2F%3Frss",
    weight: 5,
    broad: true,
  },
  {
    id: "fs-2298",
    name: "Feedspot NBA 1",
    lang: "en",
    category: "avdija",
    url: "https://www.feedspot.com/infiniterss.php?_src=feed_title&followfeedid=2298&q=site:",
    weight: 4,
    broad: true,
  },
  {
    id: "fs-5365568",
    name: "Feedspot NBA 2",
    lang: "en",
    category: "avdija",
    url: "https://www.feedspot.com/infiniterss.php?_src=feed_title&followfeedid=5365568&q=site:",
    weight: 4,
    broad: true,
  },
  {
    id: "fs-5463730",
    name: "Feedspot NBA 3",
    lang: "en",
    category: "avdija",
    url: "https://www.feedspot.com/infiniterss.php?_src=feed_title&followfeedid=5463730&q=site:",
    weight: 4,
    broad: true,
  },
  {
    id: "fs-5463736",
    name: "Feedspot NBA 4",
    lang: "en",
    category: "avdija",
    url: "https://www.feedspot.com/infiniterss.php?_src=feed_title&followfeedid=5463736&q=site:",
    weight: 4,
    broad: true,
  },
  {
    id: "fs-5365565",
    name: "Feedspot NBA 5",
    lang: "en",
    category: "avdija",
    url: "https://www.feedspot.com/infiniterss.php?_src=feed_title&followfeedid=5365565&q=site:",
    weight: 4,
    broad: true,
  },
  {
    id: "fs-5365574",
    name: "Feedspot NBA 6",
    lang: "en",
    category: "avdija",
    url: "https://www.feedspot.com/infiniterss.php?_src=feed_title&followfeedid=5365574&q=site:",
    weight: 4,
    broad: true,
  },
  {
    id: "fs-5365591",
    name: "Feedspot NBA 7",
    lang: "en",
    category: "avdija",
    url: "https://www.feedspot.com/infiniterss.php?_src=feed_title&followfeedid=5365591&q=site:",
    weight: 4,
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
