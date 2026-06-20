import Link from "next/link";
import type { Article } from "@/lib/types";
import { CategoryChip } from "./CategoryChip";
import { ArticleImage } from "./ArticleImage";
import { timeAgoHe } from "@/lib/time";

export function FeaturedArticle({ article }: { article: Article }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:shadow-lg hover:shadow-ink/5">
      <Link href={`/article/${article.slug}`} className="block">
        <div className="relative">
          <ArticleImage
            category={article.category}
            src={article.imageUrl}
            className="aspect-[16/9] w-full sm:aspect-[2/1]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 right-0 left-0 p-5 sm:p-7">
            <div className="mb-2 flex items-center gap-2">
              <CategoryChip category={article.category} asLink={false} />
              <time
                dateTime={article.publishedAt}
                className="text-xs font-medium text-white/80"
              >
                {timeAgoHe(article.publishedAt)}
              </time>
            </div>
            <h2 className="text-2xl font-extrabold leading-8 text-white sm:text-3xl sm:leading-10">
              {article.headline}
            </h2>
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
              {article.subtitle || article.summary}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
