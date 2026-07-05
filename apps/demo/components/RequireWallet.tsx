"use client";

import Link from "next/link";
import { usePasskeyWallet } from "@sembol/passkey-react";

/** Gate for wallet-only pages: shows a friendly prompt while disconnected. */
export function RequireWallet({ children }: { children: React.ReactNode }) {
  const { status, isConnected } = usePasskeyWallet();

  if (status === "initializing") {
    return (
      <p className="py-16 text-center text-sm text-slate-500" role="status">
        Restoring your session…
      </p>
    );
  }

  if (!isConnected) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold">No wallet connected</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Use <em>Connect wallet</em> in the top right, or{" "}
          <Link href="/" className="text-indigo-600 underline dark:text-indigo-400">
            create a new wallet
          </Link>
          .
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
