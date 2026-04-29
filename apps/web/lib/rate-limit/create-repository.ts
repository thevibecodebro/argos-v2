import { DrizzleRateLimitRepository } from "./repository";

export function createRateLimitRepository() {
  return new DrizzleRateLimitRepository();
}
