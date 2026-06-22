import { NextRequest, NextResponse } from "next/server";
import { getArticles, getUpdates, getQueue, storageMode } from "@/lib/store";
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
  const queue = await getQueue();
  const newestPublished = articles[0]?.publishedAt ?? null;
  const lastCreatedAt = articles.reduce<string | null>((max, a) => {
    return !max || a.createdAt > max ? a.createdAt : max;
  }, null);

  const run = getRunState();
  const phase = (p: typeof run.plan | typeof run.write) => ({
    isRunning: p.isRunning,
    startedAt: p.startedAt ? new Date(p.startedAt).toISOString() : null,
    lastFinishedAt: p.lastFinishedAt
      ? new Date(p.lastFinishedAt).toISOString()
      : null,
    lastResult: p.lastResult,
    lastError: p.lastError,
    lastErrorAt: p.lastErrorAt ? new Date(p.lastErrorAt).toISOString() : null,
  });

  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    run: { plan: phase(run.plan), write: phase(run.write) },
    queue: { size: queue.length },
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
