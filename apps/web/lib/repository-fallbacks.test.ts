import { afterEach, describe, expect, it } from "vitest";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { createComplianceRepository } from "@/lib/compliance/create-repository";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { createNotificationsRepository } from "@/lib/notifications/create-repository";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { createTrainingRepository } from "@/lib/training/create-repository";
import { createUsersRepository } from "@/lib/users/create-repository";
import { SupabaseCallsRepository } from "@/lib/calls/supabase-repository";
import { SupabaseComplianceRepository } from "@/lib/compliance/supabase-repository";
import { SupabaseIntegrationsRepository } from "@/lib/integrations/supabase-repository";
import { SupabaseNotificationsRepository } from "@/lib/notifications/supabase-repository";
import { SupabaseRoleplayRepository } from "@/lib/roleplay/supabase-repository";
import { SupabaseTrainingRepository } from "@/lib/training/supabase-repository";
import { SupabaseUsersRepository } from "@/lib/users/supabase-repository";

const ORIGINAL_ENV = {
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

describe("repository fallbacks", () => {
  afterEach(() => {
    process.env.DATABASE_URL = ORIGINAL_ENV.DATABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_ENV.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_ENV.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("uses Supabase-backed repositories when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    expect(createCallsRepository()).toBeInstanceOf(SupabaseCallsRepository);
    expect(createNotificationsRepository()).toBeInstanceOf(SupabaseNotificationsRepository);
    expect(createTrainingRepository()).toBeInstanceOf(SupabaseTrainingRepository);
    expect(createRoleplayRepository()).toBeInstanceOf(SupabaseRoleplayRepository);
    expect(createUsersRepository()).toBeInstanceOf(SupabaseUsersRepository);
    expect(createIntegrationsRepository()).toBeInstanceOf(SupabaseIntegrationsRepository);
    expect(createComplianceRepository()).toBeInstanceOf(SupabaseComplianceRepository);
  });
});
