import Link from "next/link";
import type { Article } from "@/lib/types";
import { CategoryChip } from "./CategoryChip";
import { timeAgoHe } from "@/lib/time";

/** רשימת כותרות ממוספרת לרייל הצדדי (בסגנון "עוד בכותרות" של פורטל חדשות) */
export function HeadlineList({ items }: { items: Article[] }) {
  return (
    <ol className="divide-y divide-line">
      {items.map((a, i) => (
        <li key={a.id}>
          <Link
            href={`/article/${a.slug}`}
            className="group flex gap-3 py-3 first:pt-0"
          >
            <span className="w-5 shrink-0 text-lg font-extrabold leading-7 text-brand">
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="mb-1">
                <CategoryChip category={a.category} asLink={false} />
              </div>
              <h3 className="line-clamp-3 text-sm font-bold leading-6 text-ink group-hover:text-brand">
                {a.headline}
              </h3>
              <time
                dateTime={a.publishedAt}
                className="mt-0.5 block text-[11px] text-ink-muted"
              >
                {timeAgoHe(a.publishedAt)}
              </time>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
