import Link from "next/link";
import type { Article } from "@/lib/types";

/** רצועת מבזקים אופקית בראש העמוד (בסגנון פורטל חדשות) */
export function BreakingTicker({ items }: { items: Article[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6 flex items-stretch overflow-hidden rounded-lg border border-line bg-white">
      <span className="flex shrink-0 items-center gap-1.5 bg-brand px-3 text-sm font-extrabold text-white">
        <span className="h-2 w-2 animate-live rounded-full bg-white" />
        מבזקים
      </span>
      <div className="flex gap-6 overflow-x-auto whitespace-nowrap px-4 py-2.5 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((a) => (
          <Link
            key={a.id}
            href={`/article/${a.slug}`}
            className="font-semibold text-ink hover:text-brand"
          >
            {a.headline}
          </Link>
        ))}
      </div>
    </div>
  );
}
