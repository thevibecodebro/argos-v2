import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { parseAppUserRole } from "@/lib/users/roles";
import type { ProvisioningRepository } from "./service";

type ExistingUserRow = Pick<Tables<"users">, "id" | "org_id" | "email" | "role">;
type OrganizationInsert = TablesInsert<"organizations">;
type UserInsert = TablesInsert<"users">;

export class SupabaseProvisioningRepository implements ProvisioningRepository {
  private readonly supabase = createSupabaseAdminClient();

  async findUserById(userId: string) {
    const { data, error } = await this.supabase
      .from("users")
      .select("id, org_id, email, role")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const user = data as ExistingUserRow | null;

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      orgId: user.org_id,
      email: user.email,
      role: parseAppUserRole(user.role),
    };
  }

  async createOrganization(input: { name: string; slug: string; plan: string }) {
    const organizationInsert: OrganizationInsert = input;
    const { data, error } = await this.supabase
      .from("organizations")
      .insert(organizationInsert)
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async createUser(input: {
    id: string;
    orgId: string;
    email: string;
    role: "admin";
    firstName: string | null;
    lastName: string | null;
    displayNameSet: boolean;
  }) {
    const userInsert: UserInsert = {
      id: input.id,
      org_id: input.orgId,
      email: input.email,
      role: input.role,
      first_name: input.firstName,
      last_name: input.lastName,
      display_name_set: input.displayNameSet,
    };
    const { error } = await this.supabase.from("users").insert(userInsert);

    if (error) {
      throw new Error(error.message);
    }
  }
}
