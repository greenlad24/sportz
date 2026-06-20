import Link from "next/link";
import type { Metadata } from "next";
import { getArticles } from "@/lib/store";
import {
  searchArticles,
  matchingTags,
  matchingCategories,
} from "@/lib/search";
import { ArticleCard } from "@/components/ArticleCard";

export const dynamic = "force-dynamic";

export function generateMetadata({
  searchParams,
}: {
  searchParams: { q?: string };
}): Metadata {
  const q = (searchParams.q || "").toString().trim();
  return {
    title: q ? `חיפוש: ${q}` : "חיפוש",
    // עמודי תוצאות חיפוש אינם מאונדקסים (תוכן דק/כפול)
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q || "").toString().trim();
  const all = await getArticles();
  const results = q ? searchArticles(all, q, 60) : [];
  const tags = q ? matchingTags(all, q) : [];
  const cats = q ? matchingCategories(q) : [];

  return (
    <div className="mx-auto max-w-site px-4 py-6">
      <form action="/search" className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="חיפוש כתבות, נושאים, תגיות..."
          className="w-full rounded-lg border border-line px-4 py-2.5 text-ink outline-none focus:border-brand"
        />
        <button className="rounded-lg bg-brand px-5 py-2.5 font-bold text-white hover:bg-brand-dark">
          חיפוש
        </button>
      </form>

      {q && (
        <h1 className="mb-4 text-xl font-extrabold text-ink">
          תוצאות חיפוש עבור &quot;{q}&quot;{" "}
          <span className="font-normal text-ink-muted">
            ({results.length})
          </span>
        </h1>
      )}

      {(tags.length > 0 || cats.length > 0) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {cats.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className={`rounded px-2.5 py-1 text-xs font-bold ${c.accent}`}
            >
              {c.label}
            </Link>
          ))}
          {tags.map((t) => (
            <Link
              key={t}
              href={`/search?q=${encodeURIComponent(t)}`}
              className="rounded-full bg-paper-soft px-3 py-1 text-xs font-medium text-ink-soft hover:text-brand"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      {q && results.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-ink-muted">
          לא נמצאו תוצאות עבור &quot;{q}&quot;. נסו מילות חיפוש אחרות.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
