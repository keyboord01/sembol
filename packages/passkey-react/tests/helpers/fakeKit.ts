import { vi } from "vitest";
import { SmartAccountEventEmitter, type SmartAccountKit } from "smart-account-kit";
import type { SembolConfig } from "../../src/types";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

/** Make capability detection report a passkey-capable browser. */
export function stubWebAuthnSupport(): () => void {
  (window as { PublicKeyCredential?: unknown }).PublicKeyCredential = {
    getClientCapabilities: async () => ({
      userVerifyingPlatformAuthenticator: true,
      conditionalGet: true,
      hybridTransport: true,
    }),
  };
  return () => {
    delete (window as { PublicKeyCredential?: unknown }).PublicKeyCredential;
  };
}
export const CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
export const CREDENTIAL_ID = "test-credential-id";
export const TX_HASH = "d3adbeefd3adbeefd3adbeefd3adbeefd3adbeefd3adbeefd3adbeefd3adbeef";

export const TEST_CONFIG: SembolConfig = {
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: TESTNET_PASSPHRASE,
  accountWasmHash: "8537b8166c0078440a5324c12f6db48d6340d157c306a54c5ea81405abcc2611",
  webauthnVerifierAddress: "CCMR63YE5T7MPWREF3PC5XNTTGXFSB4GYUGUIT5POHP2UGCS65TBIUUU",
  appName: "Sembol Test",
};

export interface FakeKit {
  events: SmartAccountEventEmitter;
  rpcUrl: string;
  networkPassphrase: string;
  rpc: { getAssetBalance: ReturnType<typeof vi.fn>; simulateTransaction: ReturnType<typeof vi.fn> };
  deployerPublicKey: string;
  isConnected: boolean;
  contractId: string | undefined;
  credentialId: string | undefined;
  session: { contractId: string; credentialId: string } | null;
  connectWallet: ReturnType<typeof vi.fn>;
  createWallet: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  fundWallet: ReturnType<typeof vi.fn>;
  sign: ReturnType<typeof vi.fn>;
  signAndSubmit: ReturnType<typeof vi.fn>;
  transfer: ReturnType<typeof vi.fn>;
  /** Test helper: mark the kit connected and emit walletConnected. */
  simulateConnected(contractId?: string, credentialId?: string): void;
  asKit(): SmartAccountKit;
}

/**
 * In-memory stand-in for SmartAccountKit, injected through the provider's
 * `kit` prop. Mirrors the real kit's behavior of emitting `walletConnected`
 * from connect/create paths.
 */
export function createFakeKit(options?: {
  /** Stored session returned by silent `connectWallet()` (no args). */
  session?: { contractId: string; credentialId: string } | null;
}): FakeKit {
  const events = new SmartAccountEventEmitter();

  const kit: FakeKit = {
    events,
    rpcUrl: TEST_CONFIG.rpcUrl,
    networkPassphrase: TESTNET_PASSPHRASE,
    rpc: {
      getAssetBalance: vi.fn(async () => ({
        latestLedger: 1,
        balanceEntry: { amount: "125000000", authorized: true, clawback: false },
      })),
      simulateTransaction: vi.fn(),
    },
    deployerPublicKey: "GBDEPLOYERDEPLOYERDEPLOYERDEPLOYERDEPLOYERDEPLOYERDEPLO",
    isConnected: false,
    contractId: undefined,
    credentialId: undefined,
    session: options?.session ?? null,

    connectWallet: vi.fn(async (opts?: { prompt?: boolean; fresh?: boolean }) => {
      if (!opts?.prompt && !opts?.fresh && !kit.session) return null;
      const target = kit.session ?? { contractId: CONTRACT_ID, credentialId: CREDENTIAL_ID };
      kit.simulateConnected(target.contractId, target.credentialId);
      return { ...target };
    }),

    createWallet: vi.fn(async () => {
      events.emit("credentialCreated", {
        credential: {
          credentialId: CREDENTIAL_ID,
          publicKey: new Uint8Array(65),
          contractId: CONTRACT_ID,
          createdAt: 0,
        },
      });
      events.emit("transactionSubmitted", { hash: TX_HASH, success: true });
      kit.simulateConnected(CONTRACT_ID, CREDENTIAL_ID);
      return {
        rawResponse: {},
        credentialId: CREDENTIAL_ID,
        publicKey: new Uint8Array(65),
        contractId: CONTRACT_ID,
        signedTransaction: "AAAA",
        submitResult: { success: true, hash: TX_HASH },
      };
    }),

    disconnect: vi.fn(async () => {
      const previous = kit.contractId ?? CONTRACT_ID;
      kit.isConnected = false;
      kit.contractId = undefined;
      kit.credentialId = undefined;
      kit.session = null;
      events.emit("walletDisconnected", { contractId: previous });
    }),

    fundWallet: vi.fn(async () => ({ success: true, hash: TX_HASH, amount: 100 })),

    sign: vi.fn(async (tx: unknown) => tx),

    signAndSubmit: vi.fn(async () => {
      events.emit("transactionSigned", { contractId: CONTRACT_ID, credentialId: CREDENTIAL_ID });
      const result = { success: true, hash: TX_HASH, ledger: 42 };
      events.emit("transactionSubmitted", { hash: TX_HASH, success: true });
      return result;
    }),

    transfer: vi.fn(async () => {
      events.emit("transactionSigned", { contractId: CONTRACT_ID, credentialId: CREDENTIAL_ID });
      const result = { success: true, hash: TX_HASH, ledger: 42 };
      events.emit("transactionSubmitted", { hash: TX_HASH, success: true });
      return result;
    }),

    simulateConnected(contractId = CONTRACT_ID, credentialId = CREDENTIAL_ID) {
      kit.isConnected = true;
      kit.contractId = contractId;
      kit.credentialId = credentialId;
      events.emit("walletConnected", { contractId, credentialId });
    },

    asKit() {
      return kit as unknown as SmartAccountKit;
    },
  };

  return kit;
}
