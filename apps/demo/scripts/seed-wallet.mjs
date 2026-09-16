/**
 * Seed a Sembol smart-account wallet with XLM from the mainnet sponsor.
 * Use this to "send to" a wallet you created in the browser (contract
 * addresses can't receive classic exchange payments; this does the SAC transfer).
 *
 *   MAINNET_SPONSOR_SECRET=S... node scripts/seed-wallet.mjs C<walletAddress> [amountXLM]
 */
import {
  Keypair, Contract, Address, nativeToScVal,
  TransactionBuilder, rpc as stellarRpc,
} from "@stellar/stellar-sdk";

const RPC = "https://mainnet.sorobanrpc.com";
const PASSPHRASE = "Public Global Stellar Network ; September 2015";
const NATIVE_SAC = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";

const wallet = process.argv[2];
const amount = Number(process.argv[3] ?? 2);
if (!wallet?.startsWith("C")) { console.error("pass a C... wallet address"); process.exit(2); }
const sponsor = Keypair.fromSecret(process.env.MAINNET_SPONSOR_SECRET);
const server = new stellarRpc.Server(RPC);

const account = await server.getAccount(sponsor.publicKey());
const op = new Contract(NATIVE_SAC).call(
  "transfer",
  Address.fromString(sponsor.publicKey()).toScVal(),
  Address.fromString(wallet).toScVal(),
  nativeToScVal(BigInt(Math.round(amount * 1e7)), { type: "i128" }),
);
const tx = new TransactionBuilder(account, { fee: "1000", networkPassphrase: PASSPHRASE })
  .addOperation(op).setTimeout(120).build();
const sim = await server.simulateTransaction(tx);
if (stellarRpc.Api.isSimulationError(sim)) { console.error("sim failed:", sim.error); process.exit(1); }
const prepared = stellarRpc.assembleTransaction(tx, sim).build();
prepared.sign(sponsor);
const sent = await server.sendTransaction(prepared);
console.log(`seeding ${amount} XLM -> ${wallet}\ntx: ${sent.hash}\nhttps://stellar.expert/explorer/public/tx/${sent.hash}`);
