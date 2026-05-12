import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type GenerateInviteAuthLinkInput = {
  email: string;
  redirectTo: string;
  metadata: Record<string, string>;
};

export async function generateInviteAuthLink(input: GenerateInviteAuthLinkInput) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: {
      redirectTo: input.redirectTo,
      data: input.metadata,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const actionLink = data?.properties?.action_link;

  if (!actionLink) {
    throw new Error("Supabase did not return an invite action link");
  }

  return actionLink;
}
