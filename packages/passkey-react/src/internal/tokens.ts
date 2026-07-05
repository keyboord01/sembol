import { Asset } from "@stellar/stellar-sdk";
import type { ResolvedSembolConfig, TokenRef } from "../types";

export interface ResolvedToken {
  /** Contract address of the token (C…). */
  contractId: string;
  /** Classic asset when the token is a SAC referenced by asset — enables the fast balance path. */
  asset: Asset | null;
  /** Known decimals/symbol without an on-chain read, when derivable. */
  decimals: number | null;
  symbol: string | null;
  /** Stable cache key for effects. */
  key: string;
}

/** Resolve a {@link TokenRef} to a contract address (plus fast-path metadata). */
export function resolveToken(token: TokenRef, config: ResolvedSembolConfig): ResolvedToken {
  if (token === "native") {
    return {
      contractId: config.nativeTokenContract,
      asset: Asset.native(),
      decimals: 7,
      symbol: "XLM",
      key: "native",
    };
  }
  if ("contractId" in token) {
    return {
      contractId: token.contractId,
      asset: null,
      decimals: null,
      symbol: null,
      key: `c:${token.contractId}`,
    };
  }
  const asset = new Asset(token.code, token.issuer);
  return {
    contractId: asset.contractId(config.networkPassphrase),
    asset,
    decimals: 7,
    symbol: token.code,
    key: `a:${token.code}:${token.issuer}`,
  };
}
