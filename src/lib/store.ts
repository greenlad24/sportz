import { promises as fs } from "fs";
import path from "path";
import type {
  Article,
  Update,
  Comment,
  BroadcastStore,
  QueuedGroup,
} from "./types";
import { SEED_ARTICLES, SEED_UPDATES } from "./seed";

const KEY_ARTICLES = "sportz:articles";
const KEY_LINKS = "sportz:links";
const KEY_UPDATES = "sportz:updates";
const KEY_COMMENTS = "sportz:comments";
const KEY_BROADCASTS = "sportz:broadcasts";
const KEY_QUEUE = "sportz:queue";
const KEY_STANDINGS = "sportz:standings";
const MAX_ARTICLES = 200;
const MAX_LINKS = 4000;
const MAX_UPDATES = 80;
const MAX_QUEUE = 200;
const LINK_TTL_HOURS = 96; // כמה זמן לזכור שמקור כבר עובד (מונע עיבוד חוזר)
const UPDATE_TTL_HOURS = 8; // "עדכוני השעה" - שומרים עדכונים אחרונים בלבד
const QUEUE_TTL_HOURS = Number(process.env.QUEUE_TTL_HOURS || 6); // אשכול ישן בתור = חדשות מעופשות, נזרק

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

/**
 * מעדכן כתבה קיימת *במקום* (לפי id) - לסיפור מתפתח שגדל. שומר על אותו id/slug
 * כדי שה-URL והקישורים הפנימיים יישארו תקפים. אם הכתבה כבר אינה קיימת (נחתכה),
 * מחזיר false והקורא ייצור כתבה חדשה במקום. קריאה/כתיבה טרייה.
 */
export async function updateArticle(updated: Article): Promise<boolean> {
  const existing = (await getArticlesRaw(true)) ?? [];
  const idx = existing.findIndex((a) => a.id === updated.id);
  if (idx === -1) return false;
  existing[idx] = updated;
  const merged = [...existing].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  await saveArticles(merged);
  return true;
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  const all = (await getArticlesRaw(true)) ?? [];
  return all.find((a) => a.id === id);
}

export async function getArticleBySlug(
  slug: string,
): Promise<Article | undefined> {
  // סלאגים מכילים עברית; פרמטרי הניתוב של Next מגיעים מקודדי-URL (%D7..),
  // לכן מפענחים לפני ההשוואה כדי שההתאמה תצליח.
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // נשארים עם הערך המקורי אם הפענוח נכשל
  }
  const all = await getArticles();
  return all.find(
    (a) =>
      a.slug === decoded ||
      a.id === decoded ||
      a.slug === slug ||
      a.id === slug,
  );
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

// ── תגובות (משותפות, נשמרות בשרת) ─────────────────────────────────

type CommentMap = Record<string, Comment[]>;

