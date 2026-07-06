/**
 * Optional fee-sponsorship proxy for the OpenZeppelin Relayer.
 *
 * The relayer API key must never ship to browsers, so the client posts to
 * this route (set NEXT_PUBLIC_RELAYER_URL=/api/relayer) and the route
 * forwards to your relayer with the key attached server-side.
 *
 * NOTE: once NEXT_PUBLIC_RELAYER_URL is set, smart-account-kit routes ALL
 * submissions through the relayer (no automatic RPC fallback) - a failing
 * proxy is a hard failure. Leave it unset on testnet unless you want
 * sponsored fees; individual calls can still force `forceMethod: "rpc"`.
 *
 * Same-origin by default: cross-origin callers (e.g. a separately deployed
 * Storybook) must be explicitly allow-listed via RELAYER_ALLOWED_ORIGIN,
 * otherwise anyone could spend your relayer credits.
 */

function corsHeaders(request: Request): Record<string, string> {
  const allowed = process.env.RELAYER_ALLOWED_ORIGIN;
  const origin = request.headers.get("Origin");
  if (!allowed || !origin || (allowed !== "*" && origin !== allowed)) return {};
  return {
    "Access-Control-Allow-Origin": allowed === "*" ? "*" : origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request): Promise<Response> {
  const upstream = process.env.RELAYER_UPSTREAM_URL;
  const apiKey = process.env.RELAYER_API_KEY;
  const headers = { "Content-Type": "application/json", ...corsHeaders(request) };

  if (!upstream || !apiKey) {
    return Response.json(
      {
        error:
          "Relayer proxy not configured. Set RELAYER_UPSTREAM_URL and RELAYER_API_KEY " +
          "(and NEXT_PUBLIC_RELAYER_URL=/api/relayer) to enable fee sponsoring.",
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

    return new Response(await response.text(), {
      status: response.status,
      headers,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Relayer proxy request failed" },
      { status: 502, headers },
    );
  }
}
