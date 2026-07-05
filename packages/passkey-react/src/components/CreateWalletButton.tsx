import { usePasskeyWalletContext } from "../context";
import type { SembolError } from "../errors";
import { useCreateWallet, type CreateWalletPhase } from "../hooks/useCreateWallet";
import { cx, Spinner } from "../internal/ui";
import type { CreateWalletOptions } from "../types";

export interface CreateWalletButtonProps extends CreateWalletOptions {
  /** Button label. @default "Create wallet" */
  label?: string;
  className?: string;
  /** Drop all built-in `sembol-*` classes and style from scratch. */
  unstyled?: boolean;
  disabled?: boolean;
  onSuccess?: (wallet: { contractId: string; credentialId: string }) => void;
  onError?: (error: SembolError) => void;
}

const PHASE_LABELS: Record<Exclude<CreateWalletPhase, null>, string> = {
  passkey: "Waiting for your passkey…",
  deploying: "Deploying wallet…",
  funding: "Funding wallet…",
};

/**
 * One-click wallet creation: passkey registration → on-chain deployment →
 * (on testnet) Friendbot funding, with per-phase progress labels.
 */
export function CreateWalletButton({
  label = "Create wallet",
  className,
  unstyled,
  disabled,
  onSuccess,
  onError,
  ...createOptions
}: CreateWalletButtonProps) {
  const { status: walletStatus, capabilities } = usePasskeyWalletContext();
  const { createWallet, status, phase, error } = useCreateWallet();

  const busy = status === "creating";
  const unsupported = capabilities !== null && !capabilities.supported;

  const handleClick = async () => {
    try {
      const result = await createWallet(createOptions);
      onSuccess?.(result);
    } catch (err) {
      onError?.(err as SembolError);
    }
  };

  return (
    <button
      type="button"
      className={unstyled ? className : cx("sembol-btn", "sembol-btn--primary", className)}
      onClick={() => void handleClick()}
      disabled={disabled || busy || walletStatus === "initializing" || unsupported}
      data-loading={busy || undefined}
      title={
        unsupported
          ? "This browser doesn't support passkeys"
          : error
            ? error.userMessage
            : undefined
      }
    >
      {busy && <Spinner />}
      <span>{busy && phase ? PHASE_LABELS[phase] : label}</span>
    </button>
  );
}
