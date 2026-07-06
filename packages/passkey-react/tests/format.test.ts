import { describe, expect, it } from "vitest";
import {
  explorerUrl,
  formatTokenAmount,
  networkFromPassphrase,
  parseTokenAmount,
  truncateAddress,
} from "../src/format";

describe("formatTokenAmount", () => {
  it("formats stroops with trimmed decimals", () => {
    expect(formatTokenAmount(125000000n, 7)).toBe("12.5");
    expect(formatTokenAmount(10000000n, 7)).toBe("1");
    expect(formatTokenAmount(1n, 7)).toBe("0.0000001");
    expect(formatTokenAmount(0n, 7)).toBe("0");
    expect(formatTokenAmount(-125000000n, 7)).toBe("-12.5");
  });
});

describe("parseTokenAmount", () => {
  it("round-trips with formatTokenAmount", () => {
    expect(parseTokenAmount("12.5", 7)).toBe(125000000n);
    expect(parseTokenAmount("0.0000001", 7)).toBe(1n);
    expect(parseTokenAmount(3, 7)).toBe(30000000n);
  });

  it("accepts bare-dot user input", () => {
    expect(parseTokenAmount(".5", 7)).toBe(5000000n);
    expect(parseTokenAmount("1.", 7)).toBe(10000000n);
  });

  it("rejects malformed input", () => {
    expect(() => parseTokenAmount("abc", 7)).toThrow();
    expect(() => parseTokenAmount("1.2.3", 7)).toThrow();
    expect(() => parseTokenAmount("", 7)).toThrow();
    expect(() => parseTokenAmount("0.00000001", 7)).toThrow(/decimal places/);
  });
});

describe("truncateAddress", () => {
  it("shortens long addresses and keeps short ones", () => {
    expect(truncateAddress("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC")).toBe(
      "CDLZ…GCYSC".replace("GCYSC", "CYSC"),
    );
    expect(truncateAddress("GABC")).toBe("GABC");
  });
});

describe("network helpers", () => {
  it("classifies passphrases", () => {
    expect(networkFromPassphrase("Test SDF Network ; September 2015")).toBe("testnet");
    expect(networkFromPassphrase("Public Global Stellar Network ; September 2015")).toBe("public");
    expect(networkFromPassphrase("Standalone Network")).toBe("custom");
  });

  it("builds explorer URLs (null on custom networks)", () => {
    expect(explorerUrl("Test SDF Network ; September 2015", "tx", "abc")).toBe(
      "https://stellar.expert/explorer/testnet/tx/abc",
    );
    expect(explorerUrl("Standalone Network", "tx", "abc")).toBeNull();
  });
});
