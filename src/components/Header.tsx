import Link from "next/link";
import { CATEGORY_ORDER, CATEGORIES } from "@/lib/categories";
import { SITE } from "@/lib/site";
import { LiveClock } from "./LiveClock";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      {/* פס עליון: לוגו + תאריך + עדכון חי */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="rounded-md bg-brand px-2.5 py-1 text-2xl font-extrabold tracking-tight text-white">
            SPORTZ
          </span>
          <span className="hidden text-sm font-medium text-ink-muted md:inline">
            {SITE.tagline}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <LiveClock />
          <span className="flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
            <span className="h-2 w-2 animate-live rounded-full bg-brand" />
            עדכון חי
          </span>
        </div>
      </div>

      {/* פס ניווט קטגוריות */}
      <nav className="border-t border-line bg-paper-soft">
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-2 py-1 text-sm font-bold">
          <Link
            href="/"
            className="whitespace-nowrap rounded-md px-3 py-2 text-ink hover:bg-white hover:text-brand"
          >
            ראשי
          </Link>
          {CATEGORY_ORDER.map((cat) => {
            const c = CATEGORIES[cat];
            return (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="whitespace-nowrap rounded-md px-3 py-2 text-ink hover:bg-white hover:text-brand"
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
