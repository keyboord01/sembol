import Link from "next/link";
import { SembolMark } from "../../components/Brand";
import { Nav } from "../../components/Nav";
import { NETWORK_LABEL } from "../../lib/config";

/** Shared chrome for the wallet app: status bar on top, slim footer below. */
export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-6 sm:py-12">
        {children}
      </main>
      <footer className="border-t border-hairline/70">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href="/"
            className="microlabel inline-flex items-center gap-2 text-faint transition-colors hover:text-fg"
          >
            <SembolMark size={12} className="text-gold/70" title="" />
            Sembol · {NETWORK_LABEL}
          </Link>
          <nav className="flex gap-5 text-sm" aria-label="Project links">
            <a
              href="https://github.com/keyboord01/sembol"
              target="_blank"
              rel="noreferrer"
              className="text-dim transition-colors hover:text-gold"
            >
              Source
            </a>
            <a
              href="https://www.npmjs.com/package/@sembol/passkey-react"
              target="_blank"
              rel="noreferrer"
              className="text-dim transition-colors hover:text-gold"
            >
              npm
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
