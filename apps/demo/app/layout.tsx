import type { Metadata } from "next";
import "@sembol/passkey-react/styles.css";
import "./globals.css";
import { Nav } from "../components/Nav";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Sembol Demo — Stellar Passkey Wallet",
  description:
    "A complete Stellar smart-wallet experience built only with @sembol/passkey-react: create a passkey wallet, get testnet XLM, send payments, and browse history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="text-slate-900 antialiased dark:bg-[#0b1220] dark:text-slate-100">
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4">
            <Nav />
            <main className="flex-1 py-8">{children}</main>
            <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-slate-800">
              Runs on Stellar <strong>testnet</strong> · Built with{" "}
              <code>@sembol/passkey-react</code> · Smart accounts by OpenZeppelin ·{" "}
              <a
                className="underline hover:text-slate-700 dark:hover:text-slate-300"
                href="https://github.com/keyboord01/sembol"
                target="_blank"
                rel="noreferrer"
              >
                Source
              </a>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