export async function getComments(articleId: string): Promise<Comment[]> {
  const map =
    (await backendGet<CommentMap>(KEY_COMMENTS, "comments.json", true)) ?? {};
  return [...(map[articleId] ?? [])].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getCommentCount(articleId: string): Promise<number> {
  const map =
    (await backendGet<CommentMap>(KEY_COMMENTS, "comments.json", false)) ?? {};
  return (map[articleId] ?? []).length;
}

export async function addComment(comment: Comment): Promise<void> {
  const map =
    (await backendGet<CommentMap>(KEY_COMMENTS, "comments.json", true)) ?? {};
  const list = map[comment.articleId] ?? [];
  list.unshift(comment);
  map[comment.articleId] = list.slice(0, 300);
  await backendSet(KEY_COMMENTS, "comments.json", map);
}

// ── טבלאות ליגה (נשאבות מ-ESPN, מתעדכנות בכניסה לעמוד ונשמרות) ─────
// העדכון "עצל": כשנכנסים לעמוד הטבלאות, אם הנתון ישן מ-TTL הוא נשאב מחדש
// ונשמר; אחרת מוחזר הנתון השמור. אין רענון רקע - רק בכניסה לעמוד (לפי הבקשה).

import type { LeagueStandings } from "./standings";

type StandingsMap = Record<string, LeagueStandings>;

/** כל הטבלאות השמורות (לפי מפתח ליגה). */
export async function getStandingsStore(): Promise<StandingsMap> {
  return (
    (await backendGet<StandingsMap>(KEY_STANDINGS, "standings.json", true)) ?? {}
  );
}

/** שומר/מעדכן טבלה אחת (לפי מפתח ליגה) ומחזיר את המפה המעודכנת. */
export async function saveStanding(
  key: string,
  value: LeagueStandings,
): Promise<void> {
  const map = await getStandingsStore();
  map[key] = value;
  await backendSet(KEY_STANDINGS, "standings.json", map);
}

// ── לוח שידורים (נשאב מערוץ הספורט, מרוענן מעת לעת) ────────────────

/** לוח השידורים השמור (יום + ערוצים + שעות), או null אם טרם נשאב. */
export async function getBroadcasts(): Promise<BroadcastStore | null> {
  return backendGet<BroadcastStore>(KEY_BROADCASTS, "broadcasts.json", false);
}

export async function saveBroadcasts(store: BroadcastStore): Promise<void> {
  await backendSet(KEY_BROADCASTS, "broadcasts.json", store);
}

// ── תור אשכולות ממתינים (planRefresh דוחף, writeNext שולף) ─────────
// שלב התכנון בונה אשכולות (סיפור + מקורות-משנה, עם טקסט מלא) ודוחף לתור;
// שלב הכתיבה שולף אחד כל ~2 דקות וכותב כתבה. כך יש זרם כתבות רציף.

// מנעול תוך-תהליכי: plan ו-write עשויים לגעת בתור במקביל. שרשור הבטחות
// מבטיח read-modify-write אטומי על queue.json (תהליך Node יחיד בדרופלט).
let queueLock: Promise<void> = Promise.resolve();
async function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = queueLock;
  let release!: () => void;
  queueLock = new Promise<void>((r) => (release = r));
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

function freshGroups(list: QueuedGroup[]): QueuedGroup[] {
  const cutoff = Date.now() - QUEUE_TTL_HOURS * 36e5;
  return list.filter((g) => new Date(g.enqueuedAt).getTime() >= cutoff);
}

/** מצב התור (קריאה טרייה) - אשכולות לא-מעופשים בלבד. */
export async function getQueue(): Promise<QueuedGroup[]> {
  const list = (await backendGet<QueuedGroup[]>(KEY_QUEUE, "queue.json", true)) ?? [];
  return freshGroups(list);
}

/**
 * מוסיף אשכולות לתור. מדלג על כפילויות לפי id ולפי חתימת-נושא (sig) זהה
 * שכבר קיימת בתור (אותה קטגוריה). מנקה מעופשים וחותך לתקרה. מחזיר כמה נוספו.
 */
export async function enqueueGroups(groups: QueuedGroup[]): Promise<number> {
  if (groups.length === 0) return 0;
  return withQueueLock(async () => {
    const existing = freshGroups(
      (await backendGet<QueuedGroup[]>(KEY_QUEUE, "queue.json", true)) ?? [],
    );
    const ids = new Set(existing.map((g) => g.id));
    const sigs = new Set(existing.map((g) => `${g.category}|${g.sig}`));
    let added = 0;
    for (const g of groups) {
      if (ids.has(g.id)) continue;
      if (sigs.has(`${g.category}|${g.sig}`)) continue;
      existing.push(g);
      ids.add(g.id);
      sigs.add(`${g.category}|${g.sig}`);
      added++;
    }
    const trimmed = existing
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_QUEUE);
    await backendSet(KEY_QUEUE, "queue.json", trimmed);
    return added;
  });
}

/** שולף אשכול אחד לכתיבה (העדיפות הגבוהה ביותר) ומסיר אותו מהתור. */
export async function popGroup(): Promise<QueuedGroup | null> {
  return withQueueLock(async () => {
    const list = freshGroups(
      (await backendGet<QueuedGroup[]>(KEY_QUEUE, "queue.json", true)) ?? [],
    );
    if (list.length === 0) {
      await backendSet(KEY_QUEUE, "queue.json", []);
      return null;
    }
    list.sort((a, b) => b.score - a.score);
    const next = list.shift()!;
    await backendSet(KEY_QUEUE, "queue.json", list);
    return next;
  });
}

export const storageMode = useKv ? "upstash" : "file";
