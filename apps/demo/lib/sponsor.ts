/**
 * Sembol sponsor: native fee-sponsorship engine behind /api/relayer.
 *
 * Speaks the smart-account-kit relayer protocol:
 *   POST { func, auth[] }  -> build + simulate + sign + submit (channel = source)
 *   POST { xdr }           -> fee-bump a signed inner transaction, submit
 *
 * Budget model (v0, deliberate): every project key maps to its own channel
 * accounts, and each account holds only its allotted XLM float. The balance IS
 * the hard cap; when it is spent, sponsorship stops. Per-request fees are
 * additionally capped by maxFeeXlm per key.
 *
 * Config (env):
 *   SPONSOR_KEYS_JSON = {"<projectKey>":{"secrets":["S..."],"maxFeeXlm":1}}
 *   SPONSOR_DEFAULT_KEY = projectKey used when no X-Sembol-Key header is sent
 *   NEXT_PUBLIC_RPC_URL / defaults to the testnet preset RPC
 */
import {
  Keypair,
  Operation,
  TransactionBuilder,
  Transaction,
  FeeBumpTransaction,
  xdr as stellarXdr,
  rpc as stellarRpc,
} from "@stellar/stellar-sdk";

// Self-contained defaults: the sponsor runs server-side and must not depend on
// the library's client bundle resolving here (it can tree-shake to undefined).
import { acquireChannelLease } from "./channel-lease";

const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org";
const DEFAULT_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

interface ProjectKeyConfig {
  secrets: string[];
  maxFeeXlm?: number;
}

interface SponsorConfig {
  keys: Record<string, ProjectKeyConfig>;
  defaultKey: string;
  rpcUrl: string;
  networkPassphrase: string;
}

export interface SponsorResult {
  success: boolean;
  hash?: string;
  status?: string;
  error?: string;
  errorCode?: string;
}

const BASE_FEE = "1000"; // stroops; simulation raises it with resource fees

export function loadSponsorConfig(): SponsorConfig | null {
  const raw = process.env.SPONSOR_KEYS_JSON;
  if (!raw) return null;
  let keys: Record<string, ProjectKeyConfig>;
  try {
    keys = JSON.parse(raw);
  } catch {
    return null;
  }
  const defaultKey = process.env.SPONSOR_DEFAULT_KEY ?? Object.keys(keys)[0];
  if (!defaultKey || !keys[defaultKey]) return null;
  return {
    keys,
    defaultKey,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? DEFAULT_RPC_URL,
    networkPassphrase:
      process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? DEFAULT_NETWORK_PASSPHRASE,
  };
}

/** All channel keypairs for a project, indexed by public key. */
function channelMap(config: ProjectKeyConfig): Map<string, Keypair> {
  const map = new Map<string, Keypair>();
  for (const secret of config.secrets) {
    const kp = Keypair.fromSecret(secret);
    map.set(kp.publicKey(), kp);
  }
  return map;
}

function maxFeeStroops(config: ProjectKeyConfig): number {
  return Math.floor((config.maxFeeXlm ?? 1) * 10_000_000);
}

