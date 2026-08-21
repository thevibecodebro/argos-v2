import {
  GoogleWorkspaceApiError,
  GoogleWorkspaceTimeoutError,
  refreshGoogleToken,
} from "@argos-v2/google-workspace-client";
import { storeCallSourceAsset } from "../calls/storage";
import { createGoogleMeetImportClient } from "./client";
import { processGoogleMeetImport } from "./process-google-meet-import";
import type { GoogleMeetImportRepository } from "./repository";

type PollGoogleMeetImportsInput = {
  clientId: string;
  clientSecret: string;
  createClient?: typeof createGoogleMeetImportClient;
  maxSourceBytes: number;
  once?: boolean;
  pollIntervalMs?: number;
  refreshTokens?: typeof refreshGoogleToken;
  repository: GoogleMeetImportRepository;
  sleep?: (ms: number) => Promise<void>;
};

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function pollGoogleMeetImports(input: PollGoogleMeetImportsInput) {
  const sleep = input.sleep ?? defaultSleep;
  const createClient = input.createClient ?? createGoogleMeetImportClient;
  const refreshTokens = input.refreshTokens ?? refreshGoogleToken;

  do {
    const claimed = await input.repository.claimNextGoogleMeetImport(new Date());

    if (claimed) {
      try {
        if (!(await input.repository.organizationHasIntegrationCapability(claimed.orgId))) {
          await input.repository.markGoogleMeetImportSkipped(claimed.id, {
            reason: "capability_disabled",
          });
          if (input.once) return;
          await sleep(input.pollIntervalMs ?? 5_000);
          continue;
        }
        const integration =
          await input.repository.findGoogleMeetIntegrationForImport({
            integrationId: claimed.integrationId,
            orgId: claimed.orgId,
          });
        let accessToken = integration?.accessToken ?? "";

        if (integration && integration.tokenExpiresAt <= new Date()) {
          const refreshed = await refreshTokens({
            clientId: input.clientId,
            clientSecret: input.clientSecret,
            refreshToken: integration.refreshToken,
          });
          await input.repository.updateGoogleMeetTokens(
            integration.orgId,
            refreshed,
          );
          accessToken = refreshed.accessToken;
        }

        if (!(await input.repository.organizationHasIntegrationCapability(claimed.orgId))) {
          await input.repository.markGoogleMeetImportSkipped(claimed.id, {
            reason: "capability_disabled",
          });
          if (input.once) return;
          await sleep(input.pollIntervalMs ?? 5_000);
          continue;
        }

        await processGoogleMeetImport({
          client: createClient(accessToken),
          getActiveRubricId: (orgId) =>
            input.repository.findActiveRubricIdByOrgId(orgId),
          importRecord: claimed,
          maxSourceBytes: input.maxSourceBytes,
          repository: input.repository,
          storeSourceAsset: storeCallSourceAsset,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isRetryable(error, claimed.attemptCount, claimed.maxAttempts)) {
          await input.repository.markGoogleMeetImportRetryable(claimed, message);
        } else if (
          error instanceof GoogleWorkspaceApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          await input.repository.markGoogleMeetImportSkipped(claimed.id, {
            reason: "unauthorized_after_refresh",
          });
        } else {
          await input.repository.markGoogleMeetImportFailed(claimed.id, message);
        }
      }
    }

    if (input.once) {
      return;
    }
    await sleep(input.pollIntervalMs ?? 5_000);
  } while (true);
}

function isRetryable(
  error: unknown,
  attemptCount: number,
  maxAttempts: number,
) {
  if (attemptCount >= maxAttempts) {
    return false;
  }
  if (error instanceof GoogleWorkspaceTimeoutError) {
    return true;
  }
  if (error instanceof GoogleWorkspaceApiError) {
    return error.status === 429 || error.status >= 500;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|rate limit|temporar|ECONNRESET|fetch failed/i.test(
    message,
  );
}
