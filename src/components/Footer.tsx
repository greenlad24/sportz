import Link from "next/link";
import { CATEGORY_ORDER, CATEGORIES } from "@/lib/categories";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-line bg-white">
      <div className="mx-auto max-w-site px-4 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <span className="rounded-md bg-brand px-2.5 py-1 text-lg font-extrabold text-white">
              SPORTZ
            </span>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              {SITE.description}
            </p>
          </div>

          <nav className="flex flex-col gap-2 text-sm">
            <span className="font-bold text-ink">קטגוריות</span>
            {CATEGORY_ORDER.map((cat) => {
              const c = CATEGORIES[cat];
              return (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="text-ink-muted hover:text-brand"
                >
                  {c.label}
                </Link>
              );
            })}
          </nav>

          <nav className="flex flex-col gap-2 text-sm">
            <span className="font-bold text-ink">קישורים</span>
            <Link href="/about" className="text-ink-muted hover:text-brand">
              אודות
            </Link>
            <Link href="/feed.xml" className="text-ink-muted hover:text-brand">
              RSS
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-line pt-4 text-xs text-ink-muted">
          © {new Date().getFullYear()} {SITE.name}. כל הזכויות שמורות. אתר חדשות
          ספורט אוטומטי.
        </div>
      </div>
    </footer>
  );
}
