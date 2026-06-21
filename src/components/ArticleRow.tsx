import Link from "next/link";
import type { Article, Category } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { ArticleImage } from "./ArticleImage";
import { formatShortHe } from "@/lib/time";

// צבע מד התגובות לפי קטגוריה
const BADGE: Record<Category, string> = {
  avdija: "text-brand",
  israeli_basketball: "text-ochre",
  world_football: "text-olive",
};

// מספר תגובות יציב ופסבדו-אקראי (אין מערכת תגובות אמיתית עדיין)
function commentCount(a: Article): number {
  let h = 0;
  for (const ch of a.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 180) + Math.max(1, Math.round(a.importance));
}

/** שורת כתבה: תמונה מימין (מעט מעוגלת), כותרת + כותרת משנה משמאל, מד תגובות. */
export function ArticleRow({ article }: { article: Article }) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="group flex items-stretch gap-4 border-b border-line py-5"
    >
      {/* תמונה - מימין */}
      <div className="shrink-0">
        <ArticleImage
          category={article.category}
          src={article.imageUrl}
          alt={article.headline}
          className="h-[120px] w-[170px] rounded-lg sm:h-[130px] sm:w-[200px]"
        />
      </div>

      {/* טקסט - משמאל */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="mb-1 text-xs font-semibold text-ink-muted">
          {CATEGORIES[article.category].label}
        </span>
        <h3 className="text-lg font-extrabold leading-6 text-ink group-hover:text-brand sm:text-xl sm:leading-7">
          {article.headline}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">
          {article.subtitle || article.summary}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <time
            dateTime={article.publishedAt}
            className="text-xs text-ink-muted"
          >
            {formatShortHe(article.publishedAt)}
          </time>
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold ${BADGE[article.category]}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9.5L4 20V5a1 1 0 0 1 1-1z" />
            </svg>
            {commentCount(article)}
          </span>
        </div>
      </div>
    </Link>
  );
}
