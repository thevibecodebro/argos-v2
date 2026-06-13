import type {
  PlatformConsoleActiveSession,
  PlatformConsoleOrganization,
  PlatformConsoleStaffMember,
} from "./platform-console";

export const CREATE_ORGANIZATION_ENDPOINT = "/api/platform/organizations";
export const PLATFORM_SESSION_ENDPOINT = "/api/platform/sessions";
export const PLATFORM_STAFF_ENDPOINT = "/api/platform/staff";

export type PlatformConsoleFetcher = typeof fetch;

export type CreateOrganizationResponse = {
  invite: {
    email: string;
  };
  organization: PlatformConsoleOrganization;
};

export type CreateSessionResponse = {
  session: {
    expiresAt: string;
    id: string;
    reason: string;
    targetOrgId: string | null;
    targetOrgNameSnapshot: string | null;
    targetOrgSlugSnapshot: string | null;
  };
};

export type GrantStaffResponse = {
  staff: PlatformConsoleStaffMember;
};

function normalizeSlug(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

async function readJsonError(response: Response) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : "Request failed";
}

async function postJson<T>(
  fetcher: PlatformConsoleFetcher,
  endpoint: string,
  payload: Record<string, unknown>,
) {
  const response = await fetcher(endpoint, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  return (await response.json()) as T;
}

export function buildCreateOrganizationPayload(formData: FormData) {
  return {
    adminEmail: String(formData.get("adminEmail") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    plan: String(formData.get("plan") ?? "trial").trim(),
    reason: String(formData.get("reason") ?? "").trim(),
    slug: normalizeSlug(formData.get("slug")),
  };
}

export function buildSessionPayload(formData: FormData, fallbackOrgId: string | null) {
  const orgId = String(formData.get("orgId") ?? "").trim() || (fallbackOrgId ?? "");

  return {
    orgId,
    reason: String(formData.get("reason") ?? "").trim(),
  };
}

export function buildGrantStaffPayload(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    reason: String(formData.get("reason") ?? "").trim(),
    role: String(formData.get("role") ?? "operator").trim(),
  };
}

export function buildRevokeStaffPayload(userId: string, reason: string) {
  return {
    reason: reason.trim(),
    userId,
  };
}

export function submitCreateOrganization(
  fetcher: PlatformConsoleFetcher,
  formData: FormData,
) {
  return postJson<CreateOrganizationResponse>(
    fetcher,
    CREATE_ORGANIZATION_ENDPOINT,
    buildCreateOrganizationPayload(formData),
  );
}

export function submitCreateSession(
  fetcher: PlatformConsoleFetcher,
  formData: FormData,
  fallbackOrgId: string | null,
) {
  return postJson<CreateSessionResponse>(
    fetcher,
    PLATFORM_SESSION_ENDPOINT,
    buildSessionPayload(formData, fallbackOrgId),
  );
}

export async function submitEndSession(fetcher: PlatformConsoleFetcher) {
  const response = await fetcher(PLATFORM_SESSION_ENDPOINT, { method: "DELETE" });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }
}

export function submitGrantStaff(fetcher: PlatformConsoleFetcher, formData: FormData) {
  return postJson<GrantStaffResponse>(
    fetcher,
    PLATFORM_STAFF_ENDPOINT,
    buildGrantStaffPayload(formData),
  );
}

export async function submitRevokeStaff(
  fetcher: PlatformConsoleFetcher,
  userId: string,
  reason: string,
) {
  const response = await fetcher(PLATFORM_STAFF_ENDPOINT, {
    body: JSON.stringify(buildRevokeStaffPayload(userId, reason)),
    headers: { "Content-Type": "application/json" },
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }
}

export function toActiveSession(
  data: CreateSessionResponse,
  organizations: PlatformConsoleOrganization[],
): PlatformConsoleActiveSession {
  const targetOrg = organizations.find((org) => org.id === data.session.targetOrgId);

  return {
    expiresAt: data.session.expiresAt,
    id: data.session.id,
    reason: data.session.reason,
    targetOrgId: data.session.targetOrgId,
    targetOrgName: data.session.targetOrgNameSnapshot ?? targetOrg?.name ?? "Customer organization",
    targetOrgSlug: data.session.targetOrgSlugSnapshot ?? targetOrg?.slug ?? data.session.targetOrgId ?? "customer",
  };
}
