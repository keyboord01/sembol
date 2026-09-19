import { useState } from "react";
import type { SembolError } from "../errors";
import { truncateAddress } from "../format";
import { useAgentPermission, type GrantAgentParams } from "../hooks/useAgentPermission";
import { describeLedgerPeriod, periodToLedgers } from "../internal/policy";
import { buttonClasses, cx, ErrorToast, Spinner } from "../internal/ui";

export interface GrantAgentAccessProps extends GrantAgentParams {
  /** What the agent will be allowed to do, in the adopter's words. One line per entry. */
  summary?: string[];
  /** Human name for the agent shown in the summary. @default "the agent" */
  agentLabel?: string;
  label?: string;
  className?: string;
  /** Drop all built-in `sembol-*` classes and style from scratch. */
  unstyled?: boolean;
  onGranted?: (result: { ruleId: number; hash: string }) => void;
  onError?: (error: SembolError) => void;
}

/**
 * One-screen consent: what the agent may do, for how long, under which on-chain policies, and a single passkey
 * confirmation. The agent's secret never enters the app; only its public key does.
 */
export function GrantAgentAccess({
  summary,
  agentLabel = "the agent",
  label,
  className,
  unstyled,
  onGranted,
  onError,
  ...params
}: GrantAgentAccessProps) {
  const { grant, status, error, reset } = useAgentPermission();
  const [done, setDone] = useState<{ ruleId: number; hash: string } | null>(null);
  const busy = status === "signing" || status === "submitting";
  const validity =
    params.validUntilLedger !== undefined
      ? `until ledger ${params.validUntilLedger}`
      : `for ${describeLedgerPeriod(periodToLedgers(params.validFor ?? { days: 1 })).replace(/^~/, "about ")}`;
  const key = typeof params.agentPublicKey === "string" ? params.agentPublicKey : "(raw key)";
  const policies = [...params.policies.keys()];

  const handleGrant = async () => {
    if (busy) return;
    try {
      const result = await grant(params);
      setDone(result);
      onGranted?.(result);
    } catch (err) {
      onError?.(err as SembolError);
    }
  };

  return (
    <div className={unstyled ? className : cx("sembol-agent", className)}>
      <p className={unstyled ? undefined : "sembol-agent__headline"}>
        Allow {agentLabel} to act on this wallet {validity}
      </p>
      <dl className={unstyled ? undefined : "sembol-agent__facts"}>
        <dt>Agent key</dt>
        <dd className={unstyled ? undefined : "sembol-agent__mono"} title={key}>
          {key.startsWith("G") ? truncateAddress(key, 6) : key}
        </dd>
        <dt>Enforced by</dt>
        <dd className={unstyled ? undefined : "sembol-agent__mono"}>
          {policies.length === 0 ? (
            <span className={unstyled ? undefined : "sembol-agent__danger"}>no policy: full account access</span>
          ) : (
            policies.map((p) => truncateAddress(p, 6)).join(", ")
          )}
        </dd>
      </dl>
      {summary && summary.length > 0 && (
        <ul className={unstyled ? undefined : "sembol-agent__summary"}>
          {summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <div className={unstyled ? undefined : "sembol-agent__row"}>
        <button
          type="button"
          className={unstyled ? undefined : buttonClasses("primary", "sm")}
          onClick={() => void handleGrant()}
          disabled={busy || done !== null}
          data-loading={busy || undefined}
        >
          {busy && <Spinner />}
          <span>
            {status === "signing"
              ? "Approve with your passkey…"
              : status === "submitting"
                ? "Granting on-chain…"
                : done
                  ? `Granted (rule ${done.ruleId})`
                  : (label ?? "Grant access")}
          </span>
        </button>
      </div>
      <p className={unstyled ? undefined : "sembol-agent__note"}>
        The policy runs on-chain for every call the agent makes; anything outside it is rejected by the account
        itself. You can revoke at any time.
      </p>
      <ErrorToast error={busy ? null : error} onDismiss={reset} unstyled={unstyled} />
    </div>
  );
}
