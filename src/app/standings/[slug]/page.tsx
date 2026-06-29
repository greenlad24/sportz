import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getArticles } from "@/lib/store";
import { categoryBySlug } from "@/lib/categories";
import { getCategoryStandings } from "@/lib/standings";
import { isTransaction } from "@/lib/relevance";
import { isFamilySafe } from "@/lib/safety";
import { StandingsTable } from "@/components/StandingsTable";
import { TradesList } from "@/components/TradesList";
import { SITE } from "@/lib/site";

// דינמי: הטבלאות מתעדכנות *בכניסה לעמוד* (עדכון עצל) ונשמרות. ראה standings.ts.
export const dynamic = "force-dynamic";

// חלון "מעברים אחרונים" - עסקאות/חתימות רלוונטיות נשארות זמן רב יותר מ-24 שעות.
const TRADES_WINDOW_DAYS = 45;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const c = categoryBySlug(params.slug);
  if (!c) return {};
  const title = `טבלאות ומעברים - ${c.label}`;
  return {
    title,
    description: `טבלת ליגה חיה, דירוג ומעברים אחרונים ב${c.label}.`,
    alternates: { canonical: `/standings/${c.slug}` },
    openGraph: { title: `${title} | ${SITE.name}`, type: "website" },
  };
}

export default async function StandingsPage({
  params,
}: {
  params: { slug: string };
}) {
  const c = categoryBySlug(params.slug);
  if (!c) notFound();

  // עדכון עצל + שמירה: נשאב מ-ESPN רק אם השמור ישן, אחרת מהאחסון.
  const standings = await getCategoryStandings(c.category);

  // מעברים/חתימות אחרונים בקטגוריה -> כרטיסים עם תמונת השחקן וקישור לברייקינג.
  const cutoff = Date.now() - TRADES_WINDOW_DAYS * 864e5;
  const all = await getArticles();
  const trades = all
    .filter(
      (a) =>
        a.category === c.category &&
        new Date(a.publishedAt).getTime() >= cutoff &&
        isFamilySafe(`${a.headline} ${a.subtitle} ${a.summary}`) &&
        isTransaction(`${a.headline} ${a.subtitle} ${a.summary} ${a.tags.join(" ")}`),
    )
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, 12);

  return (
    <div className="mx-auto max-w-site px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <span
          className={`inline-block rounded px-2.5 py-1 text-sm font-bold ${c.accent}`}
        >
          {c.label}
        </span>
        <h1 className="text-xl font-extrabold text-ink">טבלאות ומעברים</h1>
        <Link
          href={`/category/${c.slug}`}
          className="text-sm font-medium text-brand hover:underline"
        >
          לכל החדשות ב{c.label} ←
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* טבלאות הליגה */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 border-b border-line pb-1.5">
            <span className={`h-4 w-1 rounded ${c.bar}`} />
            <h2 className="text-base font-extrabold text-ink">טבלת הליגה</h2>
          </div>
          {standings.length === 0 ? (
            <p className="rounded-xl border border-line bg-paper p-4 text-sm text-ink-muted">
              הטבלה אינה זמינה כרגע. נסו שוב מאוחר יותר.
            </p>
          ) : (
            <div className="space-y-4">
              {standings.map((s) => (
                <StandingsTable key={s.leagueKey} data={s} barClass={c.bar} />
              ))}
            </div>
          )}
        </div>

        {/* מעברים וחתימות */}
        <div>
          <div className="mb-3 flex items-center gap-2 border-b border-line pb-1.5">
            <span className={`h-4 w-1 rounded ${c.bar}`} />
            <h2 className="text-base font-extrabold text-ink">מעברים וחתימות</h2>
          </div>
          <TradesList trades={trades} />
        </div>
      </div>
    </div>
  );
}
