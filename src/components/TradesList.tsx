import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleImage } from "./ArticleImage";
import { timeAgoHe } from "@/lib/time";

/**
 * רשימת "מעברים וחתימות": כל עסקה/חתימה אחרונה בקטגוריה - תמונת השחקן (תמונת
 * הכתבה) + כותרת + זמן, עם קישור לכתבת הברייקינג. אם אין תמונה - רקע מדורג.
 */
export function TradesList({ trades }: { trades: Article[] }) {
  if (trades.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-paper p-4 text-sm text-ink-muted">
        אין מעברים או חתימות חדשים כרגע. נתעדכן ברגע שיהיו.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {trades.map((a) => (
        <li key={a.id}>
          <Link
            href={`/article/${a.slug}`}
            className="group flex h-[92px] overflow-hidden rounded-xl border border-line bg-paper transition hover:border-brand"
          >
            <div className="h-full w-[92px] shrink-0">
              <ArticleImage
                category={a.category}
                src={a.imageUrl}
                alt={a.headline}
                className="h-full w-full"
              />
            </div>
            <div className="flex flex-1 flex-col justify-center p-2.5">
              <h3 className="line-clamp-2 text-[13px] font-bold leading-5 text-ink group-hover:text-brand">
                {a.headline}
              </h3>
              <span className="mt-1 text-[11px] text-ink-muted">
                {timeAgoHe(a.publishedAt)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
