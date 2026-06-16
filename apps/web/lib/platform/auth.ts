import { redirect } from "next/navigation";
import { getLoginHref } from "@/lib/auth-routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPlatformRepository } from "./create-repository";
import { getVerifiedTotpFactors } from "./mfa";
import {
  isTrustedPlatformOwner,
  isTrustedPlatformOwnerEmail,
  normalizePlatformEmail,
} from "./trusted-owner";
import type {
  PlatformStaffRole,
  PlatformStaffStatus,
} from "./repository";

type PlatformAuthUser = {
  id: string;
  email?: string | null;
};

export type PlatformStaffRecord = {
  userId: string;
  role: PlatformStaffRole;
  status: PlatformStaffStatus;
  createdBy: string | null;
  revokedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
};

export type PlatformStaffRepository = {
  findStaffByUserId(userId: string): Promise<PlatformStaffRecord | null>;
  upsertStaff(input: {
    userId: string;
    role: PlatformStaffRole;
    status?: PlatformStaffStatus;
    createdBy?: string | null;
  }): Promise<PlatformStaffRecord>;
};

function getPlatformBootstrapOwnerEmails(env: NodeJS.ProcessEnv = process.env) {
  return new Set(
    (env.ARGOS_PLATFORM_BOOTSTRAP_OWNER_EMAILS ?? "")
      .split(",")
      .map(normalizePlatformEmail)
      .filter(Boolean),
  );
}

function isPlatformBootstrapOwner(user: PlatformAuthUser, env: NodeJS.ProcessEnv = process.env) {
  if (!user.email) {
    return false;
  }

  return getPlatformBootstrapOwnerEmails(env).has(normalizePlatformEmail(user.email));
}

export async function getPlatformStaffAfterProvisioning(
  repository: PlatformStaffRepository,
  user: PlatformAuthUser,
) {
  const existingStaff = await repository.findStaffByUserId(user.id);

  if (existingStaff) {
    return existingStaff;
  }

  if (isPlatformBootstrapOwner(user) || isTrustedPlatformOwnerEmail(user.email)) {
    return repository.upsertStaff({
      userId: user.id,
      role: "owner",
      status: "active",
      createdBy: null,
    });
  }

  return null;
}

export async function requirePlatformStaffAccess(options: {
  repository?: PlatformStaffRepository;
  pathname?: string;
  allowMfaSetup?: boolean;
  allowMfaVerify?: boolean;
} = {}) {
  const pathname = options.pathname ?? "/platform";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    redirect(getLoginHref(pathname));
  }

  const repository = options.repository ?? createPlatformRepository();
  const staff = await repository.findStaffByUserId(user.id);

  if (staff?.status !== "active") {
    redirect("/onboarding");
  }

  if (
    isTrustedPlatformOwner({
      email: user.email,
      role: staff.role,
      status: staff.status,
    })
  ) {
    return {
      user,
      staff,
    };
  }

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (assuranceError) {
    throw new Error(assuranceError.message);
  }

  if (assurance?.currentLevel !== "aal2") {
    if (options.allowMfaSetup || options.allowMfaVerify) {
      return {
        user,
        staff,
      };
    }

    const verifiedTotpFactors = await getVerifiedTotpFactors(supabase);
    redirect(verifiedTotpFactors.length > 0 ? "/platform/mfa/verify" : "/platform/mfa/setup");
  }

  return {
    user,
    staff,
  };
}

export async function getPlatformApiAccess(options: {
  repository?: PlatformStaffRepository;
} = {}): Promise<
  | {
      ok: true;
      user: PlatformAuthUser;
      staff: PlatformStaffRecord;
    }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
    }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const repository = options.repository ?? createPlatformRepository();
  const staff = await repository.findStaffByUserId(user.id);

  if (staff?.status !== "active") {
    return { ok: false, status: 403, error: "Platform access required" };
  }

  if (
    isTrustedPlatformOwner({
      email: user.email,
      role: staff.role,
      status: staff.status,
    })
  ) {
    return {
      ok: true,
      user,
      staff,
    };
  }

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (assuranceError) {
    throw new Error(assuranceError.message);
  }

  if (assurance?.currentLevel !== "aal2") {
    return { ok: false, status: 403, error: "Platform multi-factor authentication required" };
  }

  return {
    ok: true,
    user,
    staff,
  };
}
