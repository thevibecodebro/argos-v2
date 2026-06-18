import { createLeadConnectorClient, LeadConnectorApiError } from "../../../../packages/ghl-client/src/index";
import { storeCallSourceAsset } from "../calls/storage";
import { refreshGhlToken } from "./oauth";
import { processGhlCallImport } from "./process-ghl-call-import";
import type { GhlImportRepository } from "./repository";

type PollGhlCallImportsInput = {
  repository: GhlImportRepository;
  now?: Date;
  once?: boolean;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function pollGhlCallImports(input: PollGhlCallImportsInput) {
  const sleep = input.sleep ?? defaultSleep;

  do {
    const claimed = await input.repository.claimNextGhlCallImport(input.now ?? new Date());

    if (claimed) {
      try {
        let integration = await input.repository.findGhlIntegrationForImport(claimed.locationId);
        let accessToken = integration?.accessToken ?? "";

        if (integration && integration.tokenExpiresAt <= new Date()) {
          const refreshed = await refreshGhlToken(integration.refreshToken);
          await input.repository.updateGhlTokens(integration.orgId, refreshed);
          integration = {
            ...integration,
            ...refreshed,
          };
          accessToken = refreshed.accessToken;
        }

        await processGhlCallImport({
          importRecord: claimed,
          repository: input.repository,
          leadConnector: createLeadConnectorClient({ accessToken }),
          storeSourceAsset: storeCallSourceAsset,
          getActiveRubricId: (orgId) => input.repository.findActiveRubricIdByOrgId(orgId),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (isRetryableGhlImportError(error, claimed.attemptCount, claimed.maxAttempts)) {
          await input.repository.markGhlCallImportRetryable(claimed, message);
        } else if (error instanceof LeadConnectorApiError && error.status === 401) {
          await input.repository.markGhlCallImportSkipped(claimed.id, {
            reason: "unauthorized_after_refresh",
          });
        } else {
          await input.repository.markGhlCallImportFailed(claimed.id, { error: message });
        }
      }
    }

    if (input.once) {
      return;
    }

    await sleep(input.pollIntervalMs ?? 5_000);
  } while (true);
}

function isRetryableGhlImportError(
  error: unknown,
  attemptCount: number,
  maxAttempts: number,
) {
  if (attemptCount >= maxAttempts) {
    return false;
  }

  if (error instanceof LeadConnectorApiError) {
    return error.status === 429 || error.status >= 500;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|rate limit|temporar|ECONNRESET|fetch failed/i.test(message);
}
