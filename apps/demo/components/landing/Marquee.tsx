import { SembolMark } from "../Brand";

/** Ticker band on parchment, between the ink hero and the paper chapter. */
const ITEMS: { t: string; hl?: boolean }[] = [
  { t: "NO SEED PHRASES" },
  { t: "SELF-CUSTODIAL" },
  { t: "FUNDED BY STELLAR INSTAWARDS", hl: true },
  { t: "ON-CHAIN IN 30 SECONDS" },
  { t: "OPEN SOURCE · MIT" },
  { t: "BUILT ON OPENZEPPELIN", hl: true },
  { t: "SPONSORED FEES" },
  { t: "AUDITED CONTRACTS" },
];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {ITEMS.map(({ t, hl }) => (
        <span key={t} className="microlabel flex items-center">
          <span className={`px-8 ${hl ? "text-brass" : "text-paper-dim"}`}>{t}</span>
          <SembolMark size={10} className="text-brass/60" title="" />
        </span>
      ))}
    </div>
  );
}

export function Marquee() {
  return (
    <div
      className="marquee overflow-hidden border-y border-paper-line bg-paper py-3.5"
      role="marquee"
      aria-label="No seed phrases. Self-custodial. Funded by Stellar Instawards. On-chain in 30 seconds. Open source. Built on OpenZeppelin."
    >
      <div className="marquee-track">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
