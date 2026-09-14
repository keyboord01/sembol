/**
 * Sembol relayer endpoint: fee sponsorship for smart-account-kit clients.
 *
 * Two modes, chosen by environment:
 *
 * 1. NATIVE SPONSOR (SPONSOR_KEYS_JSON set): this route IS the relayer.
 *    It speaks the kit protocol ({func, auth[]} | {xdr}), builds or fee-bumps
 *    the transaction, pays fees from per-project channel accounts, and
 *    submits. Budgets are enforced by construction: each project key's
 *    channel accounts hold only their allotted float, plus a per-request
 *    fee cap. This is Sembol Cloud v0's serverless engine.
 *
 * 2. FORWARD PROXY (RELAYER_UPSTREAM_URL + RELAYER_API_KEY): forwards to a
 *    self-hosted OpenZeppelin Relayer (the week-3 VPS stack), attaching the
 *    API key server-side.
 *
 * Same-origin by default: cross-origin callers must be allow-listed via
 * RELAYER_ALLOWED_ORIGIN. Project selection via the X-Sembol-Key header
 * (falls back to SPONSOR_DEFAULT_KEY for the first-party app).
 */
import {
  loadSponsorConfig,
  sponsorFeeBump,
  sponsorHostFunction,
} from "../../../lib/sponsor";

export const maxDuration = 60;

function corsHeaders(request: Request): Record<string, string> {
  const allowed = process.env.RELAYER_ALLOWED_ORIGIN;
  const origin = request.headers.get("Origin");
  if (!allowed || !origin || (allowed !== "*" && origin !== allowed)) return {};
  return {
    "Access-Control-Allow-Origin": allowed === "*" ? "*" : origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Sembol-Key",
  };
}

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request): Promise<Response> {
  const headers = { "Content-Type": "application/json", ...corsHeaders(request) };

  // ---- mode 1: native sponsor ----
  const sponsor = loadSponsorConfig();
  if (sponsor) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, errorCode: "INVALID_PARAMS", error: "Body must be JSON" },
        { status: 400, headers },
      );
    }
    const payload = (body ?? {}) as { func?: unknown; auth?: unknown; xdr?: unknown };
    const projectKey = request.headers.get("X-Sembol-Key") ?? sponsor.defaultKey;
    const startedAt = Date.now();
    const mode = typeof payload.xdr === "string" ? "xdr" : "func";

    try {
      let result;
      if (typeof payload.xdr === "string") {
        result = await sponsorFeeBump(sponsor, projectKey, payload.xdr);
      } else if (typeof payload.func === "string" && Array.isArray(payload.auth)) {
        const auth = payload.auth.filter((a): a is string => typeof a === "string");
        result = await sponsorHostFunction(sponsor, projectKey, payload.func, auth);
      } else {
        result = null;
      }
      if (result) {
        console.log(
          JSON.stringify({
            level: result.success ? "info" : "warn",
            msg: "sponsor",
            key: projectKey,
            mode,
            ok: result.success,
            errorCode: result.errorCode,
            ms: Date.now() - startedAt,
          }),
        );
        return Response.json(result, { status: result.success ? 200 : 400, headers });
      }
      return Response.json(
        { success: false, errorCode: "INVALID_PARAMS", error: "Expected {func, auth[]} or {xdr}" },
        { status: 400, headers },
      );
    } catch (err) {
      console.error(JSON.stringify({ level: "error", msg: "sponsor_exception", error: err instanceof Error ? err.message : String(err) }));
      return Response.json(
        {
          success: false,
          errorCode: "SPONSOR_ERROR",
          error: err instanceof Error ? err.message.slice(0, 300) : "Sponsor failed",
        },
        { status: 500, headers },
      );
    }
  }

  // ---- mode 2: forward proxy to a self-hosted OZ relayer ----
  const upstream = process.env.RELAYER_UPSTREAM_URL;
  const apiKey = process.env.RELAYER_API_KEY;
  if (!upstream || !apiKey) {
    return Response.json(
      {
        error:
          "Relayer not configured. Set SPONSOR_KEYS_JSON (native sponsor) or " +
          "RELAYER_UPSTREAM_URL + RELAYER_API_KEY (forward proxy), and " +
          "NEXT_PUBLIC_RELAYER_URL=/api/relayer.",
      },
      { status: 501, headers },
    );
  }

  try {
    const body = await request.text();
    const response = await fetch(upstream, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });
    return new Response(await response.text(), { status: response.status, headers });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Relayer proxy request failed" },
      { status: 502, headers },
    );
  }
}
