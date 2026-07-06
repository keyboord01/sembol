/** Shorten a Stellar address for display: `CDLZ…GCYSC`. */
export function truncateAddress(address: string, start = 4, end = 4): string {
  if (address.length <= start + end + 1) return address;
  return `${address.slice(0, start)}…${address.slice(-end)}`;
}

/**
 * Format a raw integer token amount (e.g. stroops) as a decimal string.
 * Trims trailing zeros: `formatTokenAmount(125000000n, 7)` → `"12.5"`.
 */
export function formatTokenAmount(raw: bigint, decimals: number): string {
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  let out = whole.toString();
  if (frac > 0n) {
    out += "." + frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  }
  return negative ? `-${out}` : out;
}

/**
 * Parse a user-entered decimal amount into raw integer units.
 * Throws on malformed input or too many decimal places.
 */
export function parseTokenAmount(value: string | number, decimals: number): bigint {
  const str = String(value).trim();
  // Accepts "12", "12.5", ".5" and "1." — common user input shapes.
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(str)) {
    throw new Error(`Invalid amount: "${value}"`);
  }
  const negative = str.startsWith("-");
  const [wholeRaw = "0", fracRaw = ""] = (negative ? str.slice(1) : str).split(".");
  if (fracRaw.length > decimals) {
    throw new Error(`Amount "${value}" has more than ${decimals} decimal places`);
  }
  const raw =
    BigInt(wholeRaw || "0") * 10n ** BigInt(decimals) +
    BigInt(fracRaw.padEnd(decimals, "0") || "0");
  return negative ? -raw : raw;
}

export type StellarNetwork = "testnet" | "public" | "custom";

/** Classify a network passphrase. */
export function networkFromPassphrase(passphrase: string): StellarNetwork {
  if (passphrase.includes("Test SDF Network")) return "testnet";
  if (passphrase.includes("Public Global Stellar Network")) return "public";
  return "custom";
}

/** stellar.expert base URL for a network, or null for custom networks. */
export function explorerBaseUrl(passphrase: string): string | null {
  const network = networkFromPassphrase(passphrase);
  if (network === "custom") return null;
  return `https://stellar.expert/explorer/${network}`;
}

/** stellar.expert URL for a transaction hash, contract, or account. */
export function explorerUrl(
  passphrase: string,
  kind: "tx" | "contract" | "account",
  id: string,
): string | null {
  const base = explorerBaseUrl(passphrase);
  return base ? `${base}/${kind}/${id}` : null;
}
