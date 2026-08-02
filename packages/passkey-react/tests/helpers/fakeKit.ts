import { vi } from "vitest";
import { SmartAccountEventEmitter, type ContextRule, type SmartAccountKit } from "smart-account-kit";
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
  accountWasmHash: "a12e8fa9621efd20315753bd4007d974390e31fbcb4a7ddc4dd0a0dec728bf2e",
  webauthnVerifierAddress: "CBSHV66WG7UV6FQVUTB67P3DZUEJ2KJ5X6JKQH5MFRAAFNFJUAJVXJYV",
  appName: "Sembol Test",
};

export interface FakeKit {
  events: SmartAccountEventEmitter;
  rpcUrl: string;
  networkPassphrase: string;
  rpc: {
    getAssetBalance: ReturnType<typeof vi.fn>;
    simulateTransaction: ReturnType<typeof vi.fn>;
    fundAddress: ReturnType<typeof vi.fn>;
  };
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
  rules: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  signers: {
    addPasskey: ReturnType<typeof vi.fn>;
    addDelegated: ReturnType<typeof vi.fn>;
    addBatch: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  credentials: {
    create: ReturnType<typeof vi.fn>;
  };
  policies: {
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  /** The one spending-limit client handed out by `policyClients.spendingLimit()`. */
  spendingLimitClient: {
    getSpendingLimitData: ReturnType<typeof vi.fn>;
    setSpendingLimit: ReturnType<typeof vi.fn>;
  };
  policyClients: { spendingLimit: ReturnType<typeof vi.fn> };
  convertPolicyParams: ReturnType<typeof vi.fn>;
  authenticatePasskey: ReturnType<typeof vi.fn>;
  discoverContractsByCredential: ReturnType<typeof vi.fn>;
  /** Test helper: mark the kit connected and emit walletConnected. */
  simulateConnected(contractId?: string, credentialId?: string): void;
  asKit(): SmartAccountKit;
}

/**
 * Build a ContextRule fixture. Only `id` is required; everything else
 * defaults to an empty Default-context rule.
 */
export function makeContextRule(
  overrides: Partial<ContextRule> & Pick<ContextRule, "id">,
): ContextRule {
  return {
    context_type: { tag: "Default", values: undefined },
    name: "Default",
    policies: [],
    policy_ids: [],
    signer_ids: [],
    signers: [],
    valid_until: undefined,
    ...overrides,
  };
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
      fundAddress: vi.fn(async () => ({ txHash: "friendbot-hash" })),
    },
    deployerPublicKey: "GBDEPLOYERDEPLOYERDEPLOYERDEPLOYERDEPLOYERDEPLOYERDEPLO",
    isConnected: false,
    contractId: undefined,
    credentialId: undefined,
    session: options?.session ?? null,

    connectWallet: vi.fn(
      async (opts?: {
        prompt?: boolean;
        fresh?: boolean;
        contractId?: string;
        credentialId?: string;
      }) => {
        if (!opts?.prompt && !opts?.fresh && !kit.session) return null;
        const fallback = kit.session ?? { contractId: CONTRACT_ID, credentialId: CREDENTIAL_ID };
        // Honor explicitly requested targets (recovery flows); otherwise
        // behave like a stored-session reconnect.
        const target = {
          contractId: opts?.contractId ?? fallback.contractId,
          credentialId: opts?.credentialId ?? fallback.credentialId,
        };
        kit.simulateConnected(target.contractId, target.credentialId);
        return { ...target };
      },
    ),

    // NOTE: the real kit only ever emits credentialCreated / walletConnected /
    // sessionExpired / walletDisconnected — transaction events exist in its
    // type map but are never emitted. The fake mirrors that.
    createWallet: vi.fn(async () => {
      events.emit("credentialCreated", {
        credential: {
          credentialId: CREDENTIAL_ID,
          publicKey: new Uint8Array(65),
          contractId: CONTRACT_ID,
          createdAt: 0,
        },
      });
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

    signAndSubmit: vi.fn(async () => ({ success: true, hash: TX_HASH, ledger: 42 })),

    transfer: vi.fn(async () => ({ success: true, hash: TX_HASH, ledger: 42 })),

    rules: {
      list: vi.fn(async () => [] as ContextRule[]),
      get: vi.fn(async () => ({ result: null })),
      add: vi.fn(async () => ({ op: "rules.add" })),
      remove: vi.fn(async () => ({ op: "rules.remove" })),
    },

    signers: {
      addPasskey: vi.fn(async () => ({
        credentialId: "new-passkey-cred",
        publicKey: new Uint8Array(65).fill(9),
        transaction: { op: "signers.addPasskey" },
      })),
      addDelegated: vi.fn(async () => ({ op: "signers.addDelegated" })),
      addBatch: vi.fn(async () => ({ op: "signers.addBatch" })),
      remove: vi.fn(async () => ({ op: "signers.remove" })),
    },

    credentials: {
      // Registration-only passkey creation (no transaction) - the own-rule
      // add-signer path pairs this with rules.add.
      create: vi.fn(async (options?: { nickname?: string; appName?: string }) => ({
        credentialId: "new-passkey-cred",
        publicKey: new Uint8Array(65).fill(9),
        contractId: CONTRACT_ID,
        nickname: options?.nickname,
        createdAt: 0,
      })),
    },

    policies: {
      add: vi.fn(async () => ({ op: "policies.add" })),
      remove: vi.fn(async () => ({ op: "policies.remove" })),
    },

    spendingLimitClient: {
      getSpendingLimitData: vi.fn(async () => ({
        spending_limit: 0n,
        period_ledgers: 17280,
        spending_history: [],
        cached_total_spent: 0n,
      })),
      setSpendingLimit: vi.fn(async () => ({ op: "policy.setSpendingLimit" })),
    },

    policyClients: {
      spendingLimit: vi.fn(() => kit.spendingLimitClient),
    },

    convertPolicyParams: vi.fn(() => ({ op: "convertPolicyParams" })),

    authenticatePasskey: vi.fn(async () => ({ credentialId: CREDENTIAL_ID, rawResponse: {} })),

    discoverContractsByCredential: vi.fn(async () => []),

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
