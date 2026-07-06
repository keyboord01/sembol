/**
 * WebAuthn capability detection.
 *
 * Uses `PublicKeyCredential.getClientCapabilities()` when available
 * (Safari 17.4+, Chrome/Edge 133+, Firefox 135+) and falls back to
 * `isUserVerifyingPlatformAuthenticatorAvailable()` +
 * `isConditionalMediationAvailable()` on older browsers.
 *
 * `null` values mean "unknown" - the browser gave no signal either way.
 */
export interface WebAuthnCapabilities {
  /** WebAuthn API is present at all. */
  supported: boolean;
  /** A user-verifying platform authenticator (Face ID, Windows Hello…) is available. */
  platformAuthenticator: boolean | null;
  /** Conditional UI (passkey autofill on `get`) is available. */
  conditionalGet: boolean | null;
  /** Conditional create (automatic passkey upgrades) is available. */
  conditionalCreate: boolean | null;
  /** Cross-device (hybrid / QR-code) transport is available. */
  hybridTransport: boolean | null;
  /** Related Origin Requests are supported. */
  relatedOrigins: boolean | null;
  /** Raw `getClientCapabilities()` payload when the browser provides it. */
  raw?: Record<string, boolean | undefined>;
}

export const UNSUPPORTED_CAPABILITIES: WebAuthnCapabilities = {
  supported: false,
  platformAuthenticator: false,
  conditionalGet: false,
  conditionalCreate: false,
  hybridTransport: false,
  relatedOrigins: false,
};

type PKC = typeof PublicKeyCredential & {
  getClientCapabilities?: () => Promise<Record<string, boolean | undefined>>;
  isConditionalMediationAvailable?: () => Promise<boolean>;
};

/**
 * Detect what the current browser can do with passkeys. Safe to call in any
 * environment: resolves to {@link UNSUPPORTED_CAPABILITIES} during SSR or in
 * browsers without WebAuthn. Never rejects.
 */
export async function detectWebAuthnCapabilities(): Promise<WebAuthnCapabilities> {
  if (typeof window === "undefined" || typeof window.PublicKeyCredential === "undefined") {
    return UNSUPPORTED_CAPABILITIES;
  }

  const pkc = window.PublicKeyCredential as PKC;

  // Modern one-call detection.
  if (typeof pkc.getClientCapabilities === "function") {
    try {
      const caps = await pkc.getClientCapabilities();
      const val = (key: string): boolean | null => (typeof caps[key] === "boolean" ? caps[key]! : null);
      return {
        supported: true,
        platformAuthenticator:
          val("userVerifyingPlatformAuthenticator") ?? val("passkeyPlatformAuthenticator"),
        conditionalGet: val("conditionalGet"),
        conditionalCreate: val("conditionalCreate"),
        hybridTransport: val("hybridTransport"),
        relatedOrigins: val("relatedOrigins"),
        raw: caps,
      };
    } catch {
      // fall through to legacy detection
    }
  }

  let platformAuthenticator: boolean | null = null;
  let conditionalGet: boolean | null = null;
  try {
    if (typeof pkc.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      platformAuthenticator = await pkc.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    /* unknown */
  }
  try {
    if (typeof pkc.isConditionalMediationAvailable === "function") {
      conditionalGet = await pkc.isConditionalMediationAvailable();
    }
  } catch {
    /* unknown */
  }

  return {
    supported: true,
    platformAuthenticator,
    conditionalGet,
    conditionalCreate: null,
    hybridTransport: null,
    relatedOrigins: null,
  };
}
