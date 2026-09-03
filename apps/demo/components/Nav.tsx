"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton, usePasskeyWallet } from "@sembol/passkey-react";
import { SembolLogo } from "./Brand";
import { LedgerReadout } from "./LedgerReadout";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/send", label: "Send" },
  { href: "/security", label: "Security" },
  { href: "/history", label: "History" },
] as const;

/** Wallet-app top bar: logo, section tabs, live ledger, wallet control. */
export function Nav() {
  const pathname = usePathname();
  const { isConnected } = usePasskeyWallet();
  // Connected users land on the dashboard; everyone else goes to the landing page.
  const home = isConnected ? "/dashboard" : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-hairline/70 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center gap-5 px-5 sm:px-6">
        <Link href={home} aria-label="Sembol home" className="shrink-0">
          <SembolLogo markSize={22} />
        </Link>

        {isConnected && (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-gold/12 font-medium text-gold"
                      : "text-dim hover:bg-raised hover:text-fg"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex min-w-0 items-center gap-3 sm:gap-4">
          <LedgerReadout />
          <ConnectWalletButton size="sm" variant="outline" />
        </div>
      </div>

      {/* Mobile section tabs: their own row so nothing overflows */}
      {isConnected && (
        <nav
          className="grid grid-cols-4 border-t border-hairline/70 text-center md:hidden"
          aria-label="Main"
        >
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`border-b-2 py-2.5 text-[13px] transition-colors ${
                  active
                    ? "border-gold font-medium text-gold"
                    : "border-transparent text-dim hover:text-fg"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
