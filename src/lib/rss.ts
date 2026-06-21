import { XMLParser } from "fast-xml-parser";
import type { RawItem } from "./types";
import type { Source } from "./sources";
import { stripHtml } from "./utils";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  // לא לעבד ישויות XML - מונע את שגיאת "Entity expansion limit" (למשל ב-Reddit).
  // ה-decoding של &amp; / &quot; וכו' נעשה ממילא ב-stripHtml.
  processEntities: false,
});

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function firstMediaUrl(node: unknown): string | undefined {
  for (const m of asArray(node as any)) {
    const url = m?.["@_url"];
    if (typeof url === "string" && url) return url;
  }
  return undefined;
}

/** חילוץ תמונה מפריט RSS/Atom: media, enclosure, או <img> ראשון בתיאור */
function extractImage(node: any, html: string): string | undefined {
  const media =
    firstMediaUrl(node?.["media:content"]) ||
    firstMediaUrl(node?.["media:thumbnail"]);
  if (media) return cleanUrl(media);

  for (const e of asArray(node?.enclosure)) {
    const url = e?.["@_url"];
    const type = String(e?.["@_type"] || "");
    if (url && (type.startsWith("image") || !type)) return cleanUrl(url);
  }

  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m) return cleanUrl(m[1]);

  return undefined;
}

function cleanUrl(url: string): string {
  return url.replace(/&amp;/g, "&").trim();
}

/** שאיבת פיד RSS/Atom יחיד והמרה ל-RawItem[] */
async function fetchSource(source: Source): Promise<RawItem[]> {
  try {
    const res = await fetch(source.url, {
      headers: {
        // User-Agent של דפדפן אמיתי: הרבה מקורות (SLAM/HoopsHype/ESPN/Feedspot)
        // מחזירים 403 ל-user-agent של בוט. דפדפן "רגיל" עובר את החסימות האלה.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      // לא לשמור במטמון - אנחנו רוצים מידע טרי כל 5 דקות
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn(`[rss] ${source.id} -> HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const data = parser.parse(xml);

    // תמיכה גם ב-RSS 2.0 (rss.channel.item) וגם ב-Atom (feed.entry)
    const rssItems = asArray(data?.rss?.channel?.item);
    const atomEntries = asArray(data?.feed?.entry);

    const items: RawItem[] = [];

    for (const it of rssItems) {
      const title = stripHtml(String(it?.title ?? ""));
      const link =
        typeof it?.link === "string"
          ? it.link
          : it?.link?.["@_href"] ?? it?.guid?.["#text"] ?? it?.guid ?? "";
      const rawDesc = String(
        it?.["content:encoded"] ?? it?.description ?? "",
      );
      const summary = stripHtml(rawDesc);
      const pub = it?.pubDate ?? it?.["dc:date"] ?? it?.published;
      if (!title || !link) continue;
      items.push({
        title,
        summary,
        link: String(link),
        source: source.name,
        lang: source.lang,
        category: source.category,
        publishedAt: toIso(pub),
        image: extractImage(it, rawDesc),
      });
    }

    for (const e of atomEntries) {
      const title = stripHtml(String(e?.title?.["#text"] ?? e?.title ?? ""));
      const linkRaw = asArray(e?.link).find(
        (l: any) => !l?.["@_rel"] || l?.["@_rel"] === "alternate",
      );
      const link = linkRaw?.["@_href"] ?? e?.id ?? "";
      const rawContent = String(
        e?.content?.["#text"] ?? e?.content ?? e?.summary?.["#text"] ?? e?.summary ?? "",
      );
      const summary = stripHtml(rawContent);
      const pub = e?.updated ?? e?.published;
      if (!title || !link) continue;
      items.push({
        title,
        summary,
        link: String(link),
        source: source.name,
        lang: source.lang,
        category: source.category,
        publishedAt: toIso(pub),
        image: extractImage(e, rawContent),
      });
    }

    return items;
  } catch (err) {
    console.warn(`[rss] ${source.id} failed:`, (err as Error).message);
    return [];
  }
}

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  const t = new Date(String(value)).getTime();
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

/** שאיבת כל המקורות במקביל */
export async function fetchAllSources(sources: Source[]): Promise<RawItem[]> {
  const results = await Promise.all(sources.map(fetchSource));
  return results.flat();
}
