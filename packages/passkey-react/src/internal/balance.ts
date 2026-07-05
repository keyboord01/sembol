import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Operation,
  TransactionBuilder,
  rpc as StellarRpc,
  scValToNative,
} from "@stellar/stellar-sdk";
import { SembolError } from "../errors";

export interface TokenMeta {
  decimals: number;
  symbol: string;
}

const metaCache = new Map<string, TokenMeta>();

async function simulateRead<T>(
  server: StellarRpc.Server,
  networkPassphrase: string,
  sourceAccount: string,
  contract: string,
  fn: string,
  args: Parameters<typeof Operation.invokeContractFunction>[0]["args"],
): Promise<T> {
  const tx = new TransactionBuilder(new Account(sourceAccount, "0"), {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(Operation.invokeContractFunction({ contract, function: fn, args }))
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!StellarRpc.Api.isSimulationSuccess(sim) || !sim.result?.retval) {
    const detail = StellarRpc.Api.isSimulationError(sim) ? sim.error : "no return value";
    throw new SembolError("simulation_failed", `Read of ${fn}() on ${contract} failed: ${detail}`);
  }
  return scValToNative(sim.result.retval) as T;
}

/** Read a SEP-41 / SAC token balance for any G… or C… holder via simulation. */
export async function readTokenBalance(
  server: StellarRpc.Server,
  networkPassphrase: string,
  sourceAccount: string,
  tokenContract: string,
  holder: string,
): Promise<bigint> {
  return simulateRead<bigint>(server, networkPassphrase, sourceAccount, tokenContract, "balance", [
    new Address(holder).toScVal(),
  ]);
}

/** Read (and cache) a token's decimals + symbol. */
export async function readTokenMeta(
  server: StellarRpc.Server,
  networkPassphrase: string,
  sourceAccount: string,
  tokenContract: string,
): Promise<TokenMeta> {
  const cacheKey = `${networkPassphrase}:${tokenContract}`;
  const cached = metaCache.get(cacheKey);
  if (cached) return cached;

  const [decimals, symbol] = await Promise.all([
    simulateRead<number>(server, networkPassphrase, sourceAccount, tokenContract, "decimals", []),
    simulateRead<string>(server, networkPassphrase, sourceAccount, tokenContract, "symbol", []),
  ]);
  const meta = { decimals: Number(decimals), symbol: symbol === "native" ? "XLM" : symbol };
  metaCache.set(cacheKey, meta);
  return meta;
}

/**
 * Read a SAC balance via the ledger-entry fast path (`getAssetBalance`),
 * which avoids a full simulation round-trip.
 */
export async function readAssetBalance(
  server: StellarRpc.Server,
  networkPassphrase: string,
  asset: Asset,
  holder: string,
): Promise<bigint> {
  const res = await server.getAssetBalance(holder, asset, networkPassphrase);
  return res.balanceEntry ? BigInt(res.balanceEntry.amount) : 0n;
}
