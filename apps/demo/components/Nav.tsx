"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton, usePasskeyWallet } from "@sembol/passkey-react";
import { LedgerReadout } from "./LedgerReadout";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/send", label: "Send" },
  { href: "/history", label: "History" },
] as const;

/** 44px status strip: wordmark, section tabs, live ledger, wallet control. */
export function Nav() {
  const pathname = usePathname();
  const { isConnected } = usePasskeyWallet();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-ink/95 backdrop-blur-sm">
      <div className="mx-auto flex h-11 w-full max-w-4xl items-center gap-5 px-5">
        <Link href="/" className="flex items-baseline gap-2">
          <span aria-hidden className="text-long">
            ✳
          </span>
          <span className="font-display text-sm font-semibold tracking-[0.18em] uppercase">
            Sembol
          </span>
          <span className="microlabel hidden text-dim md:inline">Testnet</span>
        </Link>

        {isConnected && (
          <nav className="microlabel flex items-center gap-4" aria-label="Main">
            {LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`border-b py-3 transition-colors ${
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

        <div className="ml-auto flex items-center gap-4">
          <LedgerReadout />
          <ConnectWalletButton size="sm" variant="outline" />
        </div>
      </div>
    </header>
  );
}
