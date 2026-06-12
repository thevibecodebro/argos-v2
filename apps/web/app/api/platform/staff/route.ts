import { NextResponse } from "next/server";
import { fromServiceResult } from "@/lib/http";
import { getPlatformApiAccess } from "@/lib/platform/auth";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import {
  grantPlatformStaffAccess,
  revokePlatformStaffAccess,
} from "@/lib/platform/staff";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await getPlatformApiAccess();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const payload = (await request.json()) as {
    email?: unknown;
    reason?: unknown;
    role?: unknown;
  };
  const result = await grantPlatformStaffAccess(
    createPlatformRepository(),
    {
      email: access.user.email,
      role: access.staff.role,
      userId: access.staff.userId,
    },
    payload,
  );

  return fromServiceResult(result);
}

export async function DELETE(request: Request) {
  const access = await getPlatformApiAccess();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const payload = (await request.json()) as {
    reason?: unknown;
    userId?: unknown;
  };
  const result = await revokePlatformStaffAccess(
    createPlatformRepository(),
    {
      email: access.user.email,
      role: access.staff.role,
      userId: access.staff.userId,
    },
    payload,
  );

  return fromServiceResult(result);
}
