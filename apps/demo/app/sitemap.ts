import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://sembol.xyz";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/wallet`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/customize`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/docs`, changeFrequency: "weekly", priority: 0.9 },
  ];
}
