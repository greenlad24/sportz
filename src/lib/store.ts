import { promises as fs } from "fs";
import path from "path";
import type { Article, Update } from "./types";
import { SEED_ARTICLES, SEED_UPDATES } from "./seed";

const KEY_ARTICLES = "sportz:articles";
const KEY_LINKS = "sportz:links";
const KEY_UPDATES = "sportz:updates";
const MAX_ARTICLES = 200;
const MAX_LINKS = 4000;
const MAX_UPDATES = 80;
const LINK_TTL_HOURS = 96; // כמה זמן לזכור שמקור כבר עובד (מונע עיבוד חוזר)
const UPDATE_TTL_HOURS = 8; // "עדכוני השעה" - שומרים עדכונים אחרונים בלבד

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useKv = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

// ── אחסון גנרי לפי מפתח: Upstash (Vercel) או קבצים (droplet/פיתוח) ──

async function backendGet<T>(
  kvKey: string,
  file: string,
  fresh: boolean,
): Promise<T | null> {
  if (useKv) {
    const res = await fetch(`${UPSTASH_URL}/get/${kvKey}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      ...(fresh
        ? { cache: "no-store" as const }
        : { next: { revalidate: 300 } }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: string | null };
    if (!data.result) return null;
    try {
      return JSON.parse(data.result) as T;
    } catch {
      return null;
    }
  }
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function backendSet<T>(
  kvKey: string,
  file: string,
  value: T,
): Promise<void> {
  if (useKv) {
    await fetch(`${UPSTASH_URL}/set/${kvKey}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(value),
    });
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(value), "utf8");
}

const DATA_DIR = path.join(process.cwd(), ".data");

// ── כתבות ──────────────────────────────────────────────────────────

async function getArticlesRaw(fresh: boolean): Promise<Article[] | null> {
  return backendGet<Article[]>(KEY_ARTICLES, "articles.json", fresh);
}

/** טוען את כל הכתבות (קריאה ממוטמחת). אם ריק - מחזיר seed לדוגמה. */
export async function getArticles(): Promise<Article[]> {
  const stored = await getArticlesRaw(false);
  const list = stored && stored.length > 0 ? stored : SEED_ARTICLES;
  return [...list].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export async function saveArticles(articles: Article[]): Promise<void> {
  await backendSet(KEY_ARTICLES, "articles.json", articles.slice(0, MAX_ARTICLES));
}

/** ממזג כתבות חדשות עם הקיימות, מסיר כפילויות וחותך לכמות מקסימלית. */
export async function mergeArticles(fresh: Article[]): Promise<Article[]> {
  const existing = (await getArticlesRaw(true)) ?? [];
  const seenUrls = new Set(existing.map((a) => a.sourceUrl));
  const seenIds = new Set(existing.map((a) => a.id));

  const additions = fresh.filter(
    (a) => !seenIds.has(a.id) && !seenUrls.has(a.sourceUrl),
  );

  const merged = [...additions, ...existing]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, MAX_ARTICLES);

  await saveArticles(merged);
  return additions;
}

export async function getArticleBySlug(
  slug: string,
): Promise<Article | undefined> {
  const all = await getArticles();
  return all.find((a) => a.slug === slug || a.id === slug);
}

// ── יומן קישורים שכבר עובדו (לחיסכון: לא שולחים שוב ל-API) ──────────

interface LinkRec {
  l: string; // הקישור
  t: number; // חותמת זמן (ms)
}

/** סט הקישורים שכבר נשלחו ל-API לאחרונה (קריאה טרייה). */
export async function getProcessedLinks(): Promise<Set<string>> {
  const recs = (await backendGet<LinkRec[]>(KEY_LINKS, "links.json", true)) ?? [];
  const cutoff = Date.now() - LINK_TTL_HOURS * 36e5;
  return new Set(recs.filter((r) => r.t >= cutoff).map((r) => r.l));
}

/** מסמן קישורים כ"עובדו" (גם אם לא נכתבה מהם כתבה) כדי לא לבזבז עליהם API שוב. */
export async function addProcessedLinks(links: string[]): Promise<void> {
  if (links.length === 0) return;
  const now = Date.now();
  const cutoff = now - LINK_TTL_HOURS * 36e5;
  const existing =
    (await backendGet<LinkRec[]>(KEY_LINKS, "links.json", true)) ?? [];

  const map = new Map<string, number>();
  for (const r of existing) if (r.t >= cutoff) map.set(r.l, r.t);
  for (const l of links) map.set(l, now);

  const recs: LinkRec[] = [...map.entries()]
    .map(([l, t]) => ({ l, t }))
    .sort((a, b) => b.t - a.t)
    .slice(0, MAX_LINKS);

  await backendSet(KEY_LINKS, "links.json", recs);
}

// ── עדכוני השעה (עובדות גולמיות שעליהן מבוססות הכתבות) ─────────────

/** העדכונים האחרונים (קריאה ממוטמחת לעמודים), ממוינים מהחדש לישן. */
export async function getUpdates(limit = 15): Promise<Update[]> {
  const stored = await backendGet<Update[]>(KEY_UPDATES, "updates.json", false);
  const recs = stored && stored.length > 0 ? stored : SEED_UPDATES;
  const cutoff = Date.now() - UPDATE_TTL_HOURS * 36e5;
  return recs
    .filter((u) => new Date(u.createdAt).getTime() >= cutoff)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}

/** מוסיף עדכונים חדשים, מסיר ישנים (TTL) וחותך לכמות מקסימלית. */
export async function addUpdates(updates: Update[]): Promise<void> {
  if (updates.length === 0) return;
  const cutoff = Date.now() - UPDATE_TTL_HOURS * 36e5;
  const existing =
    (await backendGet<Update[]>(KEY_UPDATES, "updates.json", true)) ?? [];

  const seen = new Set(existing.map((u) => u.id));
  const fresh = updates.filter((u) => !seen.has(u.id));

  const merged = [...fresh, ...existing]
    .filter((u) => new Date(u.createdAt).getTime() >= cutoff)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, MAX_UPDATES);

  await backendSet(KEY_UPDATES, "updates.json", merged);
}

export const storageMode = useKv ? "upstash" : "file";
