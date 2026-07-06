"use client";

import Link from "next/link";
import { usePasskeyWallet } from "@sembol/passkey-react";

/** Gate for wallet-only pages: shows a friendly prompt while disconnected. */
export function RequireWallet({ children }: { children: React.ReactNode }) {
  const { status, isConnected } = usePasskeyWallet();

  if (status === "initializing") {
    return (
      <p className="microlabel py-24 text-center text-dim" role="status">
        Restoring session…
      </p>
    );
  }

  if (!isConnected) {
    return (
      <div className="border border-hairline px-6 py-16 text-center">
        <p className="microlabel text-dim">No wallet connected</p>
        <p className="mt-3 text-sm text-dim">
          Use <em className="text-fg not-italic">Connect wallet</em> in the top right, or{" "}
          <Link href="/" className="text-long underline underline-offset-4">
            create a new wallet
          </Link>
          .
        </p>
        <p className="microlabel mx-auto mt-6 max-w-md text-dim/70">
          Passkeys are per-domain - a wallet created on localhost or another site won't appear
          here.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
