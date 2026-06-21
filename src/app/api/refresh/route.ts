import { NextRequest, NextResponse } from "next/server";
import { runRefresh } from "@/lib/engine";

// תמיד דינמי, ללא מטמון - זו נקודת ה-cron
export const dynamic = "force-dynamic";
export const maxDuration = 60; // רלוונטי ל-Vercel בלבד; בדרופלט מתעלמים ממנו

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // אם לא הוגדר סוד - לאפשר (נוח לפיתוח). בפרודקשן הגדר CRON_SECRET.
  if (!secret) return true;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  // Vercel Cron שולח את הסוד גם כ-header ייעודי; כגיבוי תומכים ב-?key=
  const key = req.nextUrl.searchParams.get("key");
  return key === secret;
}

// נעילה פשוטה בזיכרון התהליך כדי שלא ירוצו שתי ריצות במקביל.
let isRunning = false;

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (isRunning) {
    return NextResponse.json({ ok: true, started: false, reason: "already running" });
  }

  isRunning = true;
  // הרצה ברקע: מחזירים תשובה מיד (פחות משנייה) והכתבות נכתבות אחר כך.
  // מתאים לדרופלט (תהליך Node מתמשך שלא "קופא" אחרי התשובה). העמודים דינמיים,
  // ולכן אין צורך ב-revalidate - כתבות חדשות מופיעות מיד כשהן נשמרות.
  runRefresh()
    .then((result) => {
      console.log("[refresh] done:", JSON.stringify(result));
    })
    .catch((err) => {
      console.error("[refresh] failed:", err);
    })
    .finally(() => {
      isRunning = false;
    });

  return NextResponse.json({ ok: true, started: true });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
