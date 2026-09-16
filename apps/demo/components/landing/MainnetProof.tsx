const EXPERT = "https://stellar.expert/explorer/public";

const PROOF = [
  {
    label: "Wallet",
    sub: "a smart account, opened with a passkey",
    id: "CBK7DDIM…S24Q",
    href: `${EXPERT}/contract/CBK7DDIMJIB4H6WNOTIU57QPAD267CHOHE6XLS2C3QWTVWYFDLUJS24Q`,
  },
  {
    label: "Received",
    sub: "1 XLM in, through the native asset contract",
    id: "a99c2a56…29d8",
    href: `${EXPERT}/tx/a99c2a56c6e197f2c6eed61db112c42c5fa5ec1809d818e76da97db0e1e529d8`,
  },
  {
    label: "Sent",
    sub: "0.5 XLM out, signed by the passkey, fee paid by Sembol Cloud",
    id: "54ab44b9…a3a0",
    href: `${EXPERT}/tx/54ab44b9625b86bcc3abdbd856435ebc705eafae59da3bbee826075dd6f5a3a0`,
  },
] as const;

/**
 * The mainnet seal: three real, clickable entries on the public network,
 * shown in the paper chapter under the live testnet block height.
 */
export function MainnetProof() {
  return (
    <div className="mt-14 border-t border-paper-line pt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div>
          <p className="microlabel text-brass">Proven on mainnet</p>
          <h3 className="font-display mt-3 text-2xl font-semibold tracking-wide uppercase sm:text-3xl">
            Sealed on the public network
          </h3>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-paper-dim">
            A real wallet on Stellar mainnet: opened with a passkey, funded, and spent from,
            every fee paid by Sembol Cloud, on the audited OpenZeppelin contracts already
            deployed there. Sembol deploys nothing of its own. 16 September 2026.
          </p>
        </div>
        <p className="tnum font-mono text-xs text-paper-dim">
          creation ≈ 0.165 XLM · payment ≈ 0.003 XLM
        </p>
      </div>
      <div className="mt-6">
        {PROOF.map((row) => (
          <a
            key={row.label}
            href={row.href}
            target="_blank"
            rel="noreferrer"
            className="group grid grid-cols-1 items-baseline gap-x-8 gap-y-1 border-b border-paper-line py-4 transition-colors hover:bg-ink/[0.035] sm:grid-cols-[6rem_1fr_auto]"
          >
            <span className="microlabel text-brass/80">{row.label}</span>
            <span className="text-sm leading-relaxed text-paper-dim">{row.sub}</span>
            <span className="tnum font-mono text-sm text-ink transition-colors group-hover:text-brass">
              {row.id} ↗
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
