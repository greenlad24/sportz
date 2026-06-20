import Link from "next/link";
import type { Update } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { timeAgoHe } from "@/lib/time";

/**
 * "עדכונים חיים" - העובדות המאומתות של השעה (הרכבים, תוצאות, דיווחים, שמועות)
 * שעליהן מבוססות כל הכתבות שנכתבו בשעה זו.
 */
export function HourlyUpdates({ updates }: { updates: Update[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex items-center gap-1.5 bg-brand px-4 py-2.5 text-white">
        <span className="h-1.5 w-1.5 animate-live rounded-full bg-white" />
        <h2 className="text-base font-extrabold">עדכונים חיים</h2>
      </div>

      <ol className="max-h-[640px] divide-y divide-line overflow-y-auto">
        {updates.map((u) => (
          <li key={u.id}>
            <Link
              href={`/category/${CATEGORIES[u.category].slug}`}
              className="group block px-4 py-3 hover:bg-paper-soft"
            >
              <p className="text-sm font-semibold leading-6 text-ink group-hover:text-brand">
                {u.text}
              </p>
              <time
                dateTime={u.createdAt}
                className="mt-1 block text-[11px] text-ink-muted"
              >
                {timeAgoHe(u.createdAt)}
              </time>
            </Link>
          </li>
        ))}
        {updates.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-ink-muted">
            אין עדכונים כרגע. המנוע מתעדכן כל שעה.
          </li>
        )}
      </ol>
    </div>
  );
}
