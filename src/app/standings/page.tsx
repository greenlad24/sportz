import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_ORDER, CATEGORIES } from "@/lib/categories";
import { CATEGORY_LEAGUES, LEAGUES } from "@/lib/standings";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "טבלאות ומעברים",
  description: "טבלאות ליגה חיות, דירוג ומעברים אחרונים - לכל קטגוריה.",
  alternates: { canonical: "/standings" },
  openGraph: { title: `טבלאות ומעברים | ${SITE.name}`, type: "website" },
};

export default function StandingsIndex() {
  return (
    <div className="mx-auto max-w-site px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-extrabold text-ink">טבלאות ומעברים</h1>
        <p className="mt-2 text-sm text-ink-muted">
          טבלת ליגה חיה, דירוג ויזואלי ומעברים אחרונים - לכל קטגוריה.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CATEGORY_ORDER.map((cat) => {
          const c = CATEGORIES[cat];
          const leagues = (CATEGORY_LEAGUES[cat] ?? [])
            .map((k) => LEAGUES[k]?.label)
            .filter(Boolean)
            .join(" · ");
          return (
            <Link
              key={cat}
              href={`/standings/${c.slug}`}
              className="group rounded-xl border border-line bg-paper p-4 transition hover:border-brand"
            >
              <span
                className={`inline-block rounded px-2.5 py-1 text-sm font-bold ${c.accent}`}
              >
                {c.label}
              </span>
              {leagues && (
                <p className="mt-2 text-sm text-ink-soft group-hover:text-brand">
                  {leagues}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
