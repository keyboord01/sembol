import Link from "next/link";
import { SembolLogo } from "../../components/Brand";
import { ArrowUpRightIcon } from "../../components/icons";
import { DocsNav, MobileDocsTabs } from "../../components/docs/DocsNav";
import { GITHUB_URL, GROUPS, PAGES, STORYBOOK_URL, pagePath, searchIndex } from "../../lib/docs-content";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const navPages = PAGES.map((p) => ({ slug: p.slug, title: p.title, group: p.group, path: pagePath(p) }));
  const index = searchIndex();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-hairline/70 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <span className="flex items-center gap-3">
            <Link href="/" aria-label="Sembol home">
              <SembolLogo />
            </Link>
            <span className="microlabel mt-0.5 hidden text-faint sm:block">/ docs</span>
          </span>
          <nav className="flex items-center gap-6 text-sm text-dim" aria-label="Docs header">
            <Link href="/customize" className="hidden transition-colors hover:text-fg md:block">Theme builder</Link>
            <a href={STORYBOOK_URL} target="_blank" rel="noreferrer" className="hidden items-center gap-1 transition-colors hover:text-fg md:inline-flex">
              Storybook <ArrowUpRightIcon size={13} />
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-fg">
              GitHub <ArrowUpRightIcon size={13} />
            </a>
            <Link href="/wallet" className="btn-gold btn-seal h-9 px-4 text-sm">Try it</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:py-10">
        <aside className="top-28 hidden h-fit lg:sticky lg:block" aria-label="Docs navigation">
          <DocsNav pages={navPages} groups={GROUPS} index={index} />
        </aside>
        <div className="min-w-0">
          <MobileDocsTabs pages={navPages} />
          <div className="pt-5 lg:pt-0">{children}</div>
        </div>
      </div>

      <footer className="border-t border-hairline/70">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
          <p className="microlabel text-faint">Sembol · MIT · these docs are also machine readable</p>
          <nav className="flex gap-5 text-sm" aria-label="Docs footer">
            <a href="/llms.txt" className="text-dim transition-colors hover:text-gold">llms.txt</a>
            <a href="/llms-full.txt" className="text-dim transition-colors hover:text-gold">llms-full.txt</a>
            <Link href="/" className="text-dim transition-colors hover:text-gold">sembol.xyz</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
