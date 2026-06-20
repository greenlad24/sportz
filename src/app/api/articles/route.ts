import { NextRequest, NextResponse } from "next/server";
import { getArticles } from "@/lib/store";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const all = await getArticles();
  const cat = req.nextUrl.searchParams.get("category") as Category | null;
  const limit = Number(req.nextUrl.searchParams.get("limit") || 0);

  let list = all;
  if (cat) list = list.filter((a) => a.category === cat);
  if (limit > 0) list = list.slice(0, limit);

  return NextResponse.json({ count: list.length, articles: list });
}
