import { processGhlWebhookPost } from "../../ghl/handler";
import { dynamic } from "../../ghl/route";

export { dynamic };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  return processGhlWebhookPost(request, token);
}
