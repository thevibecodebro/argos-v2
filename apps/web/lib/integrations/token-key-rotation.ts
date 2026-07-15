import "server-only";
import { eq } from "drizzle-orm";
import {
  getDb,
  ghlIntegrationsTable,
  googleMeetIntegrationsTable,
  platformAuditEventsTable,
  zoomIntegrationsTable,
  type ArgosDb,
} from "@argos-v2/db";
import {
  decryptIntegrationToken,
  encryptIntegrationToken,
} from "./token-encryption";

const ROTATION_CONFIRMATION = "ROTATE INTEGRATION TOKENS";

type RotationEnv = Partial<
  Record<
    "ARGOS_TOKEN_ENCRYPTION_KEY" | "ARGOS_TOKEN_ENCRYPTION_KEY_NEXT",
    string | undefined
  >
>;

type RotationActor = {
  email?: string | null;
  role: "owner" | "operator";
  userId: string;
};

type RotationCounts = {
  ghlIntegrations: number;
  googleMeetIntegrations: number;
  zoomIntegrations: number;
};

type RotationStoreInput = {
  actor: RotationActor;
  currentKey: string;
  nextKey: string;
  reason: string;
};

export type IntegrationTokenRotationStore = {
  rotate(input: RotationStoreInput): Promise<RotationCounts>;
};

export function rotateTokenValue(
  value: string,
  currentKey: string,
  nextKey: string,
) {
  const plaintext = decryptIntegrationToken(value, {
    ARGOS_TOKEN_ENCRYPTION_KEY: currentKey,
  });

  return encryptIntegrationToken(plaintext, {
    ARGOS_TOKEN_ENCRYPTION_KEY: nextKey,
  });
}

function rotateNullableTokenValue(
  value: string | null,
  currentKey: string,
  nextKey: string,
) {
  return value === null ? null : rotateTokenValue(value, currentKey, nextKey);
}

export function createIntegrationTokenRotationStore(
  db: ArgosDb = getDb(),
): IntegrationTokenRotationStore {
  return {
    async rotate(input) {
      return db.transaction(async (transaction) => {
        const [zoomRows, ghlRows, googleMeetRows] = await Promise.all([
          transaction
            .select({
              accessToken: zoomIntegrationsTable.accessToken,
              id: zoomIntegrationsTable.id,
              refreshToken: zoomIntegrationsTable.refreshToken,
              webhookToken: zoomIntegrationsTable.webhookToken,
            })
            .from(zoomIntegrationsTable),
          transaction
            .select({
              accessToken: ghlIntegrationsTable.accessToken,
              id: ghlIntegrationsTable.id,
              refreshToken: ghlIntegrationsTable.refreshToken,
            })
            .from(ghlIntegrationsTable),
          transaction
            .select({
              accessToken: googleMeetIntegrationsTable.accessToken,
              id: googleMeetIntegrationsTable.id,
              refreshToken: googleMeetIntegrationsTable.refreshToken,
            })
            .from(googleMeetIntegrationsTable),
        ]);
        const updatedAt = new Date();

        for (const row of zoomRows) {
          await transaction
            .update(zoomIntegrationsTable)
            .set({
              accessToken: rotateTokenValue(
                row.accessToken,
                input.currentKey,
                input.nextKey,
              ),
              refreshToken: rotateTokenValue(
                row.refreshToken,
                input.currentKey,
                input.nextKey,
              ),
              updatedAt,
              webhookToken: rotateNullableTokenValue(
                row.webhookToken,
                input.currentKey,
                input.nextKey,
              ),
            })
            .where(eq(zoomIntegrationsTable.id, row.id));
        }

        for (const row of ghlRows) {
          await transaction
            .update(ghlIntegrationsTable)
            .set({
              accessToken: rotateTokenValue(
                row.accessToken,
                input.currentKey,
                input.nextKey,
              ),
              refreshToken: rotateTokenValue(
                row.refreshToken,
                input.currentKey,
                input.nextKey,
              ),
              updatedAt,
            })
            .where(eq(ghlIntegrationsTable.id, row.id));
        }

        for (const row of googleMeetRows) {
          await transaction
            .update(googleMeetIntegrationsTable)
            .set({
              accessToken: rotateTokenValue(
                row.accessToken,
                input.currentKey,
                input.nextKey,
              ),
              refreshToken: rotateTokenValue(
                row.refreshToken,
                input.currentKey,
                input.nextKey,
              ),
              updatedAt,
            })
            .where(eq(googleMeetIntegrationsTable.id, row.id));
        }

        const counts = {
          ghlIntegrations: ghlRows.length,
          googleMeetIntegrations: googleMeetRows.length,
          zoomIntegrations: zoomRows.length,
        };

        await transaction.insert(platformAuditEventsTable).values({
          action: "platform.integration_tokens.rotate_key",
          metadata: counts,
          reason: input.reason,
          resourceType: "integration_tokens",
          staffEmailSnapshot: input.actor.email?.trim() || null,
          staffRoleSnapshot: input.actor.role,
          staffUserId: input.actor.userId,
        });

        return counts;
      });
    },
  };
}

export async function rotateIntegrationTokenKey(
  store: IntegrationTokenRotationStore,
  actor: RotationActor,
  payload: {
    confirmation?: unknown;
    reason?: unknown;
  },
  env: RotationEnv = process.env as RotationEnv,
) {
  if (actor.role !== "owner") {
    return {
      error: "Platform owner access required",
      ok: false as const,
      status: 403 as const,
    };
  }

  if (payload.confirmation !== ROTATION_CONFIRMATION) {
    return {
      error: "Explicit rotation confirmation is required",
      ok: false as const,
      status: 400 as const,
    };
  }

  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
  if (reason.length < 10 || reason.length > 200) {
    return {
      error: "Rotation reason must be between 10 and 200 characters",
      ok: false as const,
      status: 400 as const,
    };
  }

  const currentKey = env.ARGOS_TOKEN_ENCRYPTION_KEY?.trim();
  const nextKey = env.ARGOS_TOKEN_ENCRYPTION_KEY_NEXT?.trim();
  if (!currentKey || !nextKey || currentKey === nextKey) {
    return {
      error: "Integration token key rotation is not configured",
      ok: false as const,
      status: 503 as const,
    };
  }

  try {
    encryptIntegrationToken("rotation-key-validation", {
      ARGOS_TOKEN_ENCRYPTION_KEY: currentKey,
    });
    encryptIntegrationToken("rotation-key-validation", {
      ARGOS_TOKEN_ENCRYPTION_KEY: nextKey,
    });
  } catch {
    return {
      error: "Integration token key rotation is not configured",
      ok: false as const,
      status: 503 as const,
    };
  }

  const data = await store.rotate({
    actor,
    currentKey,
    nextKey,
    reason,
  });

  return { data, ok: true as const };
}
