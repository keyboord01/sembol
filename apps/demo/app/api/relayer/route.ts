/**
 * Optional fee-sponsorship proxy for the OpenZeppelin Relayer.
 *
 * The relayer API key must never ship to browsers, so the client posts to
 * this route (set NEXT_PUBLIC_RELAYER_URL=/api/relayer) and the route
 * forwards to your relayer with the key attached server-side.
 *
 * Unconfigured (no RELAYER_UPSTREAM_URL / RELAYER_API_KEY), it returns 501
 * and the app submits via RPC instead — which is fine on testnet.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request): Promise<Response> {
  const upstream = process.env.RELAYER_UPSTREAM_URL;
  const apiKey = process.env.RELAYER_API_KEY;

  if (!upstream || !apiKey) {
    return Response.json(
      {
        error:
          "Relayer proxy not configured. Set RELAYER_UPSTREAM_URL and RELAYER_API_KEY " +
          "(and NEXT_PUBLIC_RELAYER_URL=/api/relayer) to enable fee sponsoring.",
      },
      { status: 501, headers: CORS_HEADERS },
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
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
        ...CORS_HEADERS,
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Relayer proxy request failed" },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
