import { refreshGoogleToken } from "@argos-v2/google-workspace-client";
import { createGoogleMeetSyncClient } from "./client";
import type { GoogleMeetImportRepository } from "./repository";
import { syncGoogleMeetIntegration } from "./sync-google-meet";

type PollGoogleMeetSyncInput = {
  clientId: string;
  clientSecret: string;
  createClient?: typeof createGoogleMeetSyncClient;
  minIntervalMs?: number;
  once?: boolean;
  pollIntervalMs?: number;
  refreshTokens?: typeof refreshGoogleToken;
  repository: GoogleMeetImportRepository;
  sleep?: (ms: number) => Promise<void>;
};

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function pollGoogleMeetSync(input: PollGoogleMeetSyncInput) {
  const sleep = input.sleep ?? defaultSleep;
  const createClient = input.createClient ?? createGoogleMeetSyncClient;
  const refreshTokens = input.refreshTokens ?? refreshGoogleToken;

  do {
    const now = new Date();
    const integrations =
      await input.repository.listDueGoogleMeetSyncIntegrations({
        limit: 10,
        minIntervalMs: input.minIntervalMs ?? 15 * 60 * 1000,
        now,
      });

    for (const integration of integrations) {
      try {
        if (!(await input.repository.organizationHasIntegrationCapability(integration.orgId))) {
          continue;
        }
        await input.repository.markGoogleMeetSyncStarted(integration.orgId, now);
        let accessToken = integration.accessToken;

        if (integration.tokenExpiresAt <= now) {
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

        if (!(await input.repository.organizationHasIntegrationCapability(integration.orgId))) {
          continue;
        }

        const result = await syncGoogleMeetIntegration({
          client: createClient(accessToken),
          integration: { ...integration, accessToken },
          now,
          repository: input.repository,
        });
        if (!(await input.repository.organizationHasIntegrationCapability(integration.orgId))) {
          continue;
        }
        await input.repository.markGoogleMeetSyncCompleted(integration.orgId, {
          cursor: result.cursor,
        });
      } catch (error) {
        await input.repository.markGoogleMeetSyncFailed(
          integration.orgId,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    if (input.once) {
      return;
    }
    await sleep(input.pollIntervalMs ?? 60_000);
  } while (true);
}
