import { NextRequest, NextResponse } from "next/server";
import { planRefresh, writeNext } from "@/lib/engine";
import { beginPhase, endPhase, failPhase, getRunState } from "@/lib/runState";

// ריצה ידנית מלאה (גיבוי/בדיקה): תכנון ואז ניקוז כל התור בקריאה אחת.
// בפרודקשן המתזמן משתמש ב-/api/plan (כל 15 דק') ו-/api/write (כל 2 דק').
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("key") === secret;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const run = getRunState();
  if (run.plan.isRunning || run.write.isRunning) {
    return NextResponse.json({ ok: true, started: false, reason: "already running" });
  }

  // רץ ברקע: תכנון -> כתיבת כל מה שנכנס לתור.
  (async () => {
    beginPhase("plan");
    let plan;
    try {
      plan = await planRefresh();
      console.log("[refresh:plan] done:", JSON.stringify(plan));
      endPhase("plan", plan);
    } catch (err) {
      console.error("[refresh:plan] failed:", err);
      failPhase("plan", err);
      return;
    }
    beginPhase("write");
    try {
      const write = await writeNext(plan.enqueued + 5);
      console.log("[refresh:write] done:", JSON.stringify(write));
      endPhase("write", write);
    } catch (err) {
      console.error("[refresh:write] failed:", err);
      failPhase("write", err);
    }
  })();

  return NextResponse.json({ ok: true, started: true });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
