import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthenticatedSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (error.message === "Auth session missing!") {
      return null;
    }

    throw new Error(error.message);
  }

  return user;
}
