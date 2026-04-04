import { DrizzleZoomWebhookRepository } from "./zoom-webhook-repository";

export function createZoomWebhookRepository() {
  return new DrizzleZoomWebhookRepository();
}
