import { describe, expect, it } from "vitest";
import {
  Account,
  Address,
  Asset,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import { Buffer } from "buffer";
import { summarizeTransaction } from "../src/summary";
import { CONTRACT_ID } from "./helpers/fakeKit";

// Deterministic valid addresses without touching crypto randomness
// (noble-ed25519 byte checks misbehave under jsdom).
const SOURCE = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 3));
const DEST = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 7));

function buildTransferTx() {
  return new TransactionBuilder(new Account(SOURCE, "0"), {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: CONTRACT_ID,
        function: "transfer",
        args: [
          new Address(CONTRACT_ID).toScVal(),
          new Address(DEST).toScVal(),
          nativeToScVal(250000000n, { type: "i128" }),
        ],
      }),
    )
    .setTimeout(300)
    .build();
}

describe("summarizeTransaction", () => {
  it("summarizes a SAC transfer invocation", () => {
    const summary = summarizeTransaction(buildTransferTx(), Networks.TESTNET);
    expect(summary.kind).toBe("contract-call");
    expect(summary.contractId).toBe(CONTRACT_ID);
    expect(summary.functionName).toBe("transfer");
    expect(summary.args).toHaveLength(3);
    expect(summary.args[2]).toBe("250000000");
    expect(summary.headline).toContain("transfer(");
    expect(summary.network).toBe("testnet");
    expect(summary.feeXlm).toBe("0.00001");
  });

  it("accepts XDR strings", () => {
    const xdr = buildTransferTx().toXDR();
    const summary = summarizeTransaction(xdr, Networks.TESTNET);
    expect(summary.kind).toBe("contract-call");
    expect(summary.functionName).toBe("transfer");
  });

  it("accepts AssembledTransaction-shaped objects via .built", () => {
    const fakeAssembled = { built: buildTransferTx() };
    const summary = summarizeTransaction(
      fakeAssembled as unknown as Parameters<typeof summarizeTransaction>[0],
      Networks.TESTNET,
    );
    expect(summary.functionName).toBe("transfer");
  });

  it("labels classic operations", () => {
    const tx = new TransactionBuilder(new Account(SOURCE, "0"), {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.payment({ destination: DEST, asset: Asset.native(), amount: "10" }))
      .setTimeout(300)
      .build();
    const summary = summarizeTransaction(tx, Networks.TESTNET);
    expect(summary.kind).toBe("classic");
  });

  it("never throws on garbage input", () => {
    const summary = summarizeTransaction("not-xdr", Networks.TESTNET);
    expect(summary.kind).toBe("unknown");
    expect(summary.headline).toBe("Transaction");
  });
});
