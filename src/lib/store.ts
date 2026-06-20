import { promises as fs } from "fs";
import path from "path";
import type { Article } from "./types";
import { SEED_ARTICLES } from "./seed";

const KEY = "sportz:articles";
const MAX_ARTICLES = 200;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useKv = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

// ── Upstash Redis (REST) - מתאים ל-Vercel serverless ──────────────
// fresh=false: קריאה ממוטמחת (revalidate 60ש') - לעמודים שמוגשים מהר וידידותיים ל-Google.
// fresh=true: קריאה טרייה לחלוטין - למנוע הניוז כדי שזיהוי הכפילויות יהיה מדויק.
async function kvGet(fresh = false): Promise<Article[] | null> {
  const res = await fetch(`${UPSTASH_URL}/get/${KEY}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    ...(fresh
      ? { cache: "no-store" as const }
      : { next: { revalidate: 300 } }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result: string | null };
  if (!data.result) return null;
  try {
    return JSON.parse(data.result) as Article[];
  } catch {
    return null;
  }
}

async function kvSet(articles: Article[]): Promise<void> {
  await fetch(`${UPSTASH_URL}/set/${KEY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(articles),
  });
}

// ── אחסון קבצים מקומי (פיתוח) ─────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "articles.json");

async function fileGet(): Promise<Article[] | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as Article[];
  } catch {
    return null;
  }
}

async function fileSet(articles: Article[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(articles, null, 2), "utf8");
}

// ── API ציבורי ────────────────────────────────────────────────────

/** טוען את כל הכתבות. אם האחסון ריק, מחזיר נתוני seed לדוגמה. */
export async function getArticles(): Promise<Article[]> {
  const stored = useKv ? await kvGet() : await fileGet();
  const list = stored && stored.length > 0 ? stored : SEED_ARTICLES;
  return [...list].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export async function saveArticles(articles: Article[]): Promise<void> {
  const trimmed = articles.slice(0, MAX_ARTICLES);
  if (useKv) await kvSet(trimmed);
  else await fileSet(trimmed);
}

/** ממזג כתבות חדשות עם הקיימות, מסיר כפילויות וחותך לכמות מקסימלית. */
export async function mergeArticles(fresh: Article[]): Promise<Article[]> {
  const existing = (useKv ? await kvGet(true) : await fileGet()) ?? [];
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

export const storageMode = useKv ? "upstash" : "file";
