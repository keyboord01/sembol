"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton, usePasskeyWallet } from "@sembol/passkey-react";
import { LedgerReadout } from "./LedgerReadout";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/send", label: "Send" },
  { href: "/security", label: "Security" },
  { href: "/history", label: "History" },
] as const;

/** 44px status strip: wordmark, section tabs, live ledger, wallet control. */
export function Nav() {
  const pathname = usePathname();
  const { isConnected } = usePasskeyWallet();
  // Connected users have no onboarding page to return to - point the wordmark
  // at the dashboard so it never bounces through a redirect.
  const home = isConnected ? "/dashboard" : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-ink/95 backdrop-blur-sm">
      <div className="mx-auto flex h-12 w-full max-w-4xl items-center gap-4 px-4 sm:gap-5 sm:px-6">
        <Link href={home} className="flex min-w-0 items-baseline gap-2">
          <span aria-hidden className="text-long">
            ✳
          </span>
          <span className="font-display text-sm font-semibold tracking-[0.18em] uppercase">
            Sembol
          </span>
        </Link>

        {isConnected && (
          <nav className="microlabel hidden items-center gap-4 md:flex" aria-label="Main">
            {LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`border-b py-3.5 transition-colors ${
                    active
                      ? "border-long text-fg"
                      : "border-transparent text-dim hover:text-fg"
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

      {/* Mobile section tabs: their own hairline row so nothing overflows */}
      {isConnected && (
        <nav
          className="microlabel grid grid-cols-4 divide-x divide-hairline border-t border-hairline text-center md:hidden"
          aria-label="Main"
        >
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`py-3 transition-colors ${
                  active ? "bg-surface text-long" : "text-dim hover:text-fg"
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
