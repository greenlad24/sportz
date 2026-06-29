import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getArticles } from "@/lib/store";
import { categoryBySlug } from "@/lib/categories";
import { ArticleCard } from "@/components/ArticleCard";
import { rankArticles, visibleArticles } from "@/lib/ranking";
import { SITE } from "@/lib/site";

// דינמי: מרונדר מהאחסון החי בכל בקשה, כך שכתבות חדשות מופיעות מיד.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const c = categoryBySlug(params.slug);
  if (!c) return {};
  const title = `${c.label} - חדשות`;
  return {
    title,
    description: c.description,
    alternates: { canonical: `/category/${c.slug}` },
    openGraph: {
      title: `${title} | ${SITE.name}`,
      description: c.description,
      url: `/category/${c.slug}`,
      type: "website",
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const c = categoryBySlug(params.slug);
  if (!c) notFound();

  const all = await getArticles();
  // טריות (24ש') + ידידותי-למשפחה + דירוג לפי שעה ואז חשיבות - לא לפי סדר כניסה.
  const items = rankArticles(
    visibleArticles(all).filter((a) => a.category === c.category),
  );

  return (
    <div className="mx-auto max-w-site px-4 py-6">
      <header className="mb-6">
        <span
          className={`inline-block rounded px-2.5 py-1 text-sm font-bold ${c.accent}`}
        >
          {c.label}
        </span>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
          {c.description}
        </p>
        <Link
          href={`/standings/${c.slug}`}
          className="mt-3 inline-block text-sm font-bold text-brand hover:underline"
        >
          טבלת ליגה ומעברים ←
        </Link>
      </header>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-ink-muted">
          אין כרגע כתבות טריות בקטגוריה זו. המנוע מתעדכן כל הזמן - חזרו בקרוב.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
