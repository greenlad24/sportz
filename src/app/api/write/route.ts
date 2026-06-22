import { NextRequest, NextResponse } from "next/server";
import { writeNext } from "@/lib/engine";
import { beginPhase, endPhase, failPhase, getRunState } from "@/lib/runState";

// שלב הכתיבה: שולף אשכול אחד מהתור וכותב כתבה. מופעל ע"י המתזמן כל ~2 דקות,
// כך שיש זרם כתבות רציף. אפשר לכתוב יותר מאחת בקריאה עם ?n=.
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
  if (getRunState().write.isRunning) {
    return NextResponse.json({ ok: true, started: false, reason: "already running" });
  }
  const n = Math.min(
    10,
    Math.max(1, Number(req.nextUrl.searchParams.get("n") || 1)),
  );
  beginPhase("write");
  writeNext(n)
    .then((result) => {
      console.log("[write] done:", JSON.stringify(result));
      endPhase("write", result);
    })
    .catch((err) => {
      console.error("[write] failed:", err);
      failPhase("write", err);
    });
  return NextResponse.json({ ok: true, started: true });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
