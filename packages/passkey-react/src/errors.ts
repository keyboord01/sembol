import { ContractError, SmartAccountError, SmartAccountErrorCode } from "smart-account-kit";

/**
 * Normalized error codes for every failure mode a passkey wallet flow can hit.
 * Each maps to a human-friendly `userMessage` safe to render directly.
 */
export type SembolErrorCode =
  | "webauthn_unsupported"
  | "user_cancelled"
  | "credential_exists"
  | "rp_mismatch"
  | "authenticator_constraint"
  | "wallet_not_connected"
  | "wallet_not_found"
  | "session_expired"
  | "simulation_failed"
  | "submission_failed"
  | "timeout"
  | "invalid_input"
  | "already_funded"
  | "last_signer"
  | "spending_limit_exceeded"
  | "policy_not_found"
  | "recovery_needs_address"
  | "storage_error"
  | "network_error"
  | "unknown";

const USER_MESSAGES: Record<SembolErrorCode, string> = {
  webauthn_unsupported:
    "This browser doesn't support passkeys. Try a recent version of Chrome, Safari, Edge, or Firefox.",
  user_cancelled: "The passkey request was cancelled or timed out. You can try again.",
  credential_exists: "You already have a passkey for this app on this device. Try connecting instead.",
  rp_mismatch:
    "Passkeys for this app can't be used from this domain. (WebAuthn relying-party mismatch.)",
  authenticator_constraint:
    "Your authenticator can't satisfy the verification requirements (e.g. no screen lock is set up).",
  wallet_not_connected: "No wallet is connected. Connect or create a wallet first.",
  wallet_not_found:
    "No wallet exists for this passkey on this network. Create a wallet first, or pick a different passkey.",
  session_expired: "Your session expired. Please connect again.",
  simulation_failed: "The transaction could not be simulated. It would likely fail on-chain.",
  submission_failed: "The transaction could not be submitted to the network.",
  timeout: "The network request timed out. Please try again.",
  invalid_input: "Some of the provided values are invalid.",
  already_funded: "This wallet already holds the maximum testnet balance from Friendbot.",
  last_signer:
    "This is the wallet's only signer. Add another signer or recovery key before removing it.",
  spending_limit_exceeded:
    "This payment would exceed the spending limit set for this signer. Try a smaller amount or wait for the limit window to reset.",
  policy_not_found: "No policy of that type is installed on this wallet.",
  recovery_needs_address:
    "Your passkey was found, but the wallet address could not be discovered automatically. Enter the wallet address (C…) to finish recovery.",
  storage_error: "Could not read or write local wallet storage.",
  network_error: "A network error occurred. Check your connection and try again.",
  unknown: "Something went wrong. Please try again.",
};

/** Codes where retrying the same action is a reasonable user response. */
const RECOVERABLE: ReadonlySet<SembolErrorCode> = new Set([
  "user_cancelled",
  "timeout",
  "network_error",
  "submission_failed",
  "session_expired",
]);

/**
 * The error type surfaced by every Sembol hook and component.
 * `message` targets developers; `userMessage` is safe for end users.
 */
export class SembolError extends Error {
  readonly code: SembolErrorCode;
  readonly userMessage: string;
  readonly recoverable: boolean;
  override readonly cause?: unknown;

  constructor(code: SembolErrorCode, message?: string, cause?: unknown) {
    super(message ?? USER_MESSAGES[code]);
    this.name = "SembolError";
    this.code = code;
    this.userMessage = USER_MESSAGES[code];
    this.recoverable = RECOVERABLE.has(code);
    this.cause = cause;
  }
}

function fromDomExceptionName(name: string, err: unknown): SembolError | null {
  switch (name) {
    // Covers user-cancel, WebAuthn timeout, and permission-policy denial -
    // the spec intentionally collapses them into one name.
    case "NotAllowedError":
      return new SembolError("user_cancelled", "WebAuthn request not allowed (cancelled, timed out, or blocked by policy)", err);
    case "InvalidStateError":
      return new SembolError("credential_exists", "Authenticator already contains a matching credential (excludeCredentials)", err);
    case "NotSupportedError":
      return new SembolError("webauthn_unsupported", "Requested WebAuthn parameters are not supported", err);
    case "SecurityError":
      return new SembolError("rp_mismatch", "WebAuthn rpId is not valid for this origin", err);
    case "AbortError":
      return new SembolError("user_cancelled", "WebAuthn request was aborted", err);
    case "ConstraintError":
      return new SembolError("authenticator_constraint", "Authenticator cannot satisfy the requested constraints", err);
    case "TimeoutError":
      return new SembolError("timeout", "The request timed out", err);
    default:
      return null;
  }
}

/**
 * Map a decoded on-chain contract error (smart-account / policy contracts) to
 * a Sembol code. Codes from the kit's CONTRACT_ERROR_REGISTRY:
 * SmartAccount 3000-3016, WebAuthn 3110-3119, policies 32xx.
 */
