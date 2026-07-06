import { useWalletBalance, type UseWalletBalanceOptions } from "../hooks/useWalletBalance";
import { cx } from "../internal/ui";

export interface WalletBalanceProps extends UseWalletBalanceOptions {
  className?: string;
  /** Drop all built-in `sembol-*` classes and style from scratch. */
  unstyled?: boolean;
  /** Show the manual refresh button. @default true */
  showRefresh?: boolean;
}

/**
 * Token balance for the connected wallet: loading skeleton, error state,
 * auto-refresh after transactions, optional manual refresh.
 */
export function WalletBalance({
  className,
  unstyled,
  showRefresh = true,
  ...balanceOptions
}: WalletBalanceProps) {
  const { formatted, symbol, status, error, isRefreshing, refetch } =
    useWalletBalance(balanceOptions);

  return (
    <span
      className={unstyled ? className : cx("sembol-balance", className)}
      data-status={status}
      aria-live="polite"
    >
      {status === "loading" && (
        <span className={unstyled ? undefined : "sembol-skeleton"} role="status">
          <span className={unstyled ? undefined : "sembol-visually-hidden"}>Loading balance…</span>
        </span>
      )}
      {status === "error" && (
        <span
          className={unstyled ? undefined : "sembol-balance__error"}
          title={error?.userMessage}
          role="img"
          aria-label={`Balance unavailable: ${error?.userMessage ?? "unknown error"}`}
        >
          —
        </span>
      )}
      {status === "idle" && <span className={unstyled ? undefined : "sembol-balance__value"}>–</span>}
      {status === "success" && (
        <>
          <span className={unstyled ? undefined : "sembol-balance__value"}>{formatted}</span>
          {symbol && <span className={unstyled ? undefined : "sembol-balance__symbol"}>{symbol}</span>}
        </>
      )}
      {showRefresh && status !== "idle" && (
        <button
          type="button"
          className={unstyled ? undefined : "sembol-icon-btn"}
          onClick={() => void refetch()}
          disabled={isRefreshing}
          data-spinning={isRefreshing || undefined}
          aria-label="Refresh balance"
          title="Refresh balance"
        >
          ↻
        </button>
      )}
    </span>
  );
}
