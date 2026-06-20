import Link from "next/link";
import type { Article } from "@/lib/types";
import { CategoryChip } from "./CategoryChip";
import { ArticleImage } from "./ArticleImage";
import { timeAgoHe } from "@/lib/time";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-line bg-white transition hover:shadow-md hover:shadow-ink/5">
      <Link href={`/article/${article.slug}`} className="block">
        <ArticleImage
          category={article.category}
          src={article.imageUrl}
          className="aspect-[16/9] w-full"
        />
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <CategoryChip category={article.category} asLink={false} />
            <time
              dateTime={article.publishedAt}
              className="text-xs text-ink-muted"
            >
              {timeAgoHe(article.publishedAt)}
            </time>
          </div>
          <h3 className="text-lg font-bold leading-7 text-ink group-hover:text-brand">
            {article.headline}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-ink-muted">
            {article.summary}
          </p>
        </div>
      </Link>
    </article>
  );
}
