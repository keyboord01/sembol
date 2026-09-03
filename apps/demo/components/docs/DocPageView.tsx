import Link from "next/link";
import {
  GROUPS,
  PAGES,
  SITE,
  pageBySlug,
  pagePath,
  prevNext,
  toc,
} from "../../lib/docs-content";
import { ArrowRightIcon } from "../icons";
import { PageActions } from "./PageActions";
import { RenderBlocks } from "./render";
import { Toc } from "./Toc";

export function DocPageView({ slug }: { slug: string }) {
  const page = pageBySlug(slug)!;
  const { prev, next } = prevNext(slug);
  const items = toc(page);
  const mdPath = `/md/docs/${page.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description: page.description,
    url: `${SITE}${pagePath(page)}`,
    isPartOf: { "@type": "WebSite", name: "Sembol", url: SITE },
    encoding: { "@type": "MediaObject", contentUrl: `${SITE}${mdPath}`, encodingFormat: "text/markdown" },
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_190px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="min-w-0 max-w-3xl text-[15px] text-dim">
        <p className="microlabel text-gold">{page.group}</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-fg uppercase sm:text-4xl">
          {page.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed">{page.description}</p>
        <PageActions mdPath={mdPath} />
        <div className="mt-2">
          <RenderBlocks blocks={page.blocks} />
        </div>

        <nav aria-label="Docs pagination" className="mt-14 grid grid-cols-1 gap-3 border-t border-hairline/60 pt-6 sm:grid-cols-2">
          {prev ? (
            <Link href={pagePath(prev)} className="card group p-4 transition-colors hover:border-gold/40">
              <span className="microlabel text-faint">Previous</span>
              <span className="mt-1 flex items-center gap-2 text-sm font-medium text-fg group-hover:text-gold">
                <ArrowRightIcon size={14} className="rotate-180" />
                {prev.title}
              </span>
            </Link>
          ) : (
            <span aria-hidden />
          )}
          {next && (
            <Link href={pagePath(next)} className="card group p-4 text-right transition-colors hover:border-gold/40 sm:col-start-2">
              <span className="microlabel text-faint">Next</span>
              <span className="mt-1 flex items-center justify-end gap-2 text-sm font-medium text-fg group-hover:text-gold">
                {next.title}
                <ArrowRightIcon size={14} />
              </span>
            </Link>
          )}
        </nav>
      </article>

      <div className="top-28 hidden h-fit xl:sticky xl:block">
        <Toc items={items} />
      </div>
    </div>
  );
}
