import { NextRequest, NextResponse } from "next/server";
import { getArticles } from "@/lib/store";
import { visibleArticles } from "@/lib/ranking";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const cats = (sp.get("cats") || "").split(",").filter(Boolean) as Category[];
  const tags = (sp.get("tags") || "").split(",").filter(Boolean);
  const exclude = new Set((sp.get("exclude") || "").split(",").filter(Boolean));

  // רק חדשות טריות (24ש') וידידותיות-למשפחה בהמלצות.
  const all = visibleArticles(await getArticles());
  // משקל קטגוריה לפי מיקום ברשימה (מוקדם = עניין גבוה יותר)
  const catWeight = new Map(cats.map((c, i) => [c, cats.length - i]));
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));

  const ranked = all
    .filter((a) => !exclude.has(a.id))
    .map((a) => {
      let s = (catWeight.get(a.category) || 0) * 2;
      for (const t of a.tags) if (tagSet.has(t.toLowerCase())) s += 3;
      // חשיבות הכתבה (importance) משפיעה גם בהמלצות
      s += a.importance * 0.4;
      const ageH = (Date.now() - new Date(a.publishedAt).getTime()) / 36e5;
      s += Math.max(0, 2 - ageH / 48);
      return { a, s };
    })
    .filter((x) => x.s > 0)
    .sort(
      (x, y) =>
        y.s - x.s ||
        new Date(y.a.publishedAt).getTime() -
          new Date(x.a.publishedAt).getTime(),
    )
    .slice(0, 8)
    .map((x) => x.a);

  return NextResponse.json({ articles: ranked });
}
