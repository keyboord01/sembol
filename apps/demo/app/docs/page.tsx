import type { Metadata } from "next";
import { DocPageView } from "../../components/docs/DocPageView";
import { pageBySlug } from "../../lib/docs-content";

const page = pageBySlug("index")!;

export const metadata: Metadata = {
  title: `${page.title} · Docs`,
  description: page.description,
  alternates: { canonical: "/docs", types: { "text/markdown": "/md/docs/index" } },
};

export default function DocsIndexPage() {
  return <DocPageView slug="index" />;
}
