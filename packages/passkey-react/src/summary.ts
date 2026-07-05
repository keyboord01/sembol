import {
  Address,
  Transaction,
  TransactionBuilder,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import type { AssembledTransaction } from "smart-account-kit";
import { formatTokenAmount, networkFromPassphrase, truncateAddress, type StellarNetwork } from "./format";

/** Anything the summarizer can digest. */
export type SummarizableTransaction =
  | AssembledTransaction<unknown>
  | Transaction
  | string;

export interface TransactionSummary {
  kind: "contract-call" | "deploy-contract" | "upload-wasm" | "classic" | "unknown";
  /** Called contract (C…) for contract-call transactions. */
  contractId?: string;
  functionName?: string;
  /** Human-readable rendering of each argument. */
  args: string[];
  /** Max fee in XLM (string), or null when unknown. */
  feeXlm: string | null;
  network: StellarNetwork;
  /** One-line description, e.g. `transfer(CDLZ…YSC, GABC…XYZ, 250000000)`. */
  headline: string;
}

function formatNative(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) {
    const hex = Array.from(value.slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
    return `0x${hex}${value.length > 8 ? "…" : ""}`;
  }
  if (typeof value === "string") {
    // Stellar addresses stay recognizable but short.
    if (/^[GC][A-Z2-7]{55}$/.test(value)) return truncateAddress(value, 4, 4);
    return value.length > 48 ? `${value.slice(0, 45)}…` : value;
  }
  if (value === null || value === undefined) return "void";
  if (typeof value === "object") {
    try {
      const json = JSON.stringify(value, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v instanceof Uint8Array ? `0x…(${v.length}b)` : v,
      );
      return json.length > 64 ? `${json.slice(0, 61)}…` : json;
    } catch {
      return "[object]";
    }
  }
  return String(value);
}

function formatScVal(val: xdr.ScVal): string {
  try {
    return formatNative(scValToNative(val));
  } catch {
    return val.switch().name;
  }
}

function toTransaction(
  input: SummarizableTransaction,
  networkPassphrase: string,
): Transaction | null {
  try {
    if (typeof input === "string") {
      const parsed = TransactionBuilder.fromXDR(input, networkPassphrase);
      return "innerTransaction" in parsed ? parsed.innerTransaction : parsed;
    }
    if (typeof input === "object" && input !== null && "built" in input) {
      return (input as { built?: Transaction }).built ?? null;
    }
    return input as Transaction;
  } catch {
    return null;
  }
}

/**
 * Produce a human-readable summary of a Soroban transaction for approval UIs.
 * Never throws — unparseable transactions yield `kind: "unknown"`.
 */
export function summarizeTransaction(
  input: SummarizableTransaction,
  networkPassphrase: string,
): TransactionSummary {
  const network = networkFromPassphrase(networkPassphrase);
  const base: TransactionSummary = {
    kind: "unknown",
    args: [],
    feeXlm: null,
    network,
    headline: "Transaction",
  };

  const tx = toTransaction(input, networkPassphrase);
  if (!tx || !Array.isArray(tx.operations) || tx.operations.length === 0) return base;

  try {
    base.feeXlm = formatTokenAmount(BigInt(tx.fee), 7);
  } catch {
    /* leave null */
  }

  const op = tx.operations[0];
  if (!op || op.type !== "invokeHostFunction") {
    base.kind = "classic";
    base.headline = op ? `${tx.operations.length} operation(s): ${op.type}` : "Transaction";
    return base;
  }

  const func = (op as { func: xdr.HostFunction }).func;
  switch (func.switch().name) {
    case "hostFunctionTypeInvokeContract": {
      const invocation = func.invokeContract();
      const contractId = Address.fromScAddress(invocation.contractAddress()).toString();
      const functionName = invocation.functionName().toString();
      const args = invocation.args().map(formatScVal);
      return {
        ...base,
        kind: "contract-call",
        contractId,
        functionName,
        args,
        headline: `${functionName}(${args.join(", ")})`,
      };
    }
    case "hostFunctionTypeCreateContract":
    case "hostFunctionTypeCreateContractV2":
      return { ...base, kind: "deploy-contract", headline: "Deploy smart account contract" };
    case "hostFunctionTypeUploadContractWasm":
      return { ...base, kind: "upload-wasm", headline: "Upload contract WASM" };
    default:
      return base;
  }
}

export { formatTokenAmount };
