import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocPageView } from "../../../components/docs/DocPageView";
import { PAGES, pageBySlug } from "../../../lib/docs-content";

export function generateStaticParams() {
  return PAGES.filter((p) => p.slug !== "index").map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pageBySlug(slug);
  if (!page) return {};
  return {
    title: `${page.title} · Docs`,
    description: page.description,
    alternates: { canonical: `/docs/${slug}`, types: { "text/markdown": `/md/docs/${slug}` } },
  };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!pageBySlug(slug) || slug === "index") notFound();
  return <DocPageView slug={slug} />;
}
