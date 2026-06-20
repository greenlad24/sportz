import Link from "next/link";
import { getArticles } from "@/lib/store";
import { CATEGORY_ORDER, CATEGORIES } from "@/lib/categories";
import { FeaturedArticle } from "@/components/FeaturedArticle";
import { ArticleCard } from "@/components/ArticleCard";
import type { Article, Category } from "@/lib/types";

// ISR: HTML סטטי מהיר. מתרענן אוטומטית כשמנוע הניוז מוסיף כתבות (on-demand),
// וכגיבוי כל 5 דקות בהתאם לקצב המנוע.
export const revalidate = 300;

function pickFeatured(articles: Article[]): Article | undefined {
  // הכתבה הראשית: עדיפות לאבדיה, לפי חשיבות וטריות
  const ranked = [...articles].sort((a, b) => {
    const aw = a.importance + (a.category === "avdija" ? 3 : 0);
    const bw = b.importance + (b.category === "avdija" ? 3 : 0);
    if (bw !== aw) return bw - aw;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
  return ranked[0];
}

export default async function HomePage() {
  const articles = await getArticles();
  const featured = pickFeatured(articles);
  const rest = articles.filter((a) => a.id !== featured?.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {featured && (
        <section className="mb-8">
          <FeaturedArticle article={featured} />
        </section>
      )}

      {/* מבזקים אחרונים */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-ink">
          <span className="h-5 w-1.5 rounded bg-brand" />
          מבזקים אחרונים
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.slice(0, 6).map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      </section>

      {/* מקטע לכל קטגוריה */}
      {CATEGORY_ORDER.map((cat) => {
        const c = CATEGORIES[cat];
        const items = articles.filter((a) => a.category === cat).slice(0, 3);
        if (items.length === 0) return null;
        return (
          <section key={cat} className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-sm ${c.accent}`}
                >
                  {c.label}
                </span>
              </h2>
              <Link
                href={`/category/${c.slug}`}
                className="text-sm font-semibold text-brand hover:underline"
              >
                לכל הכתבות ←
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
