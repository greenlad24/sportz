import type { RawItem } from "./types";
import { stripHtml } from "./utils";
import { inferCategory } from "./relevance";

export interface HtmlSite {
  id: string;
  name: string; // שם תצוגה
  url: string; // עמוד לשאיבה (בית / מדור ספורט)
  base: string; // בסיס לפתרון קישורים יחסיים
}

/**
 * אתרי הספורט הישראליים. אין להם פידי RSS שמישים, ולכן אנחנו שואבים את ה-HTML
 * של עמוד הספורט ומחלצים כותרות + קישורים. הקטגוריה מזוהה לפי תוכן הכותרת.
 */
export const ISRAELI_SITES: HtmlSite[] = [
  {
    id: "sport5",
    name: "ספורט 5",
    url: "https://www.sport5.co.il/",
    base: "https://www.sport5.co.il",
  },
  {
    id: "one",
    name: "ONE",
    url: "https://www.one.co.il/",
    base: "https://www.one.co.il",
  },
  {
    id: "walla",
    name: "וואלה! ספורט",
    url: "https://sports.walla.co.il/",
    base: "https://sports.walla.co.il",
  },
  {
    id: "ynet",
    name: "ynet ספורט",
    url: "https://www.ynet.co.il/sport",
    base: "https://www.ynet.co.il",
  },
  {
    id: "maariv",
    name: "ספורט 1 (מעריב)",
    url: "https://sport1.maariv.co.il/",
    base: "https://sport1.maariv.co.il",
  },
];

/** האם ה-href נראה כמו קישור לכתבה (ולא ניווט/מדור) */
function looksLikeArticle(href: string): boolean {
  if (!href || href.startsWith("#") || href.startsWith("javascript:"))
    return false;
  // מזהה רצף של 5+ ספרות (מזהה כתבה), או נתיבי כתבה נפוצים
  return (
    /\d{5,}/.test(href) ||
    /\/(article|articles|item|news)\b/i.test(href)
  );
}

function sameDomain(url: string, base: string): boolean {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    const b = new URL(base).hostname.replace(/^www\./, "");
    // משווה דומיין-ליבה (walla.co.il == sports.walla.co.il)
    const core = (host: string) => host.split(".").slice(-3).join(".");
    return core(h).includes(core(b)) || core(b).includes(core(h));
  } catch {
    return false;
  }
}

/** חילוץ פריטים מתוך בלוקים של JSON-LD (כשקיימים - המקור האמין ביותר) */
function fromJsonLd(html: string, site: HtmlSite): RawItem[] {
  const items: RawItem[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const json = JSON.parse(m[1].trim());
      collectLd(json, site, items);
    } catch {
      // JSON לא תקין - דלג
    }
  }
  return items;
}

/** חילוץ URL של תמונה משדה image של JSON-LD (string / object / array) */
function ldImage(img: unknown): string | undefined {
  if (!img) return undefined;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) return ldImage(img[0]);
  const o = img as Record<string, any>;
  const u = o.url || o["@id"] || o.contentUrl;
  return typeof u === "string" ? u : undefined;
}

function collectLd(node: unknown, site: HtmlSite, out: RawItem[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) collectLd(n, site, out);
    return;
  }
  const obj = node as Record<string, any>;
  const type = obj["@type"];
  const isArticle =
    typeof type === "string" && /article/i.test(type);
  const headline = obj.headline || obj.name;
  const url = obj.url || obj.mainEntityOfPage?.["@id"] || obj.mainEntityOfPage;

  if (isArticle && typeof headline === "string" && typeof url === "string") {
    const title = stripHtml(headline);
    const category = inferCategory(`${title} ${obj.description || ""}`);
    if (category && title.length >= 12) {
      out.push({
        title,
        summary: stripHtml(String(obj.description || "")),
        link: url,
        source: site.name,
        lang: "he",
        category,
        publishedAt: toIso(obj.datePublished),
        image: ldImage(obj.image),
      });
    }
  }

  // המשך לרדת לרשימות פריטים מקוננות
  if (obj.itemListElement) collectLd(obj.itemListElement, site, out);
  if (obj.item) collectLd(obj.item, site, out);
  if (obj["@graph"]) collectLd(obj["@graph"], site, out);
}

/** חילוץ פריטים מתוך תגיות <a> בעמוד (גיבוי / השלמה ל-JSON-LD) */
function fromAnchors(html: string, site: HtmlSite): RawItem[] {
  const items: RawItem[] = [];
  const seen = new Set<string>();
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = re.exec(html)) !== null && count < 400) {
    count++;
    const rawHref = m[1];
    const title = stripHtml(m[2]);
    if (!title || title.length < 12 || title.length > 200) continue;
    if (!looksLikeArticle(rawHref)) continue;

    let url: string;
    try {
      url = new URL(rawHref, site.base).toString();
    } catch {
      continue;
    }
    if (!sameDomain(url, site.base)) continue;
    if (seen.has(url)) continue;

    const category = inferCategory(title);
    if (!category) continue;

    seen.add(url);
    items.push({
      title,
      summary: "",
      link: url,
      source: site.name,
      lang: "he",
      category,
      // אין תאריך בעמוד הבית. לא מדביקים "עכשיו" (זו הסיבה לחדשות ישנות שנראות
      // טריות) - משאירים ריק; אימות-הטריות במורד הזרם ישלוף את תאריך הפרסום
      // האמיתי מהכתבה עצמה ויסנן אם אינה מ-24 השעות האחרונות.
      publishedAt: "",
    });
  }
  return items;
}

// תאריך לא ידוע -> מחרוזת ריקה (לא "עכשיו"). ראה ההסבר ב-rss.ts.
function toIso(value: unknown): string {
  if (!value) return "";
  const t = new Date(String(value)).getTime();
  return Number.isNaN(t) ? "" : new Date(t).toISOString();
}

async function scrapeSite(site: HtmlSite): Promise<RawItem[]> {
  try {
    const res = await fetch(site.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn(`[scrape] ${site.id} -> HTTP ${res.status}`);
      return [];
    }
    const html = await res.text();

    const ld = fromJsonLd(html, site);
    const anchors = fromAnchors(html, site);

    // איחוד והסרת כפילויות לפי URL (JSON-LD מקבל עדיפות)
    const byUrl = new Map<string, RawItem>();
    for (const it of [...ld, ...anchors]) {
      if (!byUrl.has(it.link)) byUrl.set(it.link, it);
    }
    return [...byUrl.values()].slice(0, 60);
  } catch (err) {
    console.warn(`[scrape] ${site.id} failed:`, (err as Error).message);
    return [];
  }
}

/** שאיבה ישירה מכל האתרים הישראליים במקביל */
export async function scrapeIsraeliSites(): Promise<RawItem[]> {
  const results = await Promise.all(ISRAELI_SITES.map(scrapeSite));
  return results.flat();
}
