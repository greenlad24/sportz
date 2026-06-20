import Link from "next/link";
import { CATEGORY_ORDER, CATEGORIES } from "@/lib/categories";
import { SITE } from "@/lib/site";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="rounded-md bg-brand px-2 py-1 text-xl font-extrabold tracking-tight text-white">
            SPORTZ
          </span>
          <span className="hidden text-sm text-ink-muted sm:inline">
            {SITE.tagline}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-brand">
            <span className="h-2 w-2 animate-live rounded-full bg-brand" />
            עדכון חי
          </span>
        </div>
      </div>

      <nav className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-2 py-1.5 text-sm font-semibold">
          <Link
            href="/"
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-ink-soft hover:bg-slate-100"
          >
            ראשי
          </Link>
          {CATEGORY_ORDER.map((cat) => {
            const c = CATEGORIES[cat];
            return (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-ink-soft hover:bg-slate-100"
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
