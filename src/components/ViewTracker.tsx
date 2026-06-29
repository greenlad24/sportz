"use client";

import { useEffect } from "react";
import { recordView, recordRead } from "@/lib/interests";
import type { Category } from "@/lib/types";

/**
 * רושם צפייה בכתבה: (1) לפרופיל תחומי העניין (בשביל "המלצות לקריאה"), (2) כ-
 * "נקראה" כדי שלא תופיע שוב בהמלצות. הכל ב-localStorage, פרטי למשתמש.
 */
export function ViewTracker({
  id,
  category,
  tags,
}: {
  id: string;
  category: Category;
  tags: string[];
}) {
  useEffect(() => {
    recordView(category, tags);
    recordRead(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, category, tags.join(",")]);
  return null;
}
