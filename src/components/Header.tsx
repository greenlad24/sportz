import Link from "next/link";
import { CATEGORY_ORDER, CATEGORIES } from "@/lib/categories";
import { LiveScores } from "./LiveScores";

const NAV = [
  { href: "/", label: "ראשי" },
  ...CATEGORY_ORDER.map((cat) => ({
    href: `/category/${CATEGORIES[cat].slug}`,
    label: CATEGORIES[cat].label,
  })),
  { href: "/about", label: "אודות" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50">
      {/* פס עליון - מילוי גרדיאנט; לוגו מימין, תוצאות חיות משמאל */}
      <div className="bg-gradient-to-l from-ink to-brand text-white">
        <div className="mx-auto flex h-14 max-w-site items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight">
              SPORTZ
            </span>
          </Link>
          <LiveScores />
        </div>
      </div>

      {/* פס ניווט - חיפוש מימין, קטגוריות שוות, LIVE משמאל */}
      <nav className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-site items-stretch px-1">
          <button
            type="button"
            aria-label="חיפוש"
            className="flex shrink-0 items-center gap-1.5 px-3 text-sm font-semibold text-ink-muted hover:text-brand"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">חיפוש</span>
          </button>

          <div className="flex flex-1 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 items-center justify-center whitespace-nowrap px-3 py-3 text-sm font-bold text-ink hover:bg-paper-soft hover:text-brand"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <span className="flex shrink-0 items-center gap-1.5 px-3 text-sm font-extrabold text-brand">
            <span className="h-1.5 w-1.5 animate-live rounded-full bg-brand" />
            LIVE
          </span>
        </div>
      </nav>
    </header>
  );
}
