import { afterEach, describe, expect, it, vi } from "vitest";
import { detectWebAuthnCapabilities } from "../src/webauthn";

afterEach(() => {
  vi.unstubAllGlobals();
  // jsdom has no PublicKeyCredential; remove anything tests attached.
  delete (window as { PublicKeyCredential?: unknown }).PublicKeyCredential;
});

describe("detectWebAuthnCapabilities", () => {
  it("reports unsupported when WebAuthn is absent", async () => {
    const caps = await detectWebAuthnCapabilities();
    expect(caps.supported).toBe(false);
    expect(caps.platformAuthenticator).toBe(false);
  });

  it("uses getClientCapabilities when available", async () => {
    (window as { PublicKeyCredential?: unknown }).PublicKeyCredential = {
      getClientCapabilities: async () => ({
        userVerifyingPlatformAuthenticator: true,
        conditionalGet: true,
        conditionalCreate: false,
        hybridTransport: true,
        relatedOrigins: true,
      }),
    };
    const caps = await detectWebAuthnCapabilities();
    expect(caps).toMatchObject({
      supported: true,
      platformAuthenticator: true,
      conditionalGet: true,
      conditionalCreate: false,
      hybridTransport: true,
      relatedOrigins: true,
    });
  });

  it("treats absent capability keys as unknown (null)", async () => {
    (window as { PublicKeyCredential?: unknown }).PublicKeyCredential = {
      getClientCapabilities: async () => ({ conditionalGet: true }),
    };
    const caps = await detectWebAuthnCapabilities();
    expect(caps.conditionalGet).toBe(true);
    expect(caps.conditionalCreate).toBeNull();
    expect(caps.platformAuthenticator).toBeNull();
  });

  it("falls back to legacy detection methods", async () => {
    (window as { PublicKeyCredential?: unknown }).PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
      isConditionalMediationAvailable: async () => false,
    };
    const caps = await detectWebAuthnCapabilities();
    expect(caps.supported).toBe(true);
    expect(caps.platformAuthenticator).toBe(true);
    expect(caps.conditionalGet).toBe(false);
    expect(caps.conditionalCreate).toBeNull();
  });

  it("never rejects even when detection methods throw", async () => {
    (window as { PublicKeyCredential?: unknown }).PublicKeyCredential = {
      getClientCapabilities: async () => {
        throw new Error("nope");
      },
      isUserVerifyingPlatformAuthenticatorAvailable: async () => {
        throw new Error("nope");
      },
    };
    const caps = await detectWebAuthnCapabilities();
    expect(caps.supported).toBe(true);
    expect(caps.platformAuthenticator).toBeNull();
  });
});
