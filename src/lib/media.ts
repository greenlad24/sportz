// איתור מדיה לכתבות: תמונה (Brave Image Search) ווידאו (YouTube Data API).
// שתי היכולות אופציונליות - אם אין מפתח ENV, מחזירים null והכתבה ממשיכה בלי מדיה.

export interface FoundImage {
  url: string; // כתובת התמונה
  source: string; // שם הדומיין (לקרדיט)
  link: string; // קישור לעמוד המקור (לקרדיט)
}

const BRAVE_KEY = process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_KEY;
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;

/** דומיין ישראלי? (לפי בקשת המשתמש - לא לשאוב תמונות מאתרים ישראליים) */
function isIsraeliHost(host: string): boolean {
  const h = host.toLowerCase();
  return h.endsWith(".il") || h.includes(".co.il") || h.includes(".org.il");
}

/**
 * חיפוש תמונה רלוונטית דרך Brave Image Search, מוטה לאתרי ארה"ב.
 * מחזיר את התוצאה הראשונה שאינה מאתר ישראלי.
 */
export async function findImage(query: string): Promise<FoundImage | null> {
  if (!BRAVE_KEY || !query.trim()) return null;
  try {
    const url =
      "https://api.search.brave.com/res/v1/images/search?" +
      new URLSearchParams({
        q: query,
        country: "us",
        search_lang: "en",
        count: "15",
        safesearch: "strict",
        freshness: "pw", // השבוע האחרון - תמונה עדכנית לסיפור
      }).toString();

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_KEY,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn(`[media] brave image -> HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      results?: Array<{
        url?: string;
        source?: string;
        properties?: { url?: string };
        thumbnail?: { src?: string };
        meta_url?: { hostname?: string };
      }>;
    };

    for (const r of data.results ?? []) {
      const imageUrl = r.properties?.url || r.thumbnail?.src;
      const host = r.meta_url?.hostname || r.source || "";
      if (!imageUrl || !host) continue;
      if (isIsraeliHost(host)) continue; // אתרי ארה"ב בלבד
      return {
        url: imageUrl,
        source: host.replace(/^www\./, ""),
        link: r.url || imageUrl,
      };
    }
    return null;
  } catch (err) {
    console.warn(`[media] findImage failed: ${(err as Error).message}`);
    return null;
  }
}

/**
 * חיפוש סרטון YouTube רלוונטי. מחזיר videoId להטמעה, או null.
 */
export async function findVideo(query: string): Promise<string | null> {
  if (!YOUTUBE_KEY || !query.trim()) return null;
  try {
    const url =
      "https://www.googleapis.com/youtube/v3/search?" +
      new URLSearchParams({
        key: YOUTUBE_KEY,
        q: query,
        part: "snippet",
        type: "video",
        maxResults: "1",
        videoEmbeddable: "true",
        relevanceLanguage: "en",
        regionCode: "US",
        safeSearch: "strict",
      }).toString();

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`[media] youtube -> HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      items?: Array<{ id?: { videoId?: string } }>;
    };
    return data.items?.[0]?.id?.videoId ?? null;
  } catch (err) {
    console.warn(`[media] findVideo failed: ${(err as Error).message}`);
    return null;
  }
}

export const mediaConfig = {
  imagesEnabled: Boolean(BRAVE_KEY),
  videoEnabled: Boolean(YOUTUBE_KEY),
};
