import { NextRequest, NextResponse } from "next/server";
import { getArticles } from "@/lib/store";
import { searchArticles, matchingTags, matchingCategories } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ articles: [], tags: [], categories: [] });
  }

  const all = await getArticles();
  const articles = searchArticles(all, q, 7).map((a) => ({
    id: a.id,
    slug: a.slug,
    headline: a.headline,
    summary: a.summary,
    category: a.category,
    publishedAt: a.publishedAt,
  }));
  const tags = matchingTags(all, q, 5);
  const categories = matchingCategories(q).map((c) => ({
    label: c.label,
    slug: c.slug,
  }));

  return NextResponse.json({ articles, tags, categories });
}
