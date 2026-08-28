import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isRetryableSupabaseAuthError } from "@/lib/supabase/auth-errors";

export async function getAuthenticatedSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  try {
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
  } catch (error) {
    if (isRetryableSupabaseAuthError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getAuthenticatedSupabaseClaims() {
  const supabase = await createSupabaseServerClient();

  try {
    const { data, error } = await supabase.auth.getClaims();

    if (error) {
      if (error.message === "Auth session missing!") {
        return null;
      }

      throw new Error(error.message);
    }

    return data?.claims ?? null;
  } catch (error) {
    if (isRetryableSupabaseAuthError(error)) {
      return null;
    }

    throw error;
  }
}
