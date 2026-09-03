/**
 * Inline icon set - 24px grid, 1.8 stroke, round caps. No dependency.
 * Decorative by default (aria-hidden); pass a label via the wrapping element.
 */
interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function Base({
  size = 20,
  className,
  strokeWidth = 1.8,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/** Face-scan frame with a smile - the onboarding gesture. */
export function FaceIdIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8" />
      <path d="M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8" />
      <path d="M20 16v1.5a2.5 2.5 0 0 1-2.5 2.5H16" />
      <path d="M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16" />
      <path d="M9 9.5v1" />
      <path d="M15 9.5v1" />
      <path d="M9.3 14.6a3.6 3.6 0 0 0 5.4 0" />
    </Base>
  );
}

export function FingerprintIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 11.5c0 3.2-.5 6-1.5 8.3" />
      <path d="M8.7 11.3a3.3 3.3 0 0 1 6.6.2c0 3.6-.6 6.4-1.7 8.8" />
      <path d="M5.8 13.7c.3-1 .4-1.8.4-2.4a5.8 5.8 0 0 1 11.6 0c0 .9 0 1.9-.2 2.9" />
      <path d="M4.2 9.4A7.9 7.9 0 0 1 12 3.5c3.6 0 6.6 2.3 7.6 5.6" />
      <path d="M7 17.7c.4-1 .7-2 .9-3" />
    </Base>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3 5 5.8v5.3c0 4.4 2.9 7.6 7 9.4 4.1-1.8 7-5 7-9.4V5.8L12 3Z" />
      <path d="m9.2 11.8 2 2 3.6-3.9" />
    </Base>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5L13 3Z" />
    </Base>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="8" cy="15" r="4.2" />
      <path d="m11 12 8.5-8.5" />
      <path d="M16 7l2.5 2.5" />
      <path d="M13.5 9.5 16 12" />
    </Base>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m8 8-4.5 4L8 16" />
      <path d="m16 8 4.5 4L16 16" />
      <path d="m13.2 5-2.4 14" />
    </Base>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5Z" />
    </Base>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20.5 3.5 3.6 9.8c-.8.3-.8 1.5.1 1.7l6.7 1.9 1.9 6.7c.2.9 1.4.9 1.7.1l6.3-16.9c.3-.7-.4-1.4-1.1-1.1Z" />
      <path d="m10.4 13.4 4.3-4.3" />
    </Base>
  );
}

export function QrIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <path d="M13.5 13.5h2.8v2.8h-2.8z" />
      <path d="M17.2 17.2H20V20h-2.8z" />
    </Base>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1L20 9.5" />
      <path d="M20 4.5v5h-5" />
      <path d="M19.5 12a7.5 7.5 0 0 1-13 5.1L4 14.5" />
      <path d="M4 19.5v-5h5" />
    </Base>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5" />
    </Base>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Base>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </Base>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </Base>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m12 3.5 8.5 4.7L12 12.9 3.5 8.2 12 3.5Z" />
      <path d="m3.5 12.5 8.5 4.7 8.5-4.7" />
      <path d="m3.5 16.5 8.5 4.7 8.5-4.7" />
    </Base>
  );
}

export function CoinsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <ellipse cx="12" cy="6.5" rx="7.5" ry="3" />
      <path d="M4.5 6.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5" />
      <path d="M4.5 11.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5" />
    </Base>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2" />
    </Base>
  );
}
