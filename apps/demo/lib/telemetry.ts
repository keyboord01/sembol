/**
 * Sembol Cloud telemetry.
 *
 * What this measures: our own service. How many wallets we paid to create, how
 * many transactions we sponsored, for which project, whether they succeeded,
 * and how long they took. That is operational data about infrastructure we run
 * and pay for.
 *
 * What it deliberately never records:
 *
 *   - no wallet or contract addresses
 *   - no transaction hashes, host-function arguments or authorization entries
 *   - no IP addresses, cookies, device or browser identifiers
 *   - nothing that could identify or follow an individual person
 *
 * `project` identifies a paying project (a business), never a user. Counting
 * requests to our own API is not user tracking, and we keep it that way by
 * emitting counts and outcomes rather than identities.
 *
 * The library `@sembol/passkey-react` sends NOTHING. It runs inside other
 * people's apps, in their users' browsers, and those users never agreed to
 * anything with us. Any future SDK telemetry must be opt-in by the integrating
 * developer, off by default, and documented.
 */
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("sembol-cloud");

export type SponsorKind = "create_wallet" | "sponsor_transaction" | "fee_bump";

export interface SponsorTelemetry {
  project: string;
  kind: SponsorKind;
  network: "mainnet" | "testnet";
  ok: boolean;
  errorCode?: string;
  feeStroops?: number;
  durationMs: number;
}

/** Record one sponsorship attempt. Counts and outcomes only. */
export function recordSponsorship(event: SponsorTelemetry): void {
  const span = tracer.startSpan("sembol.sponsor", {
    attributes: {
      "sembol.project": event.project,
      "sembol.kind": event.kind,
      "sembol.network": event.network,
      "sembol.ok": event.ok,
      ...(event.errorCode ? { "sembol.error_code": event.errorCode } : {}),
      ...(typeof event.feeStroops === "number" ? { "sembol.fee_stroops": event.feeStroops } : {}),
      "sembol.duration_ms": event.durationMs,
    },
  });
  span.setStatus({ code: event.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR });
  span.end();

  // Also emit one structured line, so the numbers are readable in plain logs
  // without an observability backend attached.
  console.log(
    JSON.stringify({
      level: event.ok ? "info" : "warn",
      msg: "sponsor",
      project: event.project,
      kind: event.kind,
      network: event.network,
      ok: event.ok,
      errorCode: event.errorCode,
      ms: event.durationMs,
    }),
  );
}

/** Classify a host function without retaining any of its contents. */
export function classifyHostFunction(switchName: string | undefined): SponsorKind {
  if (!switchName) return "sponsor_transaction";
  return switchName.toLowerCase().includes("createcontract")
    ? "create_wallet"
    : "sponsor_transaction";
}
