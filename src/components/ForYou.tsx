"use client";

import { useEffect, useState } from "react";
import { RecommendedSlider } from "./RecommendedSlider";
import { topInterests, getReadIds, dailyShuffle } from "@/lib/interests";
import type { Article } from "@/lib/types";

const SHOW = 8;

/**
 * "המלצות לקריאה". שני כללים לפי בקשת המשתמש:
 *  1. *מתחלפות כל 24 שעות* - ערבוב דטרמיניסטי לפי היום (dailyShuffle).
 *  2. *לא מציגות כתבה שכבר נכנסו אליה* - מסננים את ה-IDs שנקראו (localStorage).
 * בנוסף, אם יש פרופיל עניין - מביאים רשימה מותאמת מהשרת (גם היא מסוננת/מעורבבת).
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
    const read = getReadIds();
    // סינון נקראו + הסיפור הראשי, ואז ערבוב יומי וחיתוך למספר המוצג.
    const refine = (pool: Article[]) =>
      dailyShuffle(
        pool.filter((a) => a.id !== excludeId && !read.has(a.id)),
      ).slice(0, SHOW);

    // התחלה: ברירת המחדל מהשרת, כבר מסוננת ומעורבבת ליום.
    setItems(refine(fallback));

    const { cats, tags } = topInterests();
    const params = new URLSearchParams();
    if (cats.length) params.set("cats", cats.join(","));
    if (tags.length) params.set("tags", tags.join(","));
    const exclude = [excludeId, ...read].filter(Boolean) as string[];
    if (exclude.length) params.set("exclude", exclude.join(","));

    // מביאים מאגר רחב מהשרת (כבר ללא הנקראו), ומעדנים אותו באותו אופן.
    fetch(`/api/foryou?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.articles) && j.articles.length > 0) {
          setItems(refine(j.articles));
          setPersonalized(cats.length > 0 || tags.length > 0);
        }
      })
      .catch(() => {});
  }, [excludeId, fallback]);

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
