import { getServerEnv } from "@/lib/server-env";

export interface AuthSessionRevoker {
  revokeUserSessions(userId: string): Promise<void>;
}

export class SupabaseAuthSessionRevoker implements AuthSessionRevoker {
  async revokeUserSessions(userId: string) {
    const { supabaseUrl, supabaseServiceRoleKey } = getServerEnv();
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}/logout`,
      {
        method: "POST",
        headers: {
          apikey: supabaseServiceRoleKey,
          authorization: `Bearer ${supabaseServiceRoleKey}`,
        },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to revoke Supabase sessions for ${userId}: ${response.status} ${body.slice(0, 200)}`,
      );
    }
  }
}
