import { NextRequest, NextResponse } from "next/server";
import { getArticles, getUpdates, storageMode } from "@/lib/store";
import { mediaConfig } from "@/lib/media";
import { getRunState } from "@/lib/runState";

// בריאות המערכת: מצב הריצה האחרון, ספירת כתבות, וקונפיג המדיה.
// מיועד לניטור (כולל ע"י סוכן) - קריאת HTTP אחת במקום חיטוט בלוגים.
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("key") === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const articles = await getArticles();
  const updates = await getUpdates(100);
  const newestPublished = articles[0]?.publishedAt ?? null;
  const lastCreatedAt = articles.reduce<string | null>((max, a) => {
    return !max || a.createdAt > max ? a.createdAt : max;
  }, null);

  const run = getRunState();

  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    run: {
      isRunning: run.isRunning,
      startedAt: run.startedAt ? new Date(run.startedAt).toISOString() : null,
      lastFinishedAt: run.lastFinishedAt
        ? new Date(run.lastFinishedAt).toISOString()
        : null,
      lastResult: run.lastResult,
      lastError: run.lastError,
      lastErrorAt: run.lastErrorAt
        ? new Date(run.lastErrorAt).toISOString()
        : null,
    },
    store: {
      mode: storageMode,
      articleCount: articles.length,
      newestPublishedAt: newestPublished,
      lastCreatedAt,
      latestHeadline: articles[0]?.headline ?? null,
      recentUpdates: updates.length,
    },
    media: {
      imagesEnabled: mediaConfig.imagesEnabled,
      videoEnabled: mediaConfig.videoEnabled,
    },
  });
}
