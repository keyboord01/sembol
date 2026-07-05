import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePasskeyWalletContext } from "../context";
import { toSembolError, type SembolError } from "../errors";
import { formatTokenAmount } from "../format";
import { readAssetBalance, readTokenBalance, readTokenMeta } from "../internal/balance";
import { resolveToken } from "../internal/tokens";
import type { TokenRef } from "../types";

export type BalanceStatus = "idle" | "loading" | "success" | "error";

export interface UseWalletBalanceOptions {
  /** Token to read. @default "native" (XLM) */
  token?: TokenRef;
  /** Read the balance of a different address than the connected wallet. */
  address?: string;
  /** Poll every N milliseconds. Disabled by default. */
  refreshInterval?: number;
  /** Set false to pause fetching. @default true */
  enabled?: boolean;
}

export interface UseWalletBalanceResult {
  /** Raw integer amount (e.g. stroops), or null before the first read. */
  raw: bigint | null;
  /** Human-formatted amount, e.g. `"12.5"`. */
  formatted: string | null;
  decimals: number | null;
  symbol: string | null;
  status: BalanceStatus;
  error: SembolError | null;
  /** True while a refresh is in flight after data has already loaded. */
  isRefreshing: boolean;
  refetch: () => Promise<void>;
}

/**
 * Live token balance for the connected wallet (or any address).
 * Automatically refreshes after every transaction submitted through the kit.
 */
export function useWalletBalance(options?: UseWalletBalanceOptions): UseWalletBalanceResult {
  const { kit, address: connectedAddress, config, txEpoch } = usePasskeyWalletContext();
  const token = options?.token ?? "native";
  const enabled = options?.enabled ?? true;
  const target = options?.address ?? connectedAddress;

  const resolved = useMemo(() => resolveToken(token, config), [
    // resolveToken is pure; key captures the token identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    typeof token === "string" ? token : JSON.stringify(token),
    config,
  ]);

  const [raw, setRaw] = useState<bigint | null>(null);
  const [decimals, setDecimals] = useState<number | null>(resolved.decimals);
  const [symbol, setSymbol] = useState<string | null>(resolved.symbol);
  const [status, setStatus] = useState<BalanceStatus>("idle");
  const [error, setError] = useState<SembolError | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const generation = useRef(0);

  const fetchBalance = useCallback(async () => {
    if (!kit || !target || !enabled) return;
    const requestId = ++generation.current;
    setIsRefreshing(true);
    setStatus((s) => (s === "success" ? s : "loading"));
    try {
      let amount: bigint;
      let meta = { decimals: resolved.decimals ?? 7, symbol: resolved.symbol ?? "" };

      if (resolved.asset) {
        amount = await readAssetBalance(kit.rpc, config.networkPassphrase, resolved.asset, target);
      } else {
        [amount, meta] = await Promise.all([
          readTokenBalance(
            kit.rpc,
            config.networkPassphrase,
            kit.deployerPublicKey,
            resolved.contractId,
            target,
          ),
          readTokenMeta(
            kit.rpc,
            config.networkPassphrase,
            kit.deployerPublicKey,
            resolved.contractId,
          ),
        ]);
      }

      if (generation.current !== requestId) return; // superseded
      setRaw(amount);
      setDecimals(meta.decimals);
      setSymbol(meta.symbol);
      setError(null);
      setStatus("success");
    } catch (err) {
      if (generation.current !== requestId) return;
      setError(toSembolError(err));
      setStatus("error");
    } finally {
      if (generation.current === requestId) setIsRefreshing(false);
    }
  }, [kit, target, enabled, resolved, config.networkPassphrase]);

  // Initial fetch + refetch on connection, token change, or any submitted tx.
  useEffect(() => {
    if (!kit || !target || !enabled) {
      setStatus("idle");
      setRaw(null);
      return;
    }
    void fetchBalance();
  }, [kit, target, enabled, fetchBalance, txEpoch]);

  // Optional polling.
  useEffect(() => {
    const interval = options?.refreshInterval;
    if (!interval || interval <= 0 || !enabled || !target) return;
    const id = setInterval(() => void fetchBalance(), interval);
    return () => clearInterval(id);
  }, [options?.refreshInterval, enabled, target, fetchBalance]);

  return {
    raw,
    formatted: raw !== null && decimals !== null ? formatTokenAmount(raw, decimals) : null,
    decimals,
    symbol,
    status,
    error,
    isRefreshing,
    refetch: fetchBalance,
  };
}
