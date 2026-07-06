import type { Metadata } from "next";
import { IBM_Plex_Mono, Tektur } from "next/font/google";
import "@sembol/passkey-react/styles.css";
import "./globals.css";
import { Nav } from "../components/Nav";
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
  title: "Sembol — Stellar Passkey Wallet",
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
          <div className="flex min-h-screen flex-col">
            <Nav />
            <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">{children}</main>
            <footer className="border-t border-hairline">
              <div className="microlabel mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-5 gap-y-1 px-5 py-4 text-dim">
                <span>Sembol</span>
                <span aria-hidden>·</span>
                <span>Stellar testnet</span>
                <span aria-hidden>·</span>
                <span>Smart accounts by OpenZeppelin</span>
                <span aria-hidden>·</span>
                <a
                  href="https://github.com/keyboord01/sembol"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-fg"
                >
                  Source ↗
                </a>
                <a
                  href="https://www.npmjs.com/package/@sembol/passkey-react"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-fg"
                >
                  npm ↗
                </a>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
