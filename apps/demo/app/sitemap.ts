import type { MetadataRoute } from "next";
import { PAGES, pagePath } from "../lib/docs-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://sembol.xyz";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/wallet`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/customize`, changeFrequency: "weekly", priority: 0.8 },
    ...PAGES.map((p) => ({
      url: `${base}${pagePath(p)}`,
      changeFrequency: "weekly" as const,
      priority: p.slug === "index" ? 0.9 : 0.7,
    })),
  ];
}
