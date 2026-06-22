import { NextRequest, NextResponse } from "next/server";
import { planRefresh } from "@/lib/engine";
import { beginPhase, endPhase, failPhase, getRunState } from "@/lib/runState";

// שלב התכנון: שאיבה -> אשכול -> טקסט מלא -> דה-דופ -> הכנסה לתור.
// מופעל ע"י המתזמן כל ~15 דקות. רץ ברקע ומחזיר תשובה מיד.
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
  if (getRunState().plan.isRunning) {
    return NextResponse.json({ ok: true, started: false, reason: "already running" });
  }
  beginPhase("plan");
  planRefresh()
    .then((result) => {
      console.log("[plan] done:", JSON.stringify(result));
      endPhase("plan", result);
    })
    .catch((err) => {
      console.error("[plan] failed:", err);
      failPhase("plan", err);
    });
  return NextResponse.json({ ok: true, started: true });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
