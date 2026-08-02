import {
  getCredentialIdFromSigner,
  LEDGERS_PER_DAY,
  LEDGERS_PER_HOUR,
  LEDGERS_PER_WEEK,
  type ContextRule,
  type SmartAccountKit,
} from "smart-account-kit";

/** Human-friendly period input; exactly one field should be set. */
export interface PolicyPeriod {
  hours?: number;
  days?: number;
  weeks?: number;
  /** Raw ledger count (~5s per ledger) for full control. */
  ledgers?: number;
}

/** Convert a {@link PolicyPeriod} to the contract's ledger-window unit. */
export function periodToLedgers(period: PolicyPeriod): number {
  if (period.ledgers !== undefined) return Math.floor(period.ledgers);
  if (period.hours !== undefined) return Math.floor(period.hours * LEDGERS_PER_HOUR);
  if (period.days !== undefined) return Math.floor(period.days * LEDGERS_PER_DAY);
  if (period.weeks !== undefined) return Math.floor(period.weeks * LEDGERS_PER_WEEK);
  return LEDGERS_PER_DAY;
}

/** Describe a ledger window in the closest human unit ("~1 day"). */
export function describeLedgerPeriod(ledgers: number): string {
  if (ledgers >= LEDGERS_PER_WEEK && ledgers % LEDGERS_PER_WEEK === 0) {
    const weeks = ledgers / LEDGERS_PER_WEEK;
    return weeks === 1 ? "~1 week" : `~${weeks} weeks`;
  }
  if (ledgers >= LEDGERS_PER_DAY && ledgers % LEDGERS_PER_DAY === 0) {
    const days = ledgers / LEDGERS_PER_DAY;
    return days === 1 ? "~1 day" : `~${days} days`;
  }
  const hours = Math.round((ledgers / LEDGERS_PER_HOUR) * 10) / 10;
  return hours === 1 ? "~1 hour" : `~${hours} hours`;
}

/**
 * Find the spending-limit rule for a token: a `CallContract(token)` rule that
 * carries the configured spending-limit policy. Prefers a rule containing the
 * active credential's signer, then the lowest rule id.
 */
export function findSpendingPolicyRule(
  rules: ContextRule[],
  tokenContract: string,
  policyAddress: string,
  activeCredentialId: string | null,
): ContextRule | null {
  const candidates = rules.filter(
    (rule) =>
      rule.context_type.tag === "CallContract" &&
      rule.context_type.values[0] === tokenContract &&
      rule.policies.includes(policyAddress),
  );
  if (candidates.length === 0) return null;
  if (activeCredentialId) {
    const withActive = candidates.find((rule) =>
      rule.signers.some((signer) => getCredentialIdFromSigner(signer) === activeCredentialId),
    );
    if (withActive) return withActive;
  }
  return candidates.reduce((lowest, rule) => (rule.id < lowest.id ? rule : lowest));
}

/**
 * Rule id to pin at signing time so a policy-bearing token-scoped rule is the
 * one the account enforces.
 *
 * Published 0.4.2 auto-resolution has no scoped-over-Default preference: with
 * a policy rule and the Default rule both matching a transfer, it can bind the
 * Default rule (silently bypassing the policy) or throw on ambiguity. Sembol
 * transfers are built as direct token invocations, so pinning the scoped rule
 * makes the spending limit actually enforce.
 *
 * Returns null when the wallet has no policy rule for this token + signer -
 * callers then let the kit's default resolution run.
 */
export async function findEnforcedRuleId(
  kit: SmartAccountKit,
  tokenContract: string,
  policyAddress: string | undefined,
  activeCredentialId: string | null,
): Promise<number | null> {
  if (!policyAddress) return null;
  try {
    const rules = await kit.rules.list();
    const rule = findSpendingPolicyRule(rules, tokenContract, policyAddress, activeCredentialId);
    if (!rule) return null;
    // Only pin rules the active signer can actually satisfy.
    if (
      activeCredentialId &&
      !rule.signers.some((signer) => getCredentialIdFromSigner(signer) === activeCredentialId)
    ) {
      return null;
    }
    return rule.id;
  } catch {
    // Rule discovery is best-effort; a transient indexer failure must not
    // block sending. (The account still enforces whatever rule is bound.)
    return null;
  }
}
