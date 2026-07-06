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
