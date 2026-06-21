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

// Brave של התוכנית החינמית מוגבל ל-~בקשה אחת לשנייה. הכתבות מועשרות במקביל,
// ולכן בלי וִיסות רוב הקריאות מקבלות 429 ורוב הכתבות נשארות בלי תמונה. התור
// הזה מסדר את כל קריאות Brave בטור עם מרווח מינימלי ביניהן.
const BRAVE_MIN_INTERVAL_MS = 1200;
let braveQueue: Promise<unknown> = Promise.resolve();
let braveNextAt = 0;

function braveThrottle<T>(fn: () => Promise<T>): Promise<T> {
  const result = braveQueue.then(async () => {
    const wait = braveNextAt - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    braveNextAt = Date.now() + BRAVE_MIN_INTERVAL_MS;
    return fn();
  });
  // השרשרת ממשיכה גם אם קריאה נכשלה (כדי לא לחסום את הבאות)
  braveQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function braveImageSearch(
  query: string,
  freshness?: string,
): Promise<FoundImage | null> {
  const params = new URLSearchParams({
    q: query,
    country: "us",
    search_lang: "en",
    count: "15",
    safesearch: "strict",
  });
  if (freshness) params.set("freshness", freshness);

  const res = await fetch(
    `https://api.search.brave.com/res/v1/images/search?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_KEY as string,
      },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (res.status === 429) {
    console.warn("[media] brave image -> 429 (rate limited)");
    return null;
  }
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
}

/**
 * חיפוש תמונה רלוונטית דרך Brave Image Search, מוטה לאתרי ארה"ב.
 * מנסה קודם תמונה מהשבוע האחרון; אם אין - מרחיב לכל זמן (עדיף תמונה רלוונטית
 * מעט ישנה מאשר כתבה בלי תמונה). כל הקריאות עוברות דרך וִיסות (1/שנייה).
 */
export async function findImage(query: string): Promise<FoundImage | null> {
  if (!BRAVE_KEY || !query.trim()) return null;
  try {
    const recent = await braveThrottle(() => braveImageSearch(query, "pw"));
    if (recent) return recent;
    return await braveThrottle(() => braveImageSearch(query));
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
