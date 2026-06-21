import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/store";
import { CATEGORIES } from "@/lib/categories";
import { siteUrl } from "@/lib/site";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const articles = await getArticles();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/schedule`, changeFrequency: "hourly", priority: 0.6 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.3 },
    ...Object.values(CATEGORIES).map((c) => ({
      url: `${base}/category/${c.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${base}/article/${a.slug}`,
    lastModified: new Date(a.createdAt),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...articleRoutes];
}
