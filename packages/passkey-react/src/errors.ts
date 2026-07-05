import { SmartAccountError, SmartAccountErrorCode } from "smart-account-kit";

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
  wallet_not_found: "No wallet was found for this passkey.",
  session_expired: "Your session expired. Please connect again.",
  simulation_failed: "The transaction could not be simulated. It would likely fail on-chain.",
  submission_failed: "The transaction could not be submitted to the network.",
  timeout: "The network request timed out. Please try again.",
  invalid_input: "Some of the provided values are invalid.",
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
    // Covers user-cancel, WebAuthn timeout, and permission-policy denial —
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
      return new SembolError("wallet_not_found", err.message, err);
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

  if (err instanceof SmartAccountError) return fromSmartAccountCode(err);

  if (typeof err === "object" && err !== null && "name" in err) {
    const name = String((err as { name: unknown }).name);
    const mapped = fromDomExceptionName(name, err);
    if (mapped) return mapped;
  }

  if (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) {
    return new SembolError("network_error", err.message, err);
  }

  const message = err instanceof Error ? err.message : String(err);
  return new SembolError("unknown", message, err);
}
