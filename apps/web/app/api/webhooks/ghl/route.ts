import { processGhlWebhookPost } from "./handler";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return processGhlWebhookPost(request, readWebhookToken(request));
}

function readWebhookToken(request: Request) {
  const explicit = request.headers.get("x-ghl-webhook-token");

  if (explicit) {
    return explicit;
  }

  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const bearerToken = match?.[1]?.trim();

  if (bearerToken) {
    return bearerToken;
  }

  return null;
}
