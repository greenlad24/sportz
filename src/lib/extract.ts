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

/**
 * שאיבת גוף הכתבה המלא מ-URL. קישורי Google News נפתרים תחילה ל-URL המקור.
 * מחזיר טקסט נקי (עד MAX_CHARS) או null.
 */
export async function fetchArticleText(url: string): Promise<string | null> {
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
    return norm.slice(0, MAX_CHARS);
  } catch {
    return null;
  }
}

/**
 * העשרת פריטים בטקסט מלא מהמקור, במקביל עם תקרת מקביליות (כדי לא להציף
 * את היעדים). משנה את הפריטים במקום (it.fullText) ומחזיר כמה הועשרו.
 */
export async function enrichWithArticleText<
  T extends { link: string; fullText?: string },
>(items: T[], concurrency = 6): Promise<number> {
  let enriched = 0;
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const it = items[next++];
      const text = await fetchArticleText(it.link);
      if (text) {
        it.fullText = text;
        enriched++;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return enriched;
}
