"use client";

import { useEffect, useState } from "react";
import { timeAgoHe } from "@/lib/time";
import type { Comment } from "@/lib/types";

export function CommentsSection({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?articleId=${encodeURIComponent(articleId)}`)
      .then((r) => r.json())
      .then((j) => setComments(j.comments || []))
      .catch(() => {});
  }, [articleId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 2 || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, name, text }),
      });
      const j = await res.json();
      if (j.comment) {
        setComments((c) => [j.comment, ...c]);
        setText("");
      }
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="comments" className="mt-10">
      <div className="mb-4 flex items-center gap-2.5 border-b border-line pb-2">
        <span className="h-6 w-1.5 rounded bg-brand" />
        <h2 className="text-xl font-extrabold text-ink">
          תגובות{" "}
          <span className="font-normal text-ink-muted">({comments.length})</span>
        </h2>
      </div>

      <form
        onSubmit={submit}
        className="mb-6 rounded-xl border border-line bg-white p-4"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="השם שלך (לא חובה)"
          maxLength={40}
          className="mb-2 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none focus:border-brand"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="הוסיפו תגובה..."
          rows={3}
          maxLength={1000}
          className="w-full resize-y rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none focus:border-brand"
        />
        <div className="mt-2 flex justify-start">
          <button
            type="submit"
            disabled={sending || text.trim().length < 2}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {sending ? "שולח..." : "פרסום תגובה"}
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-paper-soft p-6 text-center text-sm text-ink-muted">
          עדיין אין תגובות. היו הראשונים להגיב!
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-line bg-white p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-bold text-ink">{c.name}</span>
                <time dateTime={c.createdAt} className="text-xs text-ink-muted">
                  {timeAgoHe(c.createdAt)}
                </time>
              </div>
              <p className="whitespace-pre-line text-sm leading-6 text-ink-soft">
                {c.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
