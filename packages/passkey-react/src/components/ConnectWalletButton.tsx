import { useEffect, useId, useRef, useState } from "react";
import { usePasskeyWalletContext } from "../context";
import type { SembolError } from "../errors";
import { useConnectWallet } from "../hooks/useConnectWallet";
import { useWalletAddress } from "../hooks/useWalletAddress";
import { cx, Spinner } from "../internal/ui";

export interface ConnectWalletButtonProps {
  /** Button label while disconnected. @default "Connect wallet" */
  label?: string;
  /** Extra class names for the root element. */
  className?: string;
  /** Drop all built-in `sembol-*` classes and style from scratch. */
  unstyled?: boolean;
  onConnected?: (wallet: { contractId: string; credentialId: string }) => void;
  onDisconnected?: () => void;
  onError?: (error: SembolError) => void;
}

/**
 * Connect button that becomes an account chip once connected, with a menu
 * for copy / explorer / switch-wallet / disconnect.
 */
export function ConnectWalletButton({
  label = "Connect wallet",
  className,
  unstyled,
  onConnected,
  onDisconnected,
  onError,
}: ConnectWalletButtonProps) {
  const { status, isConnected, disconnect, capabilities } = usePasskeyWalletContext();
  const { connect, status: connectStatus, error } = useConnectWallet();
  const { displayAddress, explorerUrl, copy, copied } = useWalletAddress();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const busy = connectStatus === "connecting" || status === "connecting";
  const unsupported = capabilities !== null && !capabilities.supported;

  const handleConnect = async (fresh = false) => {
    setMenuOpen(false);
    try {
      const result = await connect(fresh ? { fresh: true } : undefined);
      if (result) onConnected?.(result);
    } catch (err) {
      onError?.(err as SembolError);
    }
  };

  const handleDisconnect = async () => {
    setMenuOpen(false);
    await disconnect();
    onDisconnected?.();
  };

  if (!isConnected) {
    return (
      <button
        type="button"
        className={unstyled ? className : cx("sembol-btn", "sembol-btn--primary", className)}
        onClick={() => void handleConnect()}
        disabled={busy || status === "initializing" || unsupported}
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
        <span>{busy ? "Connecting…" : label}</span>
      </button>
    );
  }

  return (
    <div ref={rootRef} className={unstyled ? className : cx("sembol-chip-root", className)}>
      <button
        type="button"
        className={unstyled ? undefined : "sembol-chip"}
        onClick={() => setMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
      >
        <span className={unstyled ? undefined : "sembol-chip__dot"} aria-hidden="true" />
        <span className={unstyled ? undefined : "sembol-chip__address"}>{displayAddress}</span>
        <span className={unstyled ? undefined : "sembol-chip__caret"} aria-hidden="true">
          ▾
        </span>
      </button>
      {menuOpen && (
        <div id={menuId} role="menu" className={unstyled ? undefined : "sembol-menu"}>
          <button
            type="button"
            role="menuitem"
            className={unstyled ? undefined : "sembol-menu__item"}
            onClick={() => void copy()}
          >
            {copied ? "Copied!" : "Copy address"}
          </button>
          {explorerUrl && (
            <a
              role="menuitem"
              className={unstyled ? undefined : "sembol-menu__item"}
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuOpen(false)}
            >
              View on explorer ↗
            </a>
          )}
          <button
            type="button"
            role="menuitem"
            className={unstyled ? undefined : "sembol-menu__item"}
            onClick={() => void handleConnect(true)}
          >
            Switch wallet
          </button>
          <button
            type="button"
            role="menuitem"
            className={unstyled ? undefined : cx("sembol-menu__item", "sembol-menu__item--danger")}
            onClick={() => void handleDisconnect()}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
