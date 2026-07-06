import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { SembolError } from "../errors";

/** Join class names, skipping falsy values. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Visual style of Sembol buttons. */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";

/** Size of Sembol buttons. */
export type ButtonSize = "sm" | "md" | "lg";

/** Compose the class list for a styled Sembol button. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cx(
    "sembol-btn",
    `sembol-btn--${variant}`,
    size !== "md" && `sembol-btn--${size}`,
    className,
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("sembol-spinner", className)} aria-hidden="true" />;
}

const TOAST_DISMISS_MS = 6000;

/**
 * Error toast rendered in a portal - never affects the layout of the
 * component that raised it. Auto-dismisses; manual close included.
 */
export function ErrorToast({
  error,
  onDismiss,
  unstyled,
}: {
  error: SembolError | null;
  onDismiss: () => void;
  unstyled?: boolean;
}) {
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(onDismiss, TOAST_DISMISS_MS);
    return () => clearTimeout(id);
  }, [error, onDismiss]);

  if (!error || typeof document === "undefined") return null;

  return createPortal(
    <div className={unstyled ? undefined : "sembol-toast"} role="alert" data-sembol-portal="">
      <span className={unstyled ? undefined : "sembol-toast__message"}>{error.userMessage}</span>
      <button
        type="button"
        className={unstyled ? undefined : "sembol-toast__close"}
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>,
    document.body,
  );
}
