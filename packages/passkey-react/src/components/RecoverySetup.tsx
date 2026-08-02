import { useId, useState } from "react";
import type { SembolError } from "../errors";
import { useRecovery, type RecoverOutcome } from "../hooks/useRecovery";
import { useWalletAddress } from "../hooks/useWalletAddress";
import { buttonClasses, cx, ErrorToast, Spinner } from "../internal/ui";
import { truncateAddress } from "../format";

export interface RecoverySetupProps {
  /**
   * `"setup"` (default): enroll a recovery credential on the connected wallet.
   * `"recover"`: reconnect with an enrolled credential on a fresh browser.
   */
  mode?: "setup" | "recover";
  className?: string;
  /** Drop all built-in `sembol-*` classes and style from scratch. */
  unstyled?: boolean;
  onEnrolled?: (enrolled: { credentialId?: string }) => void;
  onRecovered?: (wallet: { contractId: string; credentialId: string }) => void;
  onError?: (error: SembolError) => void;
}

/**
 * Guided recovery: enroll a backup credential today ("setup"), get back in
 * from a new device the day the phone is gone ("recover").
 */
export function RecoverySetup({
  mode = "setup",
  className,
  unstyled,
  onEnrolled,
  onRecovered,
  onError,
}: RecoverySetupProps) {
  const { enroll, recover, walletAddress, status, error, reset } = useRecovery();
  const { copy, copied } = useWalletAddress();
  const [method, setMethod] = useState<"passkey" | "ed25519" | null>(null);
  const [nickname, setNickname] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [enrolledDone, setEnrolledDone] = useState(false);
  const [candidates, setCandidates] = useState<string[] | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [needsAddress, setNeedsAddress] = useState(false);
  const nickId = useId();
  const keyId = useId();
  const addressId = useId();

  const busy =
    status === "enrolling" ||
    status === "authenticating" ||
    status === "discovering" ||
    status === "connecting";

  const handleEnroll = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!method || busy) return;
    try {
      const result = await enroll({
        method,
        nickname: nickname.trim() || undefined,
        publicKey: method === "ed25519" ? publicKey.trim() : undefined,
      });
      setEnrolledDone(true);
      onEnrolled?.(result);
    } catch (err) {
      onError?.(err as SembolError);
    }
  };

  const finish = (outcome: RecoverOutcome) => {
    if (outcome.outcome === "connected") {
      onRecovered?.({ contractId: outcome.contractId, credentialId: outcome.credentialId });
    } else {
      setCandidates(outcome.candidates);
    }
  };

  const handleRecover = async (contractId?: string) => {
    setCandidates(null);
    setNeedsAddress(false);
    try {
      finish(await recover(contractId ? { contractId } : undefined));
    } catch (err) {
      const sembolError = err as SembolError;
      if (sembolError.code === "recovery_needs_address") {
        setNeedsAddress(true);
      } else {
        onError?.(sembolError);
      }
    }
  };

  // ---------- recover mode ----------
  if (mode === "recover") {
    return (
      <div className={unstyled ? className : cx("sembol-recovery", className)}>
        {!candidates && !needsAddress && (
          <>
            <p className={unstyled ? undefined : "sembol-recovery__hint"}>
              Use any passkey or recovery credential enrolled on your wallet.
            </p>
            <button
              type="button"
              className={unstyled ? undefined : buttonClasses("primary", "md")}
              onClick={() => void handleRecover()}
              disabled={busy}
              data-loading={busy || undefined}
            >
              {busy && <Spinner />}
              <span>
                {status === "authenticating"
                  ? "Waiting for your passkey…"
                  : status === "discovering"
                    ? "Finding your wallet…"
                    : status === "connecting"
                      ? "Reconnecting…"
                      : "Recover with passkey"}
              </span>
            </button>
          </>
        )}

        {candidates && (
          <div className={unstyled ? undefined : "sembol-recovery__choices"} role="group" aria-label="Choose a wallet">
            <p className={unstyled ? undefined : "sembol-recovery__hint"}>
              This credential signs for several wallets - pick one:
            </p>
            {candidates.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className={unstyled ? undefined : "sembol-recovery__choice"}
                onClick={() => void handleRecover(candidate)}
                disabled={busy}
              >
                {truncateAddress(candidate, 8, 8)}
              </button>
            ))}
          </div>
        )}

        {needsAddress && (
          <form
            className={unstyled ? undefined : "sembol-recovery__form"}
            onSubmit={(event) => {
              event.preventDefault();
              if (manualAddress.trim()) void handleRecover(manualAddress.trim());
            }}
          >
            <p className={unstyled ? undefined : "sembol-recovery__hint"} role="alert">
              Your passkey was found, but the wallet couldn't be discovered automatically. Enter the
              wallet address you saved during setup.
            </p>
            <div className={unstyled ? undefined : "sembol-recovery__field"}>
              <label htmlFor={addressId}>Wallet address (C…)</label>
              <input
                id={addressId}
                value={manualAddress}
                onChange={(event) => setManualAddress(event.target.value)}
                placeholder="C…"
                autoComplete="off"
                spellCheck={false}
                required
              />
            </div>
            <button type="submit" className={unstyled ? undefined : buttonClasses("primary", "sm")} disabled={busy}>
              {busy ? "Reconnecting…" : "Recover"}
            </button>
          </form>
        )}

        <ErrorToast
          error={busy || error?.code === "recovery_needs_address" ? null : error}
          onDismiss={reset}
          unstyled={unstyled}
        />
      </div>
    );
  }

  // ---------- setup mode ----------
  return (
    <div className={unstyled ? className : cx("sembol-recovery", className)}>
      {enrolledDone ? (
        <div className={unstyled ? undefined : "sembol-recovery__done"}>
          <p className={unstyled ? undefined : "sembol-recovery__hint"} role="status">
            ✓ Recovery credential added.
          </p>
          {walletAddress && (
            <div className={unstyled ? undefined : "sembol-recovery__save"}>
              <p>
                Save your wallet address somewhere safe - recovery on a brand-new device may ask for
                it:
              </p>
              <code className={unstyled ? undefined : "sembol-recovery__address"}>{walletAddress}</code>
              <button
                type="button"
                className={unstyled ? undefined : buttonClasses("outline", "sm")}
                onClick={() => void copy()}
              >
                {copied ? "Copied!" : "Copy address"}
              </button>
            </div>
          )}
          <button
            type="button"
            className={unstyled ? undefined : buttonClasses("ghost", "sm")}
            onClick={() => {
              setEnrolledDone(false);
              setMethod(null);
              setNickname("");
              setPublicKey("");
              reset();
            }}
          >
            Add another
          </button>
        </div>
      ) : !method ? (
        <div role="group" aria-label="Recovery method" className={unstyled ? undefined : "sembol-recovery__methods"}>
          <p className={unstyled ? undefined : "sembol-recovery__hint"}>
            If this device is lost, a recovery credential is the only way back into your wallet.
          </p>
          <button
            type="button"
            className={unstyled ? undefined : "sembol-recovery__method"}
            onClick={() => setMethod("passkey")}
          >
            <span className={unstyled ? undefined : "sembol-recovery__method-title"}>Recovery passkey</span>
            <span className={unstyled ? undefined : "sembol-recovery__method-hint"}>
              A passkey on another device (phone, security key, password manager).
            </span>
          </button>
          <button
            type="button"
            className={unstyled ? undefined : "sembol-recovery__method"}
            onClick={() => setMethod("ed25519")}
          >
            <span className={unstyled ? undefined : "sembol-recovery__method-title"}>Offline key</span>
            <span className={unstyled ? undefined : "sembol-recovery__method-hint"}>
              An Ed25519 public key (G…) whose secret you keep offline.
            </span>
          </button>
        </div>
      ) : (
        <form onSubmit={(event) => void handleEnroll(event)} className={unstyled ? undefined : "sembol-recovery__form"}>
          {method === "ed25519" && (
            <div className={unstyled ? undefined : "sembol-recovery__field"}>
              <label htmlFor={keyId}>Public key (G…)</label>
              <input
                id={keyId}
                value={publicKey}
                onChange={(event) => setPublicKey(event.target.value)}
                placeholder="G…"
                autoComplete="off"
                spellCheck={false}
                required
              />
            </div>
          )}
          <div className={unstyled ? undefined : "sembol-recovery__field"}>
            <label htmlFor={nickId}>Name (optional)</label>
            <input
              id={nickId}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Recovery"
              autoComplete="off"
              maxLength={40}
            />
          </div>
          <div className={unstyled ? undefined : "sembol-recovery__row"}>
            <button
              type="submit"
              className={unstyled ? undefined : buttonClasses("primary", "sm")}
              disabled={busy}
              data-loading={busy || undefined}
            >
              {busy && <Spinner />}
              <span>
                {status === "enrolling"
                  ? "Waiting for approval…"
                  : method === "passkey"
                    ? "Create recovery passkey"
                    : "Add recovery key"}
              </span>
            </button>
            <button
              type="button"
              className={unstyled ? undefined : buttonClasses("ghost", "sm")}
              onClick={() => setMethod(null)}
              disabled={busy}
            >
              Back
            </button>
          </div>
        </form>
      )}

      <ErrorToast error={busy ? null : error} onDismiss={reset} unstyled={unstyled} />
    </div>
  );
}
