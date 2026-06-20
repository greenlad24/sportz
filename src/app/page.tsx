import Link from "next/link";
import { getArticles } from "@/lib/store";
import { CATEGORY_ORDER, CATEGORIES } from "@/lib/categories";
import { FeaturedArticle } from "@/components/FeaturedArticle";
import { ArticleCard } from "@/components/ArticleCard";
import { HeadlineList } from "@/components/HeadlineList";
import { BreakingTicker } from "@/components/BreakingTicker";
import type { Article } from "@/lib/types";

// ISR: HTML סטטי מהיר. מתרענן כשמנוע הניוז מוסיף כתבות (on-demand), וגיבוי כל 5 דק'.
export const revalidate = 300;

function rank(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const aw = a.importance + (a.category === "avdija" ? 3 : 0);
    const bw = b.importance + (b.category === "avdija" ? 3 : 0);
    if (bw !== aw) return bw - aw;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

function SectionHeading({
  children,
  bar = "bg-brand",
  href,
}: {
  children: React.ReactNode;
  bar?: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between border-b border-line pb-2">
      <div className="flex items-center gap-2.5">
        <span className={`h-6 w-1.5 rounded ${bar}`} />
        <h2 className="text-xl font-extrabold text-ink">{children}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="text-sm font-bold text-brand hover:underline"
        >
          לכל הכתבות ←
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const articles = await getArticles();
  const ranked = rank(articles);

  const lead = ranked[0];
  const rail = ranked.slice(1, 6); // "עוד בכותרות"
  const topIds = new Set([lead?.id, ...rail.map((a) => a.id)]);

  const remaining = articles.filter((a) => !topIds.has(a.id));
  const latest = remaining.slice(0, 6); // עמודת מבזקים מרכזית
  const latestIds = new Set(latest.map((a) => a.id));

  const mostRead = ranked
    .filter((a) => !topIds.has(a.id) && !latestIds.has(a.id))
    .slice(0, 6); // "הנקראות ביותר"

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      {/* רצועת מבזקים */}
      <BreakingTicker items={ranked.slice(0, 8)} />

      {/* בלוק כותרות ראשי: כתבה מובילה + רשימת כותרות */}
      {lead && (
        <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FeaturedArticle article={lead} />
          </div>
          <aside className="rounded-xl border border-line bg-white p-4">
            <div className="mb-3 flex items-center gap-2.5 border-b border-line pb-2">
              <span className="h-5 w-1.5 rounded bg-brand" />
              <h2 className="text-lg font-extrabold text-ink">עוד בכותרות</h2>
            </div>
            <HeadlineList items={rail} />
          </aside>
        </section>
      )}

      {/* פיד מרכזי + סרגל "הנקראות ביותר" */}
      {latest.length > 0 && (
        <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionHeading>מבזקים אחרונים</SectionHeading>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {latest.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </div>

          {mostRead.length > 0 && (
            <aside className="rounded-xl border border-line bg-paper-soft p-4">
              <div className="mb-3 flex items-center gap-2.5 border-b border-line pb-2">
                <span className="h-5 w-1.5 rounded bg-ink" />
                <h2 className="text-lg font-extrabold text-ink">
                  הנקראות ביותר
                </h2>
              </div>
              <HeadlineList items={mostRead} />
            </aside>
          )}
        </section>
      )}

      {/* בלוקים לפי קטגוריה: כתבה מובילה + רשימת כותרות (בסגנון פורטל) */}
      {CATEGORY_ORDER.map((cat) => {
        const c = CATEGORIES[cat];
        const items = articles.filter((a) => a.category === cat).slice(0, 5);
        if (items.length === 0) return null;
        const blockLead = items[0];
        const blockRest = items.slice(1, 5);
        return (
          <section key={cat} className="mb-10">
            <SectionHeading bar={c.bar} href={`/category/${c.slug}`}>
              {c.label}
            </SectionHeading>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ArticleCard article={blockLead} />
              {blockRest.length > 0 && (
                <div className="rounded-xl border border-line bg-white p-4">
                  <HeadlineList items={blockRest} />
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
