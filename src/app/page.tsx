import Link from "next/link";
import { getArticles, getUpdates } from "@/lib/store";
import { CATEGORY_ORDER, CATEGORIES } from "@/lib/categories";
import { FeaturedArticle } from "@/components/FeaturedArticle";
import { ArticleRow } from "@/components/ArticleRow";
import { HourlyUpdates } from "@/components/HourlyUpdates";
import { ForYou } from "@/components/ForYou";
import { AdSlot } from "@/components/AdSlot";
import { rankArticles, visibleArticles } from "@/lib/ranking";

// דינמי: מרונדר מהאחסון החי בכל בקשה, כך שכתבות חדשות מהמנוע מופיעות מיד.
// (ISR/revalidate לא הציג תוכן חי באמינות בפריסת standalone, ולכן עברנו לדינמי.)
export const dynamic = "force-dynamic";

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
  const [allArticles, updates] = await Promise.all([
    getArticles(),
    getUpdates(14),
  ]);
  // טריות (24ש') + ידידותי-למשפחה. דירוג: לפי שעה ואז חשיבות ("סיפור השעה").
  const articles = visibleArticles(allArticles);
  const ranked = rankArticles(articles);

  // "סיפור השעה" - הכתבה החשובה ביותר בשעה האחרונה (ראש הדירוג המאוחד).
  const mainStory = ranked[0];

  const usedIds = new Set([mainStory?.id]);
  const latest = ranked.filter((a) => !usedIds.has(a.id)).slice(0, 10);

  // ברירת מחדל ל"המלצות לקריאה" עד שנצבר פרופיל עניין ב-localStorage
  const foryouFallback = latest.slice(0, 8);

  return (
    <div className="mx-auto max-w-site px-4 py-5">
      {/* בלוק העל: מימין הסיפור הראשי + המלצות לקריאה, משמאל עדכונים חיים (235px) */}
      {mainStory && (
        <section className="mb-10 flex flex-col gap-6 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <FeaturedArticle article={mainStory} tall />
            <ForYou fallback={foryouFallback} excludeId={mainStory.id} />
          </div>

          <aside className="lg:w-[235px] lg:shrink-0">
            <HourlyUpdates updates={updates} />
          </aside>
        </section>
      )}

      {/* פיד מבזקים: כתבות (697px) + שטח פרסום (235px) משמאל */}
      {latest.length > 0 && (
        <section className="mb-10 flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1 border-t border-line">
            {latest.map((a) => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </div>
          <aside className="lg:w-[235px] lg:shrink-0">
            <AdSlot className="sticky top-28 min-h-[600px]" />
          </aside>
        </section>
      )}

      {/* בלוקים לפי קטגוריה */}
      {CATEGORY_ORDER.map((cat) => {
        const c = CATEGORIES[cat];
        const items = rankArticles(
          articles.filter((a) => a.category === cat),
        ).slice(0, 9);
        if (items.length === 0) return null;
        const blockLead = items[0];
        const blockRest = items.slice(1);
        return (
          <section key={cat} className="mb-10">
            <SectionHeading bar={c.bar} href={`/category/${c.slug}`}>
              {c.label}
            </SectionHeading>

            {/* כתבה ראשית ברוחב מלא (עיצוב הסיפור הראשי) */}
            <FeaturedArticle article={blockLead} tall />

            {/* פיד שורות (697px) + שטח פרסום (235px) - כמו "מבזקים אחרונים" */}
            {blockRest.length > 0 && (
              <div className="mt-6 flex flex-col gap-6 lg:flex-row">
                <div className="min-w-0 flex-1 border-t border-line">
                  {blockRest.map((a) => (
                    <ArticleRow key={a.id} article={a} />
                  ))}
                </div>
                <aside className="lg:w-[235px] lg:shrink-0">
                  <AdSlot className="sticky top-28 min-h-[600px]" />
                </aside>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
