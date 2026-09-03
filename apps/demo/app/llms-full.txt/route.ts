import { llmsFull } from "../../lib/docs-content";

export const dynamic = "force-static";

export function GET() {
  return new Response(llmsFull(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
