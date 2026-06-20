// קונפיגורציית האתר - שם, כתובת, תיאור (לשימוש ב-SEO, OG, sitemap, RSS)

export const SITE = {
  name: "SPORTZ",
  nameHe: "ספורטז",
  tagline: "כל מה שקורה עם דני אבדיה והכדורסל הישראלי",
  description:
    "אתר חדשות הספורט בעברית: עדכונים מיידיים על דני אבדיה ופורטלנד בלייזרס, כדורסל ישראלי - מכבי ת\"א, הפועל ת\"א והפועל ירושלים, וכדורגל עולמי. כל 5 דקות.",
  locale: "he_IL",
  twitter: "@sportz",
};

/** כתובת האתר. עדיף להגדיר NEXT_PUBLIC_SITE_URL; אחרת ננחש לפי Vercel. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
