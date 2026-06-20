import Link from "next/link";
import { getArticles } from "@/lib/store";
import type { Category } from "@/lib/types";

/** "הנצפים ביותר" - הכתבות הפופולריות בקטגוריה מהשבוע האחרון. */
export async function MostViewed({
  category,
  excludeId,
}: {
  category: Category;
  excludeId: string;
}) {
  const all = await getArticles();
  const weekAgo = Date.now() - 7 * 24 * 36e5;

  // אין מעקב צפיות אמיתי - מדרגים לפי חשיבות + טריות כמדד פופולריות
  const items = all
    .filter(
      (a) =>
        a.category === category &&
        a.id !== excludeId &&
        new Date(a.publishedAt).getTime() >= weekAgo,
    )
    .sort(
      (a, b) =>
        b.importance - a.importance ||
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, 5);

  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="bg-ink px-4 py-2.5">
        <h2 className="text-base font-extrabold text-white">הנצפים ביותר</h2>
      </div>
      <ol className="divide-y divide-line">
        {items.map((a, i) => (
          <li key={a.id}>
            <Link
              href={`/article/${a.slug}`}
              className="group flex gap-2.5 px-3 py-3 hover:bg-paper-soft"
            >
              <span className="text-lg font-extrabold leading-6 text-brand">
                {i + 1}
              </span>
              <h3 className="line-clamp-3 text-sm font-bold leading-5 text-ink group-hover:text-brand">
                {a.headline}
              </h3>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
