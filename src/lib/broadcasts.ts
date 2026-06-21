// לוח שידורים: שאיבה ופירוק של לוח שידורי הספורט מאתר ערוץ הספורט (ספורט 5).
// המקור מגיש טבלת HTML מרונדרת-שרת לכל תאריך (?date=DD/MM/YYYY): שורת כותרת
// לכל ערוץ, ואז שורות אירוע עם שעה (שעון ישראל) וטקסט. נשאב best-effort עם
// שער רעננות (לא קוראים לרשת בכל מחזור), נשמר ב-store ומוצג ב-/schedule.

import type { Broadcast, BroadcastDay, BroadcastStore } from "./types";
import { stripHtml } from "./utils";
import { getBroadcasts, saveBroadcasts } from "./store";

const TZ = "Asia/Jerusalem";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const ENDPOINT = "https://www.sport5.co.il/Ajax/GetBroadcastSheetData.aspx";
const REFERER = "https://www.sport5.co.il/html/pages/broadcastsheet.html";

const DAYS_AHEAD = 6; // היום + 6 הימים הבאים
const REFRESH_TTL_MS = 30 * 60 * 1000; // לא שואבים שוב אם הנתונים טריים מ-30 דק'
export const SOURCE_NAME = "ערוץ הספורט";

/** תיאור יום בשעון ישראל, offset ימים מהיום (יציב מול שעון קיץ - עוגן צהריים). */
function israelDay(offsetDays: number): { dmy: string; key: string; dayLabel: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const anchor = new Date(
    Date.UTC(g("year"), g("month") - 1, g("day"), 12) + offsetDays * 864e5,
  );
  const dmy = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(anchor); // DD/MM/YYYY
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(anchor); // YYYY-MM-DD
  const dayLabel = new Intl.DateTimeFormat("he-IL", {
    timeZone: TZ,
    weekday: "long",
  }).format(anchor); // "יום ראשון"
  return { dmy, key, dayLabel };
}

/** פירוק טבלת ה-HTML של ערוץ הספורט לרשימת שידורים (ערוץ + שעה + אירוע). */
export function parseSheet(html: string): Broadcast[] {
  const out: Broadcast[] = [];
  let channel = "";
  // הטבלה בנויה משורות <tr>: שורת כותרת ערוץ (tr-header, עם <img alt="שם הערוץ">)
  // ואז שורות אירוע (עם td class="text" ו-td class="date" שמכיל שעה).
  const rows = html.split(/<tr\b/i).slice(1);
  for (const tr of rows) {
    if (/tr-header/i.test(tr)) {
      const alt = tr.match(/alt="([^"]+)"/i);
      if (alt) channel = stripHtml(alt[1]).trim();
      continue;
    }
    const textCell = tr.match(/class="text"[^>]*>([\s\S]*?)<\/td>/i);
    if (!textCell) continue;
    const event = stripHtml(textCell[1]).trim();
    const timeMatch = tr.match(/\b([0-2]?\d:[0-5]\d)\b/);
    const time = timeMatch ? timeMatch[1] : "";
    if (!event || !time) continue;
    const isLive = /img-live\.png|>\s*ישיר\s*</i.test(tr);
    out.push({ channel: channel || SOURCE_NAME, time, event, isLive });
  }
  return out;
}

async function fetchDay(dmy: string): Promise<Broadcast[]> {
  const res = await fetch(`${ENDPOINT}?date=${encodeURIComponent(dmy)}`, {
    headers: {
      "User-Agent": UA,
      "X-Requested-With": "XMLHttpRequest",
      Referer: REFERER,
      "Accept-Language": "he-IL,he;q=0.9",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const html = await res.text();
  return parseSheet(html);
}

/**
 * מרענן את לוח השידורים מהמקור (best-effort, עם שער רעננות). מחזיר את הלוח
 * השמור/המעודכן. לעולם לא זורק - כישלון רשת מחזיר את הלוח הקיים (או null).
 */
export async function refreshBroadcasts(force = false): Promise<BroadcastStore | null> {
  const existing = await getBroadcasts();
  if (
    !force &&
    existing &&
    Date.now() - new Date(existing.fetchedAt).getTime() < REFRESH_TTL_MS
  ) {
    return existing; // טרי דיו - לא קוראים שוב לרשת
  }

  try {
    const days: BroadcastDay[] = [];
    for (let off = 0; off <= DAYS_AHEAD; off++) {
      const { dmy, key, dayLabel } = israelDay(off);
      const items = await fetchDay(dmy);
      // שומרים את היום הנוכחי תמיד; ימים עתידיים רק אם יש בהם שידורים.
      if (items.length > 0 || off === 0) {
        days.push({ date: key, dmy, dayLabel, items });
      }
    }
    const totalItems = days.reduce((n, d) => n + d.items.length, 0);
    // אם לא נשאב כלום (חסימה/שינוי מבנה) - לא דורסים נתונים קיימים טובים.
    if (totalItems === 0 && existing) return existing;
    const store: BroadcastStore = { fetchedAt: new Date().toISOString(), days };
    await saveBroadcasts(store);
    console.log(`[broadcasts] refreshed: ${totalItems} items across ${days.length} days`);
    return store;
  } catch (err) {
    console.warn(`[broadcasts] refresh failed: ${(err as Error).message}`);
    return existing;
  }
}
