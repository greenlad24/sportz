import { NextRequest, NextResponse } from "next/server";
import { getComments, addComment } from "@/lib/store";
import type { Comment } from "@/lib/types";
import { hashId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const articleId = req.nextUrl.searchParams.get("articleId") || "";
  if (!articleId) return NextResponse.json({ comments: [] });
  const comments = await getComments(articleId);
  return NextResponse.json({ comments, count: comments.length });
}

function clean(s: unknown, max: number): string {
  return String(s ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export async function POST(req: NextRequest) {
  let body: { articleId?: string; name?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const articleId = clean(body.articleId, 40);
  const name = clean(body.name, 40) || "אנונימי";
  // הטקסט יכול לכלול שורות חדשות - מנקים תגיות בלבד
  const text = String(body.text ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 1000);

  if (!articleId || text.length < 2) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const comment: Comment = {
    id: hashId(articleId + name + text + Date.now() + Math.random()),
    articleId,
    name,
    text,
    createdAt: new Date().toISOString(),
  };

  await addComment(comment);
  return NextResponse.json({ comment });
}
