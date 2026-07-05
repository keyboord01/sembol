import { Address, Operation, contract, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import type { SmartAccountKit } from "smart-account-kit";
import { SembolError } from "./errors";
import { parseTokenAmount } from "./format";

export interface BuildTransferParams {
  /** Token contract address (SAC or SEP-41). */
  tokenContract: string;
  /** Recipient address (G… or C…). */
  to: string;
  /** Amount in token units, e.g. `"12.5"`. */
  amount: string | number;
  /** Token decimals. @default 7 */
  decimals?: number;
  /** Sender. @default the connected smart account */
  from?: string;
  /** Transaction timeout in seconds. @default 30 */
  timeoutInSeconds?: number;
}

/**
 * Build an unsigned SEP-41 `transfer` as an `AssembledTransaction`, ready to
 * hand to `<SignTransactionModal />` or `useSignTransaction().signAndSubmit`.
 *
 * This is the missing piece between "I want to show an approval screen" and
 * smart-account-kit's one-shot `kit.transfer()` (which signs and submits
 * without an approval step).
 */
export async function buildTransferTransaction(
  kit: SmartAccountKit,
  params: BuildTransferParams,
): Promise<contract.AssembledTransaction<unknown>> {
  const from = params.from ?? kit.contractId;
  if (!from) {
    throw new SembolError("wallet_not_connected", "No sender: connect a wallet or pass `from`");
  }
  const stroops = parseTokenAmount(params.amount, params.decimals ?? 7);
  if (stroops <= 0n) throw new SembolError("invalid_input", "Amount must be positive");

  return buildContractCallTransaction(kit, {
    contractId: params.tokenContract,
    method: "transfer",
    args: [
      new Address(from).toScVal(),
      new Address(params.to).toScVal(),
      nativeToScVal(stroops, { type: "i128" }),
    ],
    timeoutInSeconds: params.timeoutInSeconds,
  });
}

export interface BuildContractCallParams {
  /** Contract to invoke (C…). */
  contractId: string;
  /** Contract function name. */
  method: string;
  /** Pre-encoded ScVal arguments. */
  args: xdr.ScVal[];
  /** Transaction timeout in seconds. @default 30 */
  timeoutInSeconds?: number;
}

/**
 * Build an arbitrary contract invocation as an `AssembledTransaction`
 * (simulated, with auth entries ready for passkey signing).
 */
export async function buildContractCallTransaction(
  kit: SmartAccountKit,
  params: BuildContractCallParams,
): Promise<contract.AssembledTransaction<unknown>> {
  const func = xdr.HostFunction.hostFunctionTypeInvokeContract(
    new xdr.InvokeContractArgs({
      contractAddress: Address.fromString(params.contractId).toScAddress(),
      functionName: params.method,
      args: params.args,
    }),
  );

  try {
    return await contract.AssembledTransaction.buildWithOp(
      Operation.invokeHostFunction({ func }),
      {
        contractId: params.contractId,
        networkPassphrase: kit.networkPassphrase,
        rpcUrl: kit.rpcUrl,
        publicKey: kit.deployerPublicKey,
        timeoutInSeconds: params.timeoutInSeconds ?? 30,
        method: params.method,
        parseResultXdr: () => undefined,
      },
    );
  } catch (err) {
    throw new SembolError(
      "simulation_failed",
      err instanceof Error ? err.message : "Failed to build transaction",
      err,
    );
  }
}
