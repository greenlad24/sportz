// שאיבת גוף הכתבה המלא ממקור ישיר, לפני היצירה. ה-RSS/scrape נותנים רק כותרת
// וקטע קצר, ולכן הכותב קיבל מעט מדי עובדות (שמות, מספרים, ציטוטים) - מה שגרם
// לכתבות עמומות. כאן אנחנו מושכים את הטקסט המלא כדי שהכותב יעבוד על העובדות
// האמיתיות. best-effort: כישלון/חסימה -> מחזירים null והפריט נשאר עם הקטע הקצר.

import { stripHtml } from "./utils";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const MAX_CHARS = 3000; // תקרת אורך לטקסט שנשלח ל-LLM (איזון עומק מול טוקנים)

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function isHttp(url: string): boolean {
  try {
    return /^https?:$/.test(new URL(url).protocol);
  } catch {
    return false;
  }
}

function isGoogleNews(url: string): boolean {
  return safeHost(url).endsWith("news.google.com");
}

/** האם אפשר לשאוב את ה-URL ישירות (אחרי פתרון הפניות Google News) */
function isFetchable(url: string): boolean {
  return isHttp(url) && !isGoogleNews(url);
}

/**
 * פתרון קישור Google News (הפניה) ל-URL המקור האמיתי.
 * שיטה 1 (מהירה, ללא רשת): מזהה ה-article הוא base64 של protobuf שמכיל את
 * ה-URL כטקסט; מפענחים וסורקים את ה-URL הראשון שאינו של גוגל. עובד לרוב
 * הקישורים מפורמט "CBMi...". שיטה 2 (גיבוי): מבקשים את הדף ועוקבים אחרי
 * ההפניה. best-effort - אם נכשל מחזיר null והפריט נשאר עם הקטע הקצר.
 */
function decodeGoogleNewsUrl(googleUrl: string): string | null {
  try {
    const u = new URL(googleUrl);
    const m =
      u.pathname.match(/\/(?:rss\/)?articles\/([^/?]+)/) ||
      u.pathname.match(/\/read\/([^/?]+)/);
    if (!m) return null;
    let seg = m[1].replace(/-/g, "+").replace(/_/g, "/");
    while (seg.length % 4) seg += "=";
    const txt = Buffer.from(seg, "base64").toString("latin1");
    const hit = txt.match(/https?:\/\/[^\s\x00-\x1f"'<>\\]+/);
    if (!hit) return null;
    // קטיעת "זנב" של protobuf אחרי ה-URL (בייטים לא-ASCII)
    const found = hit[0].replace(/[\x80-\xff].*$/, "");
    if (found.length > 12 && !found.includes("news.google.com")) return found;
    return null;
  } catch {
    return null;
  }
}

async function resolveArticleUrl(url: string): Promise<string | null> {
  if (!isGoogleNews(url)) return isHttp(url) ? url : null;
  const decoded = decodeGoogleNewsUrl(url);
  if (decoded) return decoded;
  // גיבוי: בקשה רגילה - לעיתים גוגל מפנה (302/JS) לאתר המקור
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "he-IL,he;q=0.9,en;q=0.8" },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.url && !isGoogleNews(res.url) && isHttp(res.url)) return res.url;
  } catch {
    // התעלם - נשאר עם הקטע הקצר
  }
  return null;
}

/** חיפוש articleBody בתוך JSON-LD (המקור האמין; קיים ברוב אתרי החדשות) */
function findArticleBody(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const b = findArticleBody(n);
      if (b) return b;
    }
    return null;
  }
  const o = node as Record<string, unknown>;
  if (typeof o.articleBody === "string" && o.articleBody.trim().length > 200) {
    return o.articleBody.trim();
  }
  if (o["@graph"]) {
    const b = findArticleBody(o["@graph"]);
    if (b) return b;
  }
  return null;
}

function articleBodyFromJsonLd(html: string): string | null {
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const json = JSON.parse(m[1].trim());
      const body = findArticleBody(json);
      if (body) return body;
    } catch {
      // JSON לא תקין - דלג
    }
  }
  return null;
}

