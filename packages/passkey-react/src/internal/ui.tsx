/** Join class names, skipping falsy values. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("sembol-spinner", className)} aria-hidden="true" />;
}
