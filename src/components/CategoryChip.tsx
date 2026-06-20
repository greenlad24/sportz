import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/lib/types";

export function CategoryChip({
  category,
  asLink = true,
}: {
  category: Category;
  asLink?: boolean;
}) {
  const c = CATEGORIES[category];
  const cls = `inline-block rounded px-2 py-0.5 text-xs font-bold ${c.accent}`;

  if (!asLink) return <span className={cls}>{c.label}</span>;

  return (
    <Link href={`/category/${c.slug}`} className={cls}>
      {c.label}
    </Link>
  );
}
