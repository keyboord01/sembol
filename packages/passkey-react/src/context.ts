import { createContext, useContext } from "react";
import type { PasskeyWalletContextValue } from "./types";

export const PasskeyWalletContext = createContext<PasskeyWalletContextValue | null>(null);

/**
 * Internal accessor for the Sembol context. Throws a descriptive error when
 * used outside a `<PasskeyWalletProvider />`.
 */
export function usePasskeyWalletContext(): PasskeyWalletContextValue {
  const ctx = useContext(PasskeyWalletContext);
  if (!ctx) {
    throw new Error(
      "Sembol hooks and components must be used inside <PasskeyWalletProvider />. " +
        "Wrap your app (or the relevant subtree) with the provider and pass a config.",
    );
  }
  return ctx;
}
