import { buildLlmsText } from "@/lib/seo/site";

export const dynamic = "force-static";

export async function GET() {
  return new Response(buildLlmsText(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
