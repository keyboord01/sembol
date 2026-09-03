"use client";

import Link from "next/link";
import { usePasskeyWallet } from "@sembol/passkey-react";
import { SembolMark } from "./Brand";

/** Gate for wallet-only pages: shows a friendly prompt while disconnected. */
export function RequireWallet({ children }: { children: React.ReactNode }) {
  const { status, isConnected } = usePasskeyWallet();

  if (status === "initializing") {
    return (
      <p className="py-24 text-center text-sm text-dim" role="status">
        Restoring session…
      </p>
    );
  }

  if (!isConnected) {
    return (
      <div className="card mx-auto flex max-w-lg flex-col items-center px-6 py-14 text-center">
        <SembolMark size={34} className="text-gold/60" title="" />
        <p className="mt-5 font-semibold">No wallet connected</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-dim">
          Use <span className="font-medium text-fg">Connect</span> in the top right, or create
          a new wallet in half a minute.
        </p>
        <Link href="/wallet" className="btn-gold mt-6 h-11 px-6 text-sm">
          Create a wallet
        </Link>
        <p className="mx-auto mt-6 max-w-sm text-xs leading-relaxed text-faint">
          Passkeys are per-domain. A wallet created on localhost or another site won&apos;t
          appear here.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