/** חיפוש datePublished/dateCreated בתוך JSON-LD (המקור האמין לתאריך הפרסום) */
function findDatePublished(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const d = findDatePublished(n);
      if (d) return d;
    }
    return null;
  }
  const o = node as Record<string, unknown>;
  for (const key of ["datePublished", "dateCreated", "uploadDate"]) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  if (o["@graph"]) {
    const d = findDatePublished(o["@graph"]);
    if (d) return d;
  }
  return null;
}

/**
 * תאריך הפרסום *האמיתי* של הכתבה מתוך ה-HTML: קודם JSON-LD (datePublished),
 * ואז תגיות meta נפוצות. מחזיר ISO תקין או null. זהו הבסיס לאימות "באמת מ-24
 * השעות האחרונות" - להבדיל מזמן האינדוקס של Google News.
 */
function extractPublishedAt(html: string): string | null {
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const date = findDatePublished(JSON.parse(m[1].trim()));
      if (date) {
        const t = new Date(date).getTime();
        if (!Number.isNaN(t)) return new Date(t).toISOString();
      }
    } catch {
      // JSON לא תקין - דלג
    }
  }
  // גיבוי: תגיות meta נפוצות לזמן פרסום
  const metaPatterns = [
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["'](?:pubdate|publishdate|date|dc\.date|sailthru\.date)["'][^>]+content=["']([^"']+)["']/i,
    /<time[^>]+datetime=["']([^"']+)["'][^>]*>/i,
  ];
  for (const p of metaPatterns) {
    const mm = html.match(p);
    if (mm) {
      const t = new Date(mm[1]).getTime();
      if (!Number.isNaN(t)) return new Date(t).toISOString();
    }
  }
  return null;
}

/** גיבוי: איחוד הטקסט מתגיות <p> משמעותיות (אחרי הסרת script/style) */
function textFromParagraphs(html: string): string | null {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const ps = cleaned.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const texts = ps
    .map((p) => stripHtml(p).trim())
    .filter((t) => t.length > 40);
  if (texts.length === 0) return null;
  const joined = texts.join("\n\n");
  return joined.length > 200 ? joined : null;
}

export interface FetchedArticle {
  text: string; // גוף הכתבה הנקי (עד MAX_CHARS)
  publishedAt?: string; // תאריך הפרסום האמיתי (ISO), אם נמצא ב-HTML
}

/**
 * שאיבת גוף הכתבה המלא + תאריך הפרסום האמיתי מ-URL. קישורי Google News נפתרים
 * תחילה ל-URL המקור. מחזיר {text, publishedAt?} או null.
 */
export async function fetchArticle(url: string): Promise<FetchedArticle | null> {
  const real = await resolveArticleUrl(url);
  if (!real || !isFetchable(real)) return null;
  try {
    const res = await fetch(real, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") || "").includes("html")) return null;
    const html = await res.text();
    const body = articleBodyFromJsonLd(html) || textFromParagraphs(html);
    if (!body) return null;
    const norm = body.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    return {
      text: norm.slice(0, MAX_CHARS),
      publishedAt: extractPublishedAt(html) ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * העשרת פריטים מהמקור, במקביל עם תקרת מקביליות. משנה את הפריטים במקום:
 * - it.fullText = גוף הכתבה המלא (כשנשאב).
 * - it.publishedAt = תאריך הפרסום *האמיתי* (כשנמצא ב-HTML) - גובר על הזמן
 *   מ-RSS/Google News, ומאפשר אימות-טריות מדויק (האם באמת מ-24 השעות).
 * מחזיר כמה פריטים הועשרו בטקסט מלא.
 */
export async function enrichWithArticleText<
  T extends {
    link: string;
    fullText?: string;
    publishedAt?: string;
    dateVerified?: boolean;
  },
>(items: T[], concurrency = 6): Promise<number> {
  let enriched = 0;
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const it = items[next++];
      const fetched = await fetchArticle(it.link);
      if (fetched) {
        it.fullText = fetched.text;
        // תאריך מעמוד הכתבה = תאריך *מאומת* (זה הקובע אם הפריט ייכתב).
        if (fetched.publishedAt) {
          it.publishedAt = fetched.publishedAt;
          it.dateVerified = true;
        }
        enriched++;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return enriched;
}
