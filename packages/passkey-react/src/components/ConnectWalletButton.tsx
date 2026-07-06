import { useEffect, useId, useRef, useState } from "react";
import { usePasskeyWalletContext } from "../context";
import type { SembolError } from "../errors";
import { useConnectWallet } from "../hooks/useConnectWallet";
import { useWalletAddress } from "../hooks/useWalletAddress";
import {
  buttonClasses,
  cx,
  ErrorToast,
  Spinner,
  type ButtonSize,
  type ButtonVariant,
} from "../internal/ui";

export interface ConnectWalletButtonProps {
  /** Button label while disconnected. @default "Connect wallet" */
  label?: string;
  /** Visual style while disconnected. @default "primary" */
  variant?: ButtonVariant;
  /** Button size while disconnected. @default "md" */
  size?: ButtonSize;
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
  variant = "primary",
  size = "md",
  className,
  unstyled,
  onConnected,
  onDisconnected,
  onError,
}: ConnectWalletButtonProps) {
  const { status, isConnected, disconnect, capabilities } = usePasskeyWalletContext();
  const { connect, status: connectStatus, error, reset } = useConnectWallet();
  const { displayAddress, explorerUrl, copy, copied } = useWalletAddress();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  /** Close the menu, returning focus to the chip for keyboard/AT users. */
  const closeMenu = (restoreFocus: boolean) => {
    setMenuOpen(false);
    if (restoreFocus) chipRef.current?.focus();
  };

  useEffect(() => {
    if (!menuOpen) return;

    const menuItems = () =>
      Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

    // Move focus into the menu so keyboard users can operate it.
    const frame = requestAnimationFrame(() => menuItems()[0]?.focus());

    const onPointerDown = (event: PointerEvent) => {
      // Clicked elsewhere on purpose — close without stealing focus.
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      // Tabbing out of the menu closes it (otherwise the key handler below
      // would keep intercepting arrow keys page-wide).
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // Only steer keys while focus is actually inside the menu widget.
      if (!rootRef.current?.contains(document.activeElement)) return;
      if (event.key === "Escape") {
        setMenuOpen(false);
        chipRef.current?.focus();
        return;
      }
      const items = menuItems();
      if (items.length === 0) return;
      const index = items.findIndex((item) => item === document.activeElement);
      let next = -1;
      if (event.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % items.length;
      else if (event.key === "ArrowUp") next = index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = items.length - 1;
      if (next >= 0) {
        event.preventDefault();
        items[next]?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const busy = connectStatus === "connecting" || status === "connecting";
  const unsupported = capabilities !== null && !capabilities.supported;

  const handleConnect = async (fresh = false) => {
    closeMenu(true);
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

  const handleCopy = async () => {
    await copy();
  };

  if (!isConnected) {
    return (
      <>
        <button
          type="button"
          className={unstyled ? className : buttonClasses(variant, size, className)}
          onClick={() => void handleConnect()}
          disabled={busy || status === "initializing" || unsupported}
          data-loading={busy || undefined}
          title={unsupported ? "This browser doesn't support passkeys" : undefined}
        >
          {busy && <Spinner />}
          <span>{busy ? "Connecting…" : label}</span>
        </button>
        <ErrorToast error={busy ? null : error} onDismiss={reset} unstyled={unstyled} />
      </>
    );
  }

  return (
    <div ref={rootRef} className={unstyled ? className : cx("sembol-chip-root", className)}>
      <button
        ref={chipRef}
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
            onClick={() => void handleCopy()}
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
              onClick={() => closeMenu(true)}
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
