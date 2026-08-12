import { useId, useState } from "react";
import type { SembolError } from "../errors";
import { useAddSigner, type AddSignerStatus } from "../hooks/useAddSigner";
import {
  buttonClasses,
  cx,
  ErrorToast,
  Spinner,
  type ButtonSize,
  type ButtonVariant,
} from "../internal/ui";

type Method = "passkey" | "ed25519" | "wallet";

export interface AddSignerButtonProps {
  /** Pin a single method; omit to offer all three in a menu. */
  method?: Method;
  /** Button label. @default "Add signer" */
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Drop all built-in `sembol-*` classes and style from scratch. */
  unstyled?: boolean;
  onAdded?: (added: { method: Method; credentialId?: string }) => void;
  onError?: (error: SembolError) => void;
}

const METHOD_META: Record<Method, { title: string; hint: string; cta: string }> = {
  passkey: {
    title: "New passkey",
    hint: "Registers a passkey on this or another device, then adds it as a signer.",
    cta: "Create passkey",
  },
  ed25519: {
    title: "Recovery key",
    hint: "Adds an Ed25519 public key (G…) you keep offline as a backup signer.",
    cta: "Add key",
  },
  wallet: {
    title: "Stellar address",
    hint: "Adds an existing Stellar account (G…) as a delegated co-signer.",
    cta: "Add address",
  },
};

function progressLabel(status: AddSignerStatus): string | null {
  switch (status) {
    case "registering":
      return "Creating the new passkey…";
    case "signing":
      return "Approve with your current passkey…";
    case "submitting":
      return "Adding signer on-chain…";
    default:
      return null;
  }
}

/**
 * Add-signer flow: new passkey, offline Ed25519 recovery key, or a delegated
 * Stellar address. One passkey approval from the current signer finishes
 * every path.
 */
export function AddSignerButton({
  method,
  label = "Add signer",
  variant = "secondary",
  size = "md",
  className,
  unstyled,
  onAdded,
  onError,
}: AddSignerButtonProps) {
  const { addPasskey, addEd25519, addWallet, status, error, reset } = useAddSigner();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Method | null>(null);
  const [nickname, setNickname] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const panelId = useId();
  const nickId = useId();
  const keyId = useId();

  const busy = status === "registering" || status === "signing" || status === "submitting";
  const active = method ?? picked;
  const progress = progressLabel(status);

  const closePanel = () => {
    setOpen(false);
    setPicked(null);
    setNickname("");
    setPublicKey("");
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!active || busy) return;
    try {
      const trimmedNickname = nickname.trim() || undefined;
      if (active === "passkey") {
        const { credentialId } = await addPasskey({ nickname: trimmedNickname });
        onAdded?.({ method: active, credentialId });
      } else if (active === "ed25519") {
        await addEd25519(publicKey, { nickname: trimmedNickname });
        onAdded?.({ method: active });
      } else {
        await addWallet(publicKey, { nickname: trimmedNickname });
        onAdded?.({ method: active });
      }
      closePanel();
    } catch (err) {
      onError?.(err as SembolError);
    }
  };

  const needsKeyInput = active === "ed25519" || active === "wallet";

  return (
    <div className={unstyled ? className : cx("sembol-addsigner", className)}>
      <button
        type="button"
        className={unstyled ? undefined : buttonClasses(variant, size)}
        onClick={() => {
          reset();
          if (open) {
            closePanel();
          } else {
            setOpen(true);
            if (method) setPicked(method);
          }
        }}
        aria-expanded={open}
        aria-controls={panelId}
        disabled={busy}
        data-loading={busy || undefined}
      >
        {busy && <Spinner />}
        <span>{busy ? (progress ?? "Working…") : label}</span>
      </button>

      {open && !busy && (
        <div id={panelId} className={unstyled ? undefined : "sembol-addsigner__panel"}>
          {!active && (
            <div role="group" aria-label="Signer type" className={unstyled ? undefined : "sembol-addsigner__methods"}>
              {(Object.keys(METHOD_META) as Method[]).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  className={unstyled ? undefined : "sembol-addsigner__method"}
                  onClick={() => setPicked(candidate)}
                >
                  <span className={unstyled ? undefined : "sembol-addsigner__method-title"}>
                    {METHOD_META[candidate].title}
                  </span>
                  <span className={unstyled ? undefined : "sembol-addsigner__method-hint"}>
                    {METHOD_META[candidate].hint}
                  </span>
                </button>
              ))}
            </div>
          )}

          {active && (
            <form onSubmit={(event) => void handleSubmit(event)} className={unstyled ? undefined : "sembol-addsigner__form"}>
              <p className={unstyled ? undefined : "sembol-addsigner__hint"}>
                {METHOD_META[active].hint}
              </p>
              {needsKeyInput && (
                <div className={unstyled ? undefined : "sembol-addsigner__field"}>
                  <label htmlFor={keyId}>
                    {active === "ed25519" ? "Public key (G…)" : "Account address (G…)"}
                  </label>
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
              <div className={unstyled ? undefined : "sembol-addsigner__field"}>
                <label htmlFor={nickId}>Name (optional)</label>
                <input
                  id={nickId}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder={active === "passkey" ? "my-laptop" : "backup-key"}
                  autoComplete="off"
                  maxLength={40}
                />
              </div>
              <div className={unstyled ? undefined : "sembol-addsigner__row"}>
                <button type="submit" className={unstyled ? undefined : buttonClasses("primary", "sm")}>
                  {METHOD_META[active].cta}
                </button>
                <button
                  type="button"
                  className={unstyled ? undefined : buttonClasses("ghost", "sm")}
                  onClick={() => (method ? closePanel() : setPicked(null))}
                >
                  {method ? "Cancel" : "Back"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <ErrorToast error={busy ? null : error} onDismiss={reset} unstyled={unstyled} />
    </div>
  );
}
