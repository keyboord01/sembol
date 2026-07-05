"use client";

import { PasskeyWalletProvider } from "@sembol/passkey-react";
import { sembolConfig } from "../lib/config";

export function Providers({ children }: { children: React.ReactNode }) {
  return <PasskeyWalletProvider config={sembolConfig}>{children}</PasskeyWalletProvider>;
}
