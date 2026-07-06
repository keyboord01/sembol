import type { Metadata } from "next";
import { IBM_Plex_Mono, Tektur } from "next/font/google";
import "@sembol/passkey-react/styles.css";
import "./globals.css";
import { Nav } from "../components/Nav";
import { Toaster } from "../components/Toast";
import { Providers } from "./providers";

const tektur = Tektur({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-tektur",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Sembol - Stellar Passkey Wallet",
  description:
    "A complete Stellar smart-wallet experience built only with @sembol/passkey-react: create a passkey wallet, get testnet XLM, send payments, and browse history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-sembol-theme="dark"
      className={`${tektur.variable} ${plexMono.variable}`}
      style={{ colorScheme: "dark" }}
    >
      <body>
        <Providers>
          <Toaster />
          <div className="flex min-h-screen flex-col">
            <Nav />
            <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">{children}</main>
            <footer className="border-t border-hairline">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="microlabel flex flex-wrap gap-x-2 gap-y-1 text-dim">
                  <span>Sembol</span>
                  <span aria-hidden>·</span>
                  <span>Stellar testnet</span>
                  <span aria-hidden className="hidden sm:inline">
                    ·
                  </span>
                  <span className="w-full sm:w-auto">Smart accounts by OpenZeppelin</span>
                </p>
                <nav className="microlabel flex gap-2" aria-label="Project links">
                  <a
                    href="https://github.com/keyboord01/sembol"
                    target="_blank"
                    rel="noreferrer"
                    className="border border-hairline px-3 py-1.5 text-dim transition-colors hover:border-long hover:text-long"
                  >
                    Source ↗
                  </a>
                  <a
                    href="https://www.npmjs.com/package/@sembol/passkey-react"
                    target="_blank"
                    rel="noreferrer"
                    className="border border-hairline px-3 py-1.5 text-dim transition-colors hover:border-long hover:text-long"
                  >
                    npm ↗
                  </a>
                </nav>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
