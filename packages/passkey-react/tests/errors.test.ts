import { describe, expect, it } from "vitest";
import {
  SmartAccountError,
  SmartAccountErrorCode,
  WebAuthnError,
  WalletNotConnectedError,
  SimulationError,
} from "smart-account-kit";
import { SembolError, toSembolError } from "../src/errors";

function domException(name: string): Error {
  const err = new Error(`fake ${name}`);
  err.name = name;
  return err;
}

describe("toSembolError", () => {
  it("passes through existing SembolErrors", () => {
    const original = new SembolError("timeout");
    expect(toSembolError(original)).toBe(original);
  });

  it.each([
    ["NotAllowedError", "user_cancelled"],
    ["InvalidStateError", "credential_exists"],
    ["NotSupportedError", "webauthn_unsupported"],
    ["SecurityError", "rp_mismatch"],
    ["AbortError", "user_cancelled"],
    ["ConstraintError", "authenticator_constraint"],
    ["TimeoutError", "timeout"],
  ] as const)("maps DOMException %s → %s", (name, code) => {
    const mapped = toSembolError(domException(name));
    expect(mapped.code).toBe(code);
    expect(mapped.userMessage).toBeTruthy();
  });

  it("maps WEBAUTHN_CANCELLED to user_cancelled", () => {
    const err = new WebAuthnError("cancelled", SmartAccountErrorCode.WEBAUTHN_CANCELLED);
    expect(toSembolError(err).code).toBe("user_cancelled");
  });

  it("prefers the DOMException cause inside WebAuthn failures", () => {
    const err = new WebAuthnError(
      "registration failed",
      SmartAccountErrorCode.WEBAUTHN_REGISTRATION_FAILED,
      domException("InvalidStateError"),
    );
    expect(toSembolError(err).code).toBe("credential_exists");
  });

  it("maps wallet/session/simulation kit errors", () => {
    expect(toSembolError(new WalletNotConnectedError("transfer")).code).toBe("wallet_not_connected");
    expect(toSembolError(new SimulationError("sim failed")).code).toBe("simulation_failed");
    expect(
      toSembolError(new SmartAccountError("expired", SmartAccountErrorCode.SESSION_EXPIRED)).code,
    ).toBe("session_expired");
    expect(
      toSembolError(new SmartAccountError("bad addr", SmartAccountErrorCode.INVALID_ADDRESS)).code,
    ).toBe("invalid_input");
    expect(
      toSembolError(new SmartAccountError("submit", SmartAccountErrorCode.TRANSACTION_SUBMISSION_FAILED))
        .code,
    ).toBe("submission_failed");
  });

  it("falls back to unknown for arbitrary values", () => {
    expect(toSembolError(new Error("boom")).code).toBe("unknown");
    expect(toSembolError("boom").code).toBe("unknown");
    expect(toSembolError(undefined).code).toBe("unknown");
  });

  it("marks cancellations recoverable but unsupported browsers not", () => {
    expect(toSembolError(domException("NotAllowedError")).recoverable).toBe(true);
    expect(toSembolError(domException("NotSupportedError")).recoverable).toBe(false);
  });
});
