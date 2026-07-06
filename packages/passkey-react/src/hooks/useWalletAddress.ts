import { useCallback, useEffect, useRef, useState } from "react";
import { usePasskeyWalletContext } from "../context";
import { truncateAddress } from "../format";

export interface UseWalletAddressResult {
  /** Full smart-account contract address (C…), or null when disconnected. */
  address: string | null;
  /** Credential ID of the connected passkey. */
  credentialId: string | null;
  /** Truncated display form, e.g. `CDLZ…YSC`. */
  displayAddress: string | null;
  /** stellar.expert link for the contract, when the network has an explorer. */
  explorerUrl: string | null;
  /** Copy the address to the clipboard. Resolves false when unavailable. */
  copy: () => Promise<boolean>;
  /** True for ~2s after a successful copy - drive "Copied!" affordances. */
  copied: boolean;
}

/** Address display helpers for the connected wallet. */
export function useWalletAddress(options?: { truncate?: { start: number; end: number } }): UseWalletAddressResult {
  const { address, credentialId, config } = usePasskeyWalletContext();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    if (!address || typeof navigator === "undefined" || !navigator.clipboard) return false;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false;
    }
  }, [address]);

  const start = options?.truncate?.start ?? 4;
  const end = options?.truncate?.end ?? 4;

  return {
    address,
    credentialId,
    displayAddress: address ? truncateAddress(address, start, end) : null,
    explorerUrl: address && config.explorerBaseUrl ? `${config.explorerBaseUrl}/contract/${address}` : null,
    copy,
    copied,
  };
}
