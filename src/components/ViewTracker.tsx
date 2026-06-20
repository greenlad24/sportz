"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/interests";
import type { Category } from "@/lib/types";

/** רושם צפייה בכתבה לפרופיל תחומי העניין (localStorage) - בשביל "בשבילך" */
export function ViewTracker({
  category,
  tags,
}: {
  category: Category;
  tags: string[];
}) {
  useEffect(() => {
    recordView(category, tags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, tags.join(",")]);
  return null;
}
