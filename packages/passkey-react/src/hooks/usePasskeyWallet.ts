import { usePasskeyWalletContext } from "../context";
import type { PasskeyWalletContextValue } from "../types";

/**
 * Primary hook: connection state, the underlying smart-account-kit instance,
 * and wallet lifecycle actions (`connect`, `createWallet`, `disconnect`, `fund`).
 *
 * @example
 * ```tsx
 * const { status, address, connect, disconnect } = usePasskeyWallet();
 * ```
 */
export function usePasskeyWallet(): PasskeyWalletContextValue {
  return usePasskeyWalletContext();
}
