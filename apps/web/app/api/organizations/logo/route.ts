import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createEffectiveTenantUsersRepository } from "@/lib/platform/effective-request";
import { readRequestFormDataWithLimit } from "@/lib/security/request-body";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createUsersRepository } from "@/lib/users/create-repository";
import {
  getCurrentUserDetails,
  updateOrganizationLogo,
} from "@/lib/users/service";

const LOGO_BUCKET = "org-assets";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_LOGO_REQUEST_BYTES = MAX_LOGO_BYTES + 64 * 1024;
const LOGO_MIME_EXTENSIONS = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

export const dynamic = "force-dynamic";

type LogoFile = File & {
  size: number;
  type: string;
};

function isLogoFile(value: FormDataEntryValue | null): value is LogoFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    "type" in value
  );
}

function errorJson(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function requireBrandingAdmin(authUserId: string) {
  const repository = await createEffectiveTenantUsersRepository(
    createUsersRepository(),
    authUserId,
  );
  const userResult = await getCurrentUserDetails(repository, authUserId);

  if (!userResult.ok) {
    return { ok: false as const, response: fromServiceResult(userResult) };
  }

  const user = userResult.data;

  if (!user.orgId || !user.org) {
    return {
      ok: false as const,
      response: errorJson("You are not part of an organization."),
    };
  }

  if (user.role !== "admin") {
    return {
      ok: false as const,
      response: errorJson("Only admins can update organization branding.", 403),
    };
  }

  return { ok: true as const, repository, user };
}

function getOrgAssetPath(logoUrl: string | null | undefined) {
  if (!logoUrl) return null;

  try {
    const url = new URL(logoUrl);
    const marker = `/storage/v1/object/public/${LOGO_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const admin = await requireBrandingAdmin(authUser.id);

    if (!admin.ok) {
      return admin.response;
    }

    const formDataResult = await readRequestFormDataWithLimit(request, MAX_LOGO_REQUEST_BYTES);

    if (!formDataResult.ok) {
      return formDataResult.reason === "too_large"
        ? errorJson("Logo must be 2 MB or smaller.", 413)
        : errorJson("Choose a logo file to upload.");
    }

    const formData = formDataResult.formData;
    const logo = formData.get("logo");

    if (!isLogoFile(logo)) {
      return errorJson("Choose a logo file to upload.");
    }

    const contentType = logo.type.toLowerCase();
    const extension = LOGO_MIME_EXTENSIONS.get(contentType);

    if (!extension) {
      return errorJson("Upload a PNG, JPG, or WebP logo.");
    }

    if (logo.size > MAX_LOGO_BYTES) {
      return errorJson("Logo must be 2 MB or smaller.", 413);
    }

    const storagePath = `org-logos/${admin.user.orgId}.${extension}`;
    const bucket = createSupabaseAdminClient().storage.from(LOGO_BUCKET);
    const { error: uploadError } = await bucket.upload(storagePath, logo, {
      cacheControl: "3600",
      contentType,
      upsert: true,
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = bucket.getPublicUrl(storagePath);

    return fromServiceResult(
      await updateOrganizationLogo(
        admin.repository,
        authUser.id,
        data.publicUrl,
      ),
    );
  } catch (error) {
    console.error("Failed to upload organization logo", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const admin = await requireBrandingAdmin(authUser.id);

    if (!admin.ok) {
      return admin.response;
    }

    const currentStoragePath = getOrgAssetPath(admin.user.org?.logoUrl);
    const bucket = createSupabaseAdminClient().storage.from(LOGO_BUCKET);

    if (currentStoragePath) {
      const { error: removeError } = await bucket.remove([currentStoragePath]);

      if (removeError) {
        throw new Error(removeError.message);
      }
    }

    return fromServiceResult(
      await updateOrganizationLogo(admin.repository, authUser.id, null),
    );
  } catch (error) {
    console.error("Failed to remove organization logo", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