async function pollTransaction(
  server: stellarRpc.Server,
  hash: string,
  timeoutMs = 45_000,
): Promise<SponsorResult> {
  const start = Date.now();
  for (;;) {
    const res = await server.getTransaction(hash);
    if (res.status === stellarRpc.Api.GetTransactionStatus.SUCCESS) {
      return { success: true, hash, status: "SUCCESS" };
    }
    if (res.status === stellarRpc.Api.GetTransactionStatus.FAILED) {
      return {
        success: false,
        hash,
        errorCode: "ONCHAIN_FAILED",
        error: "Transaction failed on-chain",
      };
    }
    if (Date.now() - start > timeoutMs) {
      // NOT_FOUND after timeout: report the hash so callers can keep polling.
      return { success: true, hash, status: "PENDING" };
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

async function submitAndPoll(
  server: stellarRpc.Server,
  tx: Transaction | FeeBumpTransaction,
): Promise<SponsorResult> {
  const sent = await server.sendTransaction(tx);
  if (sent.status === "ERROR") {
    const codes = JSON.stringify(sent.errorResult ?? "");
    return {
      success: false,
      errorCode: codes.includes("txBadSeq") ? "BAD_SEQ" : "SUBMIT_FAILED",
      error: `Submission rejected: ${codes.slice(0, 200)}`,
    };
  }
  return pollTransaction(server, sent.hash);
}

/** Mode 1: { func, auth[] } - the relayer builds and pays for the envelope. */
export async function sponsorHostFunction(
  config: SponsorConfig,
  projectKey: string,
  funcB64: string,
  authB64: string[],
): Promise<SponsorResult> {
  const keyConfig = config.keys[projectKey];
  if (!keyConfig) return { success: false, errorCode: "UNAUTHORIZED", error: "Unknown project key" };

  const server = new stellarRpc.Server(config.rpcUrl);
  const func = stellarXdr.HostFunction.fromXDR(funcB64, "base64");
  const auth = authB64.map((a) => stellarXdr.SorobanAuthorizationEntry.fromXDR(a, "base64"));

  const channels = channelMap(keyConfig);
  const lease = await acquireChannelLease(projectKey, [...channels.keys()]);
  const channel = channels.get(lease.channel)!;
  try {
  // one bad-seq retry with a fresh sequence number (rare: lease is exclusive)
  for (let attempt = 0; attempt < 2; attempt++) {
    const account = await server.getAccount(channel.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(Operation.invokeHostFunction({ func, auth }))
      .setTimeout(300)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (stellarRpc.Api.isSimulationError(sim)) {
      return {
        success: false,
        errorCode: "SIMULATION_FAILED",
        error: `Simulation failed: ${sim.error.slice(0, 300)}`,
      };
    }

    const assembled = stellarRpc.assembleTransaction(tx, sim).build();
    // The client's signed auth entries are authoritative; make sure assembly
    // did not swap in simulation auth.
    const op = assembled.operations[0] as Operation.InvokeHostFunction;
    if (auth.length > 0 && (!op.auth || op.auth.length === 0)) {
      return {
        success: false,
        errorCode: "INVALID_PARAMS",
        error: "Assembly dropped client auth entries",
      };
    }

    const total = Number(assembled.fee);
    if (total > maxFeeStroops(keyConfig)) {
      return {
        success: false,
        errorCode: "FEE_LIMIT_EXCEEDED",
        error: `Fee ${total} stroops exceeds this key's cap`,
      };
    }

    assembled.sign(channel);
    const result = await submitAndPoll(server, assembled);
    if (result.errorCode === "BAD_SEQ" && attempt === 0) continue;
    return result;
  }
  return { success: false, errorCode: "BAD_SEQ", error: "Sequence retry exhausted" };
  } finally {
    await lease.release();
  }
}

/** Mode 2: { xdr } - fee-bump a signed transaction, preserving its signatures. */
export async function sponsorFeeBump(
  config: SponsorConfig,
  projectKey: string,
  innerXdr: string,
): Promise<SponsorResult> {
  const keyConfig = config.keys[projectKey];
  if (!keyConfig) return { success: false, errorCode: "UNAUTHORIZED", error: "Unknown project key" };

  const server = new stellarRpc.Server(config.rpcUrl);
  const inner = TransactionBuilder.fromXDR(innerXdr, config.networkPassphrase);
  if (inner instanceof FeeBumpTransaction) {
    return { success: false, errorCode: "INVALID_XDR", error: "Cannot fee-bump a fee-bump" };
  }

  const channels = channelMap(keyConfig);
  const lease = await acquireChannelLease(projectKey, [...channels.keys()]);
  const channel = channels.get(lease.channel)!;
  try {
    const perOpFee = Math.min(
      Math.max(Number(inner.fee) * 10, 2_000_000),
      maxFeeStroops(keyConfig),
    );
    const bump = TransactionBuilder.buildFeeBumpTransaction(
      channel,
      String(perOpFee),
      inner,
      config.networkPassphrase,
    );
    bump.sign(channel);
    return await submitAndPoll(server, bump);
  } finally {
    await lease.release();
  }
}
