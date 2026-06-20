import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runRefresh } from "@/lib/engine";
import { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/lib/types";

// תמיד דינמי, ללא מטמון - זו נקודת ה-cron
export const dynamic = "force-dynamic";
export const maxDuration = 60; // שניות (Vercel)

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

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runRefresh();

    // רענון on-demand: רק אם נוספו כתבות, מרעננים את העמודים והפידים הרלוונטיים.
    // כך העמודים נשארים סטטיים ומהירים ומתעדכנים מיידית כשיש תוכן חדש בפועל.
    if (result.added > 0) {
      revalidatePath("/");
      revalidatePath("/feed.xml");
      revalidatePath("/news-sitemap.xml");
      revalidatePath("/sitemap.xml");
      (Object.keys(result.perCategory) as Category[]).forEach((cat) => {
        if (result.perCategory[cat] > 0) {
          revalidatePath(`/category/${CATEGORIES[cat].slug}`);
        }
      });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[refresh] failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
