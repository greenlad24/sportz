// עזרי-עזר כלליים

/** האש יציב וקצר (FNV-1a) למחרוזת -> מזהה */
export function hashId(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // base36, 7 תווים
  return (h >>> 0).toString(36).padStart(7, "0").slice(0, 9);
}

/** סלאג ידידותי-URL שתומך בעברית (משאיר אותיות עבריות, מחליף רווחים במקפים) */
export function slugify(text: string, id: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/["'’“”.,!?:;()\[\]{}]/g, "")
    .replace(/[\s/\\|]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base || "article"}-${id}`;
}

/** ניקוי HTML/רעש מתקצירים של RSS */
export function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** נורמליזציה של כותרת להשוואת כפילויות */
export function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** דמיון Jaccard על מילים - לזיהוי כתבות כפולות על אותו אירוע */
export function wordSimilarity(a: string, b: string): number {
  const sa = new Set(normalizeForCompare(a).split(" ").filter(Boolean));
  const sb = new Set(normalizeForCompare(b).split(" ").filter(Boolean));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / (sa.size + sb.size - inter);
}
