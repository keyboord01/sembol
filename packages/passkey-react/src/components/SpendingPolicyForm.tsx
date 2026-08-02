import { useEffect, useId, useState } from "react";
import type { SembolError } from "../errors";
import { useSpendingPolicy } from "../hooks/useSpendingPolicy";
import { formatTokenAmount } from "../format";
import { buttonClasses, cx, ErrorToast, Spinner } from "../internal/ui";
import type { TokenRef } from "../types";

export interface SpendingPolicyFormProps {
  /** Token the limit applies to. @default "native" (XLM) */
  token?: TokenRef;
  /** Symbol shown next to amounts. @default "XLM" */
  tokenSymbol?: string;
  className?: string;
  /** Drop all built-in `sembol-*` classes and style from scratch. */
  unstyled?: boolean;
  onChanged?: () => void;
  onError?: (error: SembolError) => void;
}

const PERIOD_CHOICES = [
  { value: "hour", label: "per hour", period: { hours: 1 } },
  { value: "day", label: "per day", period: { days: 1 } },
  { value: "week", label: "per week", period: { weeks: 1 } },
] as const;

/**
 * Read and manage the wallet's spending limit for a token.
 *
 * The limit lives in a token-scoped context rule carrying the deployed
 * spending-limit policy. It enforces on transfers sent as direct token
 * invocations (Sembol's send path).
 */
export function SpendingPolicyForm({
  token = "native",
  tokenSymbol = "XLM",
  className,
  unstyled,
  onChanged,
  onError,
}: SpendingPolicyFormProps) {
  const { policy, isLoading, setLimit, removeLimit, status, error, reset } =
    useSpendingPolicy(token);
  const [amount, setAmount] = useState("");
  const [periodValue, setPeriodValue] = useState<(typeof PERIOD_CHOICES)[number]["value"]>("day");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const amountId = useId();
  const periodId = useId();

  const busy = status === "signing" || status === "submitting";

  // Prefill the form from the on-chain state once it loads.
  useEffect(() => {
    if (!policy) return;
    setAmount(formatTokenAmount(policy.limit, 7));
    const match = PERIOD_CHOICES.find(
      (choice) => choice.label === `per ${policy.periodLabel.replace(/^~1 /, "")}`,
    );
    if (match) setPeriodValue(match.value);
  }, [policy]);

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (busy) return;
    const choice = PERIOD_CHOICES.find((candidate) => candidate.value === periodValue);
    try {
      await setLimit({ limit: amount, period: choice?.period ?? { days: 1 } });
      onChanged?.();
    } catch (err) {
      onError?.(err as SembolError);
    }
  };

  const handleRemove = async () => {
    setConfirmRemove(false);
    try {
      await removeLimit();
      setAmount("");
      onChanged?.();
    } catch (err) {
      onError?.(err as SembolError);
    }
  };

  const spentPct =
    policy && policy.limit > 0n ? Number((policy.spent * 100n) / policy.limit) : 0;

  return (
    <div className={unstyled ? className : cx("sembol-policy", className)}>
      {isLoading && !policy && (
        <p className={unstyled ? undefined : "sembol-policy__state"} role="status">
          <Spinner /> Reading spending limit…
        </p>
      )}

      {policy && (
        <div className={unstyled ? undefined : "sembol-policy__current"}>
          <p className={unstyled ? undefined : "sembol-policy__headline"}>
            {formatTokenAmount(policy.limit, 7)} {tokenSymbol}{" "}
            <span className={unstyled ? undefined : "sembol-policy__period"}>{policy.periodLabel}</span>
          </p>
          <div
            className={unstyled ? undefined : "sembol-policy__meter"}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(spentPct, 100)}
            aria-label="Spent this period"
          >
            <span
              className={unstyled ? undefined : "sembol-policy__meter-fill"}
              style={{ width: `${Math.min(spentPct, 100)}%` }}
            />
          </div>
          <p className={unstyled ? undefined : "sembol-policy__usage"}>
            Spent {formatTokenAmount(policy.spent, 7)} · {formatTokenAmount(policy.remaining, 7)}{" "}
            {tokenSymbol} remaining this window
          </p>
        </div>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className={unstyled ? undefined : "sembol-policy__form"}>
        <div className={unstyled ? undefined : "sembol-policy__field"}>
          <label htmlFor={amountId}>Limit ({tokenSymbol})</label>
          <input
            id={amountId}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="25"
            autoComplete="off"
            required
          />
        </div>
        <div className={unstyled ? undefined : "sembol-policy__field"}>
          <label htmlFor={periodId}>Window</label>
          <select
            id={periodId}
            value={periodValue}
            onChange={(event) =>
              setPeriodValue(event.target.value as (typeof PERIOD_CHOICES)[number]["value"])
            }
          >
            {PERIOD_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </div>
        <div className={unstyled ? undefined : "sembol-policy__row"}>
          <button
            type="submit"
            className={unstyled ? undefined : buttonClasses("primary", "sm")}
            disabled={busy}
            data-loading={busy || undefined}
          >
            {busy && <Spinner />}
            <span>
              {status === "signing"
                ? "Approve with your passkey…"
                : status === "submitting"
                  ? "Updating on-chain…"
                  : policy
                    ? "Update limit"
                    : "Set limit"}
            </span>
          </button>
          {policy &&
            (confirmRemove ? (
              <>
                <button
                  type="button"
                  className={unstyled ? undefined : buttonClasses("destructive", "sm")}
                  onClick={() => void handleRemove()}
                  disabled={busy}
                >
                  Confirm remove
                </button>
                <button
                  type="button"
                  className={unstyled ? undefined : buttonClasses("ghost", "sm")}
                  onClick={() => setConfirmRemove(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className={unstyled ? undefined : buttonClasses("ghost", "sm")}
                onClick={() => setConfirmRemove(true)}
                disabled={busy}
              >
                Remove limit
              </button>
            ))}
        </div>
      </form>

      <p className={unstyled ? undefined : "sembol-policy__note"}>
        Limits apply to payments sent through this app. A period change re-installs the policy and
        asks for two approvals.
      </p>

      <ErrorToast error={busy ? null : error} onDismiss={reset} unstyled={unstyled} />
    </div>
  );
}
