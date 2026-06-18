import { DrizzleGhlWebhookRepository } from "./ghl-webhook-repository";

export function createGhlWebhookRepository() {
  return new DrizzleGhlWebhookRepository();
}
