import Link from "next/link";
import { getArticles } from "@/lib/store";
import { CATEGORY_ORDER, CATEGORIES } from "@/lib/categories";

const FALLBACK: Record<string, string> = {
  avdija: "from-brand to-[#6e2018]",
  israeli_basketball: "from-ochre to-[#7a531a]",
  world_football: "from-olive to-[#3f5325]",
};

/** מדורים - אריחי קטגוריה: תמונה + שכבת שחור שקופה + שם הקטגוריה במרכז. */
export async function CategoryTiles() {
  const all = await getArticles();

  return (
    <div className="space-y-3">
      <h2 className="text-base font-extrabold text-ink">מדורים</h2>
      {CATEGORY_ORDER.map((cat) => {
        const c = CATEGORIES[cat];
        const img = all.find((a) => a.category === cat && a.imageUrl)?.imageUrl;
        return (
          <Link
            key={cat}
            href={`/category/${c.slug}`}
            className="relative block h-[90px] overflow-hidden rounded-lg"
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className={`h-full w-full bg-gradient-to-br ${FALLBACK[cat]}`}
              />
            )}
            <div className="absolute inset-0 bg-black/55 transition group-hover:bg-black/45" />
            <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-white">
              {c.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
