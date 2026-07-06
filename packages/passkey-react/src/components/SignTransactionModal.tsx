import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import type { AssembledTransaction, TransactionResult } from "smart-account-kit";
import { usePasskeyWalletContext } from "../context";
import type { SembolError } from "../errors";
import { truncateAddress } from "../format";
import { useSignTransaction, type SignOptions } from "../hooks/useSignTransaction";
import { cx, Spinner } from "../internal/ui";
import { summarizeTransaction } from "../summary";

export interface SignTransactionModalProps {
  /** Controls visibility. */
  open: boolean;
  /** The transaction awaiting approval. */
  transaction: AssembledTransaction<unknown> | null;
  /** Heading. @default "Approve transaction" */
  title?: string;
  /** Optional context line shown under the heading. */
  description?: string;
  /** Called when the user dismisses the modal (cancel, Escape, overlay, Done). */
  onClose: () => void;
  onSuccess?: (result: TransactionResult) => void;
  onError?: (error: SembolError) => void;
  /** Signing options forwarded to `signAndSubmit`. */
  signOptions?: SignOptions;
  className?: string;
  /** Drop all built-in `sembol-*` classes and style from scratch. */
  unstyled?: boolean;
}

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Approval modal for passkey signing: shows a human-readable summary of the
 * transaction (contract, function, args, fee, network), drives the full
 * sign → re-simulate → submit flow, and reports the result with an explorer
 * link. Accessible: focus trap, Escape/overlay dismiss, aria labelling.
 */
export function SignTransactionModal({
  open,
  transaction,
  title = "Approve transaction",
  description,
  onClose,
  onSuccess,
  onError,
  signOptions,
  className,
  unstyled,
}: SignTransactionModalProps) {
  const { config } = usePasskeyWalletContext();
  const { signAndSubmit, status, error, result, reset } = useSignTransaction();
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const busy = status === "signing" || status === "submitting";

  const summary = useMemo(
    () => (transaction ? summarizeTransaction(transaction, config.networkPassphrase) : null),
    [transaction, config.networkPassphrase],
  );

  // Reset the sign state whenever a new approval session starts.
  useEffect(() => {
    if (open) reset();
  }, [open, transaction, reset]);

  // Focus management: remember the opener, focus the dialog, restore on close.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    const frame = requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]");
      (first ?? dialogRef.current)?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  const close = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  // Escape + focus trap.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        // Everything is disabled (busy): keep focus on the dialog itself so
        // Tab can't escape behind the aria-modal overlay.
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      const inside = active instanceof Node && dialogRef.current.contains(active);
      if (!inside) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, close]);

  // While busy the footer buttons disable, dropping focus to <body> — park it
  // on the dialog; when finished, move it to the primary action.
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const active = document.activeElement;
    const inside = active instanceof Node && dialogRef.current.contains(active);
    if (busy && !inside) {
      dialogRef.current.focus();
    } else if ((status === "success" || status === "error") && !inside) {
      dialogRef.current.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
  }, [open, busy, status]);

  if (!open || typeof document === "undefined") return null;

  const handleApprove = async () => {
    if (!transaction) return;
    try {
      const txResult = await signAndSubmit(transaction, signOptions);
      onSuccess?.(txResult);
    } catch (err) {
      // The on-screen message is user-friendly; keep the technical detail
      // reachable for developers.
      console.error("[sembol] signAndSubmit failed:", err);
      onError?.(err as SembolError);
    }
  };

  const explorerTxUrl =
    result && config.explorerBaseUrl ? `${config.explorerBaseUrl}/tx/${result.hash}` : null;
  const explorerContractUrl =
    summary?.contractId && config.explorerBaseUrl
      ? `${config.explorerBaseUrl}/contract/${summary.contractId}`
      : null;

  return createPortal(
    <div
      className={unstyled ? undefined : "sembol-modal-overlay"}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      data-sembol-portal=""
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={unstyled ? className : cx("sembol-modal", className)}
      >
        <div className={unstyled ? undefined : "sembol-modal__header"}>
          <h2 id={titleId} className={unstyled ? undefined : "sembol-modal__title"}>
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className={unstyled ? undefined : "sembol-modal__description"}>
              {description}
            </p>
          )}
        </div>

        <div className={unstyled ? undefined : "sembol-modal__body"}>
          {summary && (
            <dl className={unstyled ? undefined : "sembol-summary"}>
              <div className={unstyled ? undefined : "sembol-summary__row"}>
                <dt>Action</dt>
                <dd>
                  <code>{summary.headline}</code>
                </dd>
              </div>
              {summary.contractId && (
                <div className={unstyled ? undefined : "sembol-summary__row"}>
                  <dt>Contract</dt>
                  <dd>
                    {explorerContractUrl ? (
                      <a href={explorerContractUrl} target="_blank" rel="noreferrer">
                        {truncateAddress(summary.contractId, 8, 6)} ↗
                      </a>
                    ) : (
                      truncateAddress(summary.contractId, 8, 6)
                    )}
                  </dd>
                </div>
              )}
              {summary.feeXlm && (
                <div className={unstyled ? undefined : "sembol-summary__row"}>
                  <dt>Max fee</dt>
                  <dd>{summary.feeXlm} XLM</dd>
                </div>
              )}
              <div className={unstyled ? undefined : "sembol-summary__row"}>
                <dt>Network</dt>
                <dd>
                  <span className={unstyled ? undefined : "sembol-badge"} data-network={summary.network}>
                    {summary.network}
                  </span>
                </dd>
              </div>
            </dl>
          )}

          {status === "signing" && (
            <p className={unstyled ? undefined : "sembol-modal__status"} role="status">
              <Spinner /> Waiting for your passkey…
            </p>
          )}
          {status === "submitting" && (
            <p className={unstyled ? undefined : "sembol-modal__status"} role="status">
              <Spinner /> Submitting to the network…
            </p>
          )}
          {status === "success" && result && (
            <p
              className={unstyled ? undefined : cx("sembol-modal__status", "sembol-modal__status--success")}
              role="status"
            >
              ✓ Transaction confirmed
              {explorerTxUrl && (
                <>
                  {" — "}
                  <a href={explorerTxUrl} target="_blank" rel="noreferrer" className={unstyled ? undefined : "sembol-hash"}>
                    {truncateAddress(result.hash, 8, 8)} ↗
                  </a>
                </>
              )}
            </p>
          )}
          {status === "error" && error && (
            <p
              className={unstyled ? undefined : cx("sembol-modal__status", "sembol-modal__status--error")}
              role="alert"
            >
              {error.userMessage}
            </p>
          )}
        </div>

        <div className={unstyled ? undefined : "sembol-modal__footer"}>
          {status === "success" ? (
            <button
              type="button"
              className={unstyled ? undefined : cx("sembol-btn", "sembol-btn--primary")}
              onClick={onClose}
              data-autofocus
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                className={unstyled ? undefined : cx("sembol-btn", "sembol-btn--ghost")}
                onClick={close}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={unstyled ? undefined : cx("sembol-btn", "sembol-btn--primary")}
                onClick={() => void handleApprove()}
                disabled={busy || !transaction}
                data-loading={busy || undefined}
                data-autofocus
              >
                {busy && <Spinner />}
                {status === "error" ? "Try again" : "Approve"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
