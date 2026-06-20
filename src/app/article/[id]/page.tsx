import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleBySlug, getArticles } from "@/lib/store";
import { CATEGORIES } from "@/lib/categories";
import { CategoryChip } from "@/components/CategoryChip";
import { ArticleImage } from "@/components/ArticleImage";
import { ArticleCard } from "@/components/ArticleCard";
import { formatDateHe } from "@/lib/time";
import { SITE, absoluteUrl } from "@/lib/site";

// כתבה היא בלתי-משתנה לאחר פרסום - מטמון ארוך (נוצרת on-demand בבקשה הראשונה)
export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const article = await getArticleBySlug(params.id);
  if (!article) return {};
  const url = `/article/${article.slug}`;
  return {
    title: article.headline,
    description: article.summary,
    keywords: article.tags,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: article.headline,
      description: article.summary,
      url,
      publishedTime: article.publishedAt,
      modifiedTime: article.createdAt,
      section: CATEGORIES[article.category].label,
      tags: article.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: article.headline,
      description: article.summary,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: { id: string };
}) {
  const article = await getArticleBySlug(params.id);
  if (!article) notFound();

  const all = await getArticles();
  const related = all
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 3);

  const paragraphs = article.body.split(/\n\s*\n/).filter(Boolean);

  // נתונים מובנים (JSON-LD) - חיוני ל-Google News ולתוצאות עשירות
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.headline,
    description: article.summary,
    datePublished: article.publishedAt,
    dateModified: article.createdAt,
    articleSection: CATEGORIES[article.category].label,
    keywords: article.tags.join(", "),
    inLanguage: "he",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/article/${article.slug}`),
    },
    author: { "@type": "Organization", name: SITE.name },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand">
          ראשי
        </Link>
        <span className="mx-1.5">/</span>
        <Link
          href={`/category/${CATEGORIES[article.category].slug}`}
          className="hover:text-brand"
        >
          {CATEGORIES[article.category].label}
        </Link>
      </nav>

      <article>
        <header className="mb-5">
          <div className="mb-3 flex items-center gap-2">
            <CategoryChip category={article.category} />
            <time
              dateTime={article.publishedAt}
              className="text-xs text-ink-muted"
            >
              {formatDateHe(article.publishedAt)}
            </time>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            {article.headline}
          </h1>
          {article.subtitle && (
            <p className="mt-3 text-lg leading-7 text-ink-soft">
              {article.subtitle}
            </p>
          )}
        </header>

        <ArticleImage
          category={article.category}
          src={article.imageUrl}
          className="mb-6 aspect-[16/9] w-full rounded-xl"
        />

        <div className="article-body text-lg">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {article.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {article.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-ink-soft"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {article.sourceUrl && (
          <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-ink-muted">
            מבוסס על דיווח מ-
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mx-1 font-semibold text-brand hover:underline"
            >
              {article.sourceName}
            </a>
          </p>
        )}
      </article>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-extrabold text-ink">עוד בנושא</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
