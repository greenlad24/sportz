"use client";

import { useEffect, useState } from "react";
import { ArticleCard } from "./ArticleCard";
import { topInterests } from "@/lib/interests";
import type { Article } from "@/lib/types";

/** "בשבילך" - המלצות מותאמות לפי תחומי העניין שנשמרו ב-localStorage */
export function ForYou({ excludeId }: { excludeId?: string }) {
  const [items, setItems] = useState<Article[] | null>(null);

  useEffect(() => {
    const { cats, tags } = topInterests();
    if (cats.length === 0 && tags.length === 0) {
      setItems([]);
      return;
    }
    const params = new URLSearchParams();
    if (cats.length) params.set("cats", cats.join(","));
    if (tags.length) params.set("tags", tags.join(","));
    if (excludeId) params.set("exclude", excludeId);

    fetch(`/api/foryou?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => setItems(j.articles || []))
      .catch(() => setItems([]));
  }, [excludeId]);

  // עד שיש תחומי עניין (או בזמן טעינה) - לא מציגים כלום
  if (!items || items.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center gap-2.5 border-b border-line pb-2">
        <span className="h-6 w-1.5 rounded bg-brand" />
        <h2 className="text-xl font-extrabold text-ink">המלצות לקריאה</h2>
        <span className="text-xs font-normal text-ink-muted">
          מותאם לפי מה שקראתם
        </span>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {items.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </section>
  );
}
