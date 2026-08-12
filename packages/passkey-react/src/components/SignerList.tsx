import { useState } from "react";
import type { SembolError } from "../errors";
import { useRemoveSigner } from "../hooks/useRemoveSigner";
import { useSigners } from "../hooks/useSigners";
import type { SignerInfo, SignerKind } from "../internal/security";
import { cx, ErrorToast, Spinner } from "../internal/ui";

export interface SignerListProps {
  /** Extra class names for the root element. */
  className?: string;
  /** Drop all built-in `sembol-*` classes and style from scratch. */
  unstyled?: boolean;
  /** Hide the remove actions (read-only list). */
  readOnly?: boolean;
  onRemoved?: (signer: SignerInfo) => void;
  onError?: (error: SembolError) => void;
}

const KIND_LABELS: Record<SignerKind, string> = {
  passkey: "Passkey",
  ed25519: "Recovery key",
  wallet: "Wallet",
  contract: "Contract",
  unknown: "Signer",
};

/**
 * The account's signers (Default rule), with guarded removal.
 *
 * Removal is a two-step confirm; the last remaining signer can never be
 * removed (that would lock the account forever).
 */
export function SignerList({ className, unstyled, readOnly, onRemoved, onError }: SignerListProps) {
  const { signers, isLoading, error: listError, refresh } = useSigners();
  const { removeSigner, status: removeStatus, error: removeError, reset } = useRemoveSigner();
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const busy = removeStatus === "signing" || removeStatus === "submitting";
  const lastSigner = signers.length <= 1;

  const handleRemove = async (target: SignerInfo) => {
    setConfirmKey(null);
    setBusyKey(target.key);
    try {
      await removeSigner(target);
      onRemoved?.(target);
    } catch (err) {
      onError?.(err as SembolError);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className={unstyled ? className : cx("sembol-signers", className)}>
      {isLoading && signers.length === 0 && (
        <p className={unstyled ? undefined : "sembol-signers__state"} role="status">
          <Spinner /> Reading signers…
        </p>
      )}

      {!isLoading && listError && signers.length === 0 && (
        <p className={unstyled ? undefined : cx("sembol-signers__state", "sembol-signers__state--error")} role="alert">
          {listError.userMessage}{" "}
          <button
            type="button"
            className={unstyled ? undefined : "sembol-signers__retry"}
            onClick={() => void refresh()}
          >
            Retry
          </button>
        </p>
      )}

      {!isLoading && !listError && signers.length === 0 && (
        <p className={unstyled ? undefined : "sembol-signers__state"}>No signers found.</p>
      )}

      {signers.length > 0 && (
        <ul className={unstyled ? undefined : "sembol-signers__list"}>
          {signers.map((signer) => {
            const confirming = confirmKey === signer.key;
            const rowBusy = busyKey === signer.key && busy;
            return (
              <li key={signer.key} className={unstyled ? undefined : "sembol-signers__row"}>
                <span
                  className={
                    unstyled
                      ? undefined
                      : cx("sembol-signers__badge", `sembol-signers__badge--${signer.kind}`)
                  }
                >
                  {KIND_LABELS[signer.kind]}
                </span>
                <span className={unstyled ? undefined : "sembol-signers__name"}>
                  {signer.nickname ?? signer.display}
                  {signer.nickname && (
                    <span className={unstyled ? undefined : "sembol-signers__sub"}>
                      {signer.display}
                    </span>
                  )}
                </span>
                {signer.isActive && (
                  <span className={unstyled ? undefined : "sembol-signers__tag"}>This device</span>
                )}
                {!readOnly && (
                  <span className={unstyled ? undefined : "sembol-signers__actions"}>
                    {rowBusy ? (
                      <span className={unstyled ? undefined : "sembol-signers__state"} role="status">
                        <Spinner /> Removing…
                      </span>
                    ) : confirming ? (
                      <>
                        <button
                          type="button"
                          className={unstyled ? undefined : cx("sembol-signers__action", "sembol-signers__action--danger")}
                          onClick={() => void handleRemove(signer)}
                          disabled={busy}
                        >
                          Confirm remove
                        </button>
                        <button
                          type="button"
                          className={unstyled ? undefined : "sembol-signers__action"}
                          onClick={() => setConfirmKey(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={unstyled ? undefined : "sembol-signers__action"}
                        onClick={() => setConfirmKey(signer.key)}
                        disabled={busy || lastSigner}
                        title={
                          lastSigner
                            ? "The only signer can't be removed - add another signer first"
                            : signer.isActive
                              ? "Removing this device's passkey will sign you out here"
                              : undefined
                        }
                        aria-label={`Remove ${signer.nickname ?? signer.display}`}
                      >
                        Remove
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ErrorToast error={busy ? null : removeError} onDismiss={reset} unstyled={unstyled} />
    </div>
  );
}
