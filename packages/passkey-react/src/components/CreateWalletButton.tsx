import { usePasskeyWalletContext } from "../context";
import type { SembolError } from "../errors";
import { useCreateWallet, type CreateWalletPhase } from "../hooks/useCreateWallet";
import {
  buttonClasses,
  ErrorToast,
  Spinner,
  type ButtonSize,
  type ButtonVariant,
} from "../internal/ui";
import type { CreateWalletOptions } from "../types";

export interface CreateWalletButtonProps extends CreateWalletOptions {
  /** Button label. @default "Create wallet" */
  label?: string;
  /** Visual style. @default "primary" */
  variant?: ButtonVariant;
  /** Button size. @default "md" */
  size?: ButtonSize;
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
  variant = "primary",
  size = "md",
  className,
  unstyled,
  disabled,
  onSuccess,
  onError,
  ...createOptions
}: CreateWalletButtonProps) {
  const { status: walletStatus, capabilities } = usePasskeyWalletContext();
  const { createWallet, status, phase, error, reset } = useCreateWallet();

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
    <>
      <button
        type="button"
        className={unstyled ? className : buttonClasses(variant, size, className)}
        onClick={() => void handleClick()}
        disabled={disabled || busy || walletStatus === "initializing" || unsupported}
        data-loading={busy || undefined}
        title={unsupported ? "This browser doesn't support passkeys" : undefined}
      >
        {busy && <Spinner />}
        <span>{busy && phase ? PHASE_LABELS[phase] : label}</span>
      </button>
      <ErrorToast error={busy ? null : error} onDismiss={reset} unstyled={unstyled} />
    </>
  );
}