function fromContractCode(code: number, err: ContractError): SembolError {
  switch (code) {
    case 3221: // SpendingLimitExceeded
      return new SembolError("spending_limit_exceeded", err.message, err);
    case 3222: // InvalidLimitOrPeriod
      return new SembolError(
        "invalid_input",
        "Spending limit and period must both be greater than zero",
        err,
      );
    case 3227: // OnlyCallContractAllowed
      return new SembolError(
        "invalid_input",
        "The spending-limit policy only applies to token-scoped (CallContract) rules",
        err,
      );
    default:
      return new SembolError(
        "submission_failed",
        `${err.contractErrorName || "Contract error"} (#${code})`,
        err,
      );
  }
}

/**
 * Extract a contract error code from a simulation diagnostic string, e.g.
 * `Error(Contract, #3221)`. Simulation failures surface these before any
 * transaction is submitted.
 */
export function contractCodeFromMessage(message: string): number | null {
  const match = /Error\(Contract, #(\d+)\)/.exec(message);
  return match ? Number(match[1]) : null;
}

function fromSmartAccountCode(err: SmartAccountError): SembolError {
  const C = SmartAccountErrorCode;
  switch (err.code) {
    case C.WEBAUTHN_NOT_SUPPORTED:
      return new SembolError("webauthn_unsupported", err.message, err);
    case C.WEBAUTHN_CANCELLED:
      return new SembolError("user_cancelled", err.message, err);
    case C.WEBAUTHN_REGISTRATION_FAILED:
    case C.WEBAUTHN_AUTHENTICATION_FAILED: {
      // The kit wraps the raw DOMException as `cause`; prefer its specificity.
      const causeName = (err.cause as { name?: string } | undefined)?.name;
      if (causeName) {
        const mapped = fromDomExceptionName(causeName, err);
        if (mapped) return mapped;
      }
      return new SembolError("user_cancelled", err.message, err);
    }
    case C.WALLET_NOT_CONNECTED:
      return new SembolError("wallet_not_connected", err.message, err);
    case C.WALLET_NOT_FOUND:
    case C.CREDENTIAL_NOT_FOUND:
    case C.SIGNER_NOT_FOUND:
      return new SembolError("wallet_not_found", err.message, err);
    case C.WALLET_ALREADY_EXISTS:
    case C.CREDENTIAL_ALREADY_EXISTS:
      return new SembolError("credential_exists", err.message, err);
    case C.CREDENTIAL_INVALID:
    case C.SIGNER_INVALID:
      return new SembolError("invalid_input", err.message, err);
    case C.TRANSACTION_SIGNING_FAILED:
      return new SembolError("submission_failed", err.message, err);
    case C.SESSION_EXPIRED:
    case C.SESSION_INVALID:
      return new SembolError("session_expired", err.message, err);
    case C.TRANSACTION_SIMULATION_FAILED:
      return new SembolError("simulation_failed", err.message, err);
    case C.TRANSACTION_SUBMISSION_FAILED:
    case C.CREDENTIAL_DEPLOYMENT_FAILED:
      return new SembolError("submission_failed", err.message, err);
    case C.TRANSACTION_TIMEOUT:
      return new SembolError("timeout", err.message, err);
    case C.INVALID_ADDRESS:
    case C.INVALID_AMOUNT:
    case C.INVALID_INPUT:
    case C.INVALID_CONFIG:
    case C.MISSING_CONFIG:
      return new SembolError("invalid_input", err.message, err);
    case C.STORAGE_READ_FAILED:
    case C.STORAGE_WRITE_FAILED:
      return new SembolError("storage_error", err.message, err);
    case C.POLICY_NOT_FOUND:
      return new SembolError("policy_not_found", err.message, err);
    default:
      return new SembolError("unknown", err.message, err);
  }
}

/**
 * Convert any thrown value (smart-account-kit errors, raw WebAuthn
 * DOMExceptions, fetch failures…) into a {@link SembolError}.
 */
export function toSembolError(err: unknown): SembolError {
  if (err instanceof SembolError) return err;

  // ContractError extends SmartAccountError - check the subclass first so
  // decoded on-chain codes (e.g. SpendingLimitExceeded) map precisely.
  if (err instanceof ContractError) return fromContractCode(err.contractCode, err);

  if (err instanceof SmartAccountError) return fromSmartAccountCode(err);

  if (typeof err === "object" && err !== null && "name" in err) {
    const name = String((err as { name: unknown }).name);
    const mapped = fromDomExceptionName(name, err);
    if (mapped) return mapped;
  }

  if (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) {
    return new SembolError("network_error", err.message, err);
  }

  // smart-account-kit throws a few plain Errors (not SmartAccountError) in
  // its connect/deploy paths - recognize them by message.
  if (err instanceof Error) {
    if (
      /not found on-chain|may not have been deployed|Could not determine (contract|credential) ID/i.test(
        err.message,
      )
    ) {
      return new SembolError("wallet_not_found", err.message, err);
    }
    if (/Failed to sign deployment transaction/i.test(err.message)) {
      return new SembolError("submission_failed", err.message, err);
    }
  }

  const message = err instanceof Error ? err.message : String(err);
  return new SembolError("unknown", message, err);
}

/**
 * Extract the credential ID embedded in smart-account-kit's
 * "contract not found on-chain for credential …" error message -
 * used to attempt indexer-based wallet discovery.
 */
export function credentialIdFromError(err: unknown): string | null {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return /for credential ([A-Za-z0-9_-]+)/.exec(message)?.[1] ?? null;
}
