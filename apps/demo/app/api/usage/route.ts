import { readUsage } from "../../../lib/usage";

export const revalidate = 60;

export async function GET(): Promise<Response> {
  const usage = await readUsage();
  return Response.json(usage, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
