"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton, usePasskeyWallet } from "@sembol/passkey-react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/send", label: "Send" },
  { href: "/history", label: "History" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const { isConnected } = usePasskeyWallet();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 py-4 dark:border-slate-800">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-indigo-600 dark:text-indigo-400">✳</span> Sembol
        </Link>
        {isConnected && (
          <nav className="flex gap-1 text-sm" aria-label="Main">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  pathname === href
                    ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <ConnectWalletButton />
    </header>
  );
}
