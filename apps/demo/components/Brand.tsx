/**
 * Sembol brand mark - a Seljuk eight-point star (two overlapping squares)
 * with a single dot at the center: your mark, sealed on Stellar.
 * Inherits currentColor so it can sit in any context.
 */
export function SembolMark({
  size = 28,
  className,
  title = "Sembol",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      <rect
        x="12.5"
        y="12.5"
        width="23"
        height="23"
        rx="0.8"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <rect
        x="12.5"
        y="12.5"
        width="23"
        height="23"
        rx="0.8"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
        transform="rotate(45 24 24)"
      />
      <circle cx="24" cy="24" r="3.4" fill="currentColor" />
    </svg>
  );
}

/** Mark + wordmark lockup. */
export function SembolLogo({
  markSize = 26,
  className,
}: {
  markSize?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <SembolMark size={markSize} className="text-gold" />
      <span className="font-display text-lg font-semibold tracking-[0.14em] text-fg uppercase">
        Sembol
      </span>
    </span>
  );
}
