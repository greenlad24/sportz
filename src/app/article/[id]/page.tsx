import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleBySlug, getArticles } from "@/lib/store";
import { CATEGORIES } from "@/lib/categories";
import { CategoryChip } from "@/components/CategoryChip";
import { ArticleImage } from "@/components/ArticleImage";
import { ArticleBody } from "@/components/ArticleBody";
import { ArticleCard } from "@/components/ArticleCard";
import { ViewTracker } from "@/components/ViewTracker";
import { CommentsSection } from "@/components/CommentsSection";
import { MostViewed } from "@/components/MostViewed";
import { CategoryTiles } from "@/components/CategoryTiles";
import { AdSlot } from "@/components/AdSlot";
import { formatDateHe } from "@/lib/time";
import { SITE, absoluteUrl } from "@/lib/site";

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

function ShareLinks({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      path: "M13 10h3l.5-3H13V5.5c0-.9.3-1.5 1.6-1.5H17V1.4C16.4 1.3 15.4 1.2 14.3 1.2 12 1.2 10.4 2.6 10.4 5.2V7H8v3h2.4v8H13z",
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      path: "M17 3h3l-7 8 8 9h-5l-4-5-5 5H4l7-8L3 3h6l4 5z",
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${t}%20${u}`,
      path: "M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 0 16 8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 0 1 12 4z",
    },
  ];
  return (
    <div className="flex items-center gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`שיתוף ב-${l.label}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-soft text-ink-soft hover:bg-brand hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d={l.path} />
          </svg>
        </a>
      ))}
    </div>
  );
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

  const url = absoluteUrl(`/article/${article.slug}`);

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
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name },
  };

  return (
    <div className="mx-auto max-w-site px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewTracker category={article.category} tags={article.tags} />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* תוכן ראשי - מימין */}
        <article className="min-w-0 flex-1">
          {/* כותרת */}
          <header className="mb-5">
            <nav className="mb-3 text-sm text-ink-muted">
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

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <CategoryChip category={article.category} />
              {article.subcategory && (
                <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-semibold text-ink-soft">
                  {article.subcategory}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
              {article.headline}
            </h1>
            {article.subtitle && (
              <p className="mt-3 text-lg leading-7 text-ink-soft">
                {article.subtitle}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-line py-2.5">
              <span className="text-sm text-ink-muted">
                {formatDateHe(article.publishedAt)}
              </span>
              <ShareLinks url={url} title={article.headline} />
            </div>
          </header>

          {/* מדיה: סרטון YouTube אם נמצא, אחרת תמונה + קרדיט */}
          {article.videoId ? (
            <div className="mb-6 aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${article.videoId}`}
                title={article.headline}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          ) : (
            <figure className="mb-6">
              <ArticleImage
                category={article.category}
                src={article.imageUrl}
                className="aspect-[16/9] w-full rounded-xl"
              />
              {article.imageCredit && (
                <figcaption className="mt-1.5 text-xs text-ink-muted">
                  קרדיט תמונה:{" "}
                  <a
                    href={article.imageCredit.link}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="hover:text-brand hover:underline"
                  >
                    {article.imageCredit.source}
                  </a>
                </figcaption>
              )}
            </figure>
          )}

          {/* גוף הכתבה */}
          <ArticleBody body={article.body} />

          {article.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {article.tags.map((t) => (
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

          {article.sourceUrl && (
            <p className="mt-6 border-t border-line pt-4 text-sm text-ink-muted">
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

          {related.length > 0 && (
            <section className="mt-10">
              <div className="mb-4 flex items-center gap-2.5 border-b border-line pb-2">
                <span className="h-6 w-1.5 rounded bg-brand" />
                <h2 className="text-xl font-extrabold text-ink">עוד בנושא</h2>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {related.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          )}

          {/* תגובות */}
          <CommentsSection articleId={article.id} />
        </article>

        {/* סרגל צד - משמאל (235px) */}
        <aside className="space-y-6 lg:w-[235px] lg:shrink-0">
          <MostViewed category={article.category} excludeId={article.id} />
          <AdSlot className="min-h-[600px]" />
          <CategoryTiles />
        </aside>
      </div>
    </div>
  );
}
