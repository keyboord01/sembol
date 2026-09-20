import { useState } from "react";
import type { SembolError } from "../errors";
import { formatContextType } from "smart-account-kit";
import { truncateAddress } from "../format";
import { useAgentPermission, type AgentGrant } from "../hooks/useAgentPermission";
import { buttonClasses, cx, ErrorToast, Spinner } from "../internal/ui";

export interface AgentPermissionsProps {
  /** Hide the revoke controls. */
  readOnly?: boolean;
  className?: string;
  /** Drop all built-in `sembol-*` classes and style from scratch. */
  unstyled?: boolean;
  onRevoked?: (grant: AgentGrant, hash: string) => void;
  onError?: (error: SembolError) => void;
}

function ledgersLeftLabel(grant: AgentGrant): string {
  if (grant.validUntil === null) return "never expires";
  if (grant.ledgersLeft === null) return `until ledger ${grant.validUntil}`;
  if (grant.ledgersLeft === 0) return "expired";
  const seconds = grant.ledgersLeft * 5;
  if (seconds < 3600) return `~${Math.max(1, Math.round(seconds / 60))} min left`;
  if (seconds < 86400 * 2) return `~${Math.round(seconds / 3600)} h left`;
  return `~${Math.round(seconds / 86400)} d left`;
}

/**
 * Every agent grant on the account: which key, which policies, how long, and a two-step revoke.
 * A grant without a policy is flagged; it is the one thing an adopter should never ship.
 */
export function AgentPermissions({ readOnly, className, unstyled, onRevoked, onError }: AgentPermissionsProps) {
  const { grants, isLoading, revoke, status, error, reset } = useAgentPermission();
  const [confirming, setConfirming] = useState<number | null>(null);
  const busy = status === "signing" || status === "submitting";

  const handleRevoke = async (grant: AgentGrant) => {
    setConfirming(null);
    try {
      const { hash } = await revoke(grant.ruleId);
      onRevoked?.(grant, hash);
    } catch (err) {
      onError?.(err as SembolError);
    }
  };

  return (
    <div className={unstyled ? className : cx("sembol-agents", className)}>
      {isLoading && grants.length === 0 && (
        <p className={unstyled ? undefined : "sembol-agents__state"} role="status">
          <Spinner /> Reading agent permissions…
        </p>
      )}
      {!isLoading && grants.length === 0 && (
        <p className={unstyled ? undefined : "sembol-agents__state"}>No agent has access to this wallet.</p>
      )}
      {grants.length > 0 && (
        <ul className={unstyled ? undefined : "sembol-agents__list"}>
          {grants.map((grant) => (
            <li key={grant.ruleId} className={unstyled ? undefined : "sembol-agents__item"}>
              <div className={unstyled ? undefined : "sembol-agents__main"}>
                <span className={unstyled ? undefined : "sembol-agents__name"}>{grant.name}</span>
                <span className={unstyled ? undefined : "sembol-agents__meta"}>
                  {grant.agentPublicKeys.map((k) => truncateAddress(k, 6)).join(", ")} · {formatContextType(grant.contextType)} ·{" "}
                  {ledgersLeftLabel(grant)}
                </span>
                <span className={unstyled ? undefined : "sembol-agents__meta"}>
                  {grant.unrestricted ? (
                    <span className={unstyled ? undefined : "sembol-agent__danger"}>no policy: unrestricted</span>
                  ) : (
                    `policy ${grant.policies.map((p) => truncateAddress(p, 6)).join(", ")}`
                  )}
                </span>
              </div>
              {!readOnly &&
                (confirming === grant.ruleId ? (
                  <div className={unstyled ? undefined : "sembol-agents__actions"}>
                    <button
                      type="button"
                      className={unstyled ? undefined : buttonClasses("destructive", "sm")}
                      onClick={() => void handleRevoke(grant)}
                      disabled={busy}
                    >
                      Confirm revoke
                    </button>
                    <button
                      type="button"
                      className={unstyled ? undefined : buttonClasses("ghost", "sm")}
                      onClick={() => setConfirming(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={unstyled ? undefined : buttonClasses("ghost", "sm")}
                    onClick={() => setConfirming(grant.ruleId)}
                    disabled={busy}
                    aria-label={`Revoke ${grant.name}`}
                  >
                    {busy && <Spinner />}
                    <span>Revoke</span>
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
      <ErrorToast error={busy ? null : error} onDismiss={reset} unstyled={unstyled} />
    </div>
  );
}
