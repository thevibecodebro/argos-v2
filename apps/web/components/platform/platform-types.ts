export type PlatformRole = "owner" | "operator";
export type PlatformStaffStatus = "active" | "revoked";

export type PlatformConsoleOrganization = {
  createdAt: string;
  id: string;
  name: string;
  plan: string;
  slug: string;
};

export type PlatformConsoleStaffMember = {
  createdAt: string;
  email: string | null;
  role: PlatformRole;
  status: PlatformStaffStatus;
  updatedAt: string;
  userId: string;
};

export type PlatformConsoleActiveSession = {
  expiresAt: string;
  id: string;
  reason: string;
  targetOrgId: string | null;
  targetOrgName: string;
  targetOrgSlug: string;
};

export type PlatformRecentSession = {
  endedAt: string | null;
  expiresAt: string;
  id: string;
  reason: string;
  staffEmailSnapshot: string | null;
  startedAt: string;
  status: "active" | "ended" | "expired";
  targetOrgName: string;
  targetOrgSlug: string;
};

export type PlatformAuditEvent = {
  action: string;
  createdAt: string;
  id: string;
  reason: string;
  resourceType: string;
  staffEmailSnapshot: string | null;
};
