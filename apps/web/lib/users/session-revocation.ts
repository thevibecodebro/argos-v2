import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AuthSessionRevoker {
  revokeUserSessions(userId: string): Promise<void>;
}

export class SupabaseAuthSessionRevoker implements AuthSessionRevoker {
  constructor(
    private readonly supabase = createSupabaseAdminClient(),
  ) {}

  async revokeUserSessions(userId: string) {
    // Supabase JS exposes user-id access suspension, not user-id refresh-token revocation.
    // App-side org detachment removes tenant access immediately; this blocks future refresh/sign-in.
    const { error } = await this.supabase.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });

    if (error) {
      throw new Error(
        `Failed to suspend Supabase auth access for ${userId}: ${error.message}`,
      );
    }
  }
}
