"use client";

import { useEffect, useState } from "react";
import { RecommendedSlider } from "./RecommendedSlider";
import { topInterests } from "@/lib/interests";
import type { Article } from "@/lib/types";

/**
 * "המלצות לקריאה" - מותאם לפי תחומי העניין שנשמרו ב-localStorage.
 * לפני שיש היסטוריית קריאה מציגים ברירת מחדל (fallback) מהשרת,
 * כדי שהמקטע יופיע תמיד מתחת לסיפור הראשי.
 */
export function ForYou({
  fallback,
  excludeId,
}: {
  fallback: Article[];
  excludeId?: string;
}) {
  const [items, setItems] = useState<Article[]>(fallback);
  const [personalized, setPersonalized] = useState(false);

  useEffect(() => {
    const { cats, tags } = topInterests();
    if (cats.length === 0 && tags.length === 0) return; // נשארים עם ברירת המחדל
    const params = new URLSearchParams();
    if (cats.length) params.set("cats", cats.join(","));
    if (tags.length) params.set("tags", tags.join(","));
    if (excludeId) params.set("exclude", excludeId);

    fetch(`/api/foryou?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.articles) && j.articles.length > 0) {
          setItems(j.articles);
          setPersonalized(true);
        }
      })
      .catch(() => {});
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2 border-b border-line pb-1.5">
        <span className="h-4 w-1 rounded bg-brand" />
        <h2 className="text-base font-extrabold text-ink">המלצות לקריאה</h2>
        {personalized && (
          <span className="text-xs font-normal text-ink-muted">
            מותאם לפי מה שקראתם
          </span>
        )}
      </div>
      <RecommendedSlider items={items} />
    </section>
  );
}
