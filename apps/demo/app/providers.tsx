"use client";

import { useEffect } from "react";
import { PasskeyWalletProvider, usePasskeyWallet } from "@sembol/passkey-react";
import { sembolConfig } from "../lib/config";

/** Exposes the kit for debugging/E2E (window.__sembolKit). */
function KitBridge() {
  const { kit } = usePasskeyWallet();
  useEffect(() => {
    (window as unknown as { __sembolKit?: unknown }).__sembolKit = kit;
  }, [kit]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PasskeyWalletProvider config={sembolConfig}>
      <KitBridge />
      {children}
    </PasskeyWalletProvider>
  );
}
