import { PAGES, pageBySlug, pageToMarkdown } from "../../../../lib/docs-content";

export const dynamic = "force-static";

export function generateStaticParams() {
  return PAGES.map((p) => ({ slug: p.slug }));
}

export function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return ctx.params.then(({ slug }) => {
    const page = pageBySlug(slug);
    if (!page) return new Response("Not found", { status: 404 });
    return new Response(pageToMarkdown(page), {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  });
}
