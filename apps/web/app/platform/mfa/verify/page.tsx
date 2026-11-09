import { PlatformMfaEntryView } from "@/components/auth/entry-views";
import { redirect } from "next/navigation";
import { PlatformMfaCodeForm, type PlatformMfaFormState } from "../mfa-code-form";
import { requirePlatformStaffAccess } from "@/lib/platform/auth";
import {
  getVerifiedTotpFactors,
  verifyPlatformTotpCode,
} from "@/lib/platform/mfa";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function verifyExistingTotp(
  _state: PlatformMfaFormState,
  formData: FormData,
): Promise<PlatformMfaFormState> {
  "use server";

  const supabase = await createSupabaseServerClient();

  try {
    await verifyPlatformTotpCode(supabase, {
      factorId: String(formData.get("factorId") ?? ""),
      code: String(formData.get("code") ?? ""),
    });
  } catch {
    return {
      error: "That code could not be verified. Check your authenticator app and try again.",
    };
  }

  redirect("/platform/dashboard");
}

export default async function PlatformMfaVerifyPage() {
  await requirePlatformStaffAccess({
    pathname: "/platform/mfa/verify",
    allowMfaVerify: true,
  });

  const supabase = await createSupabaseServerClient();
  const [factor] = await getVerifiedTotpFactors(supabase);

  if (!factor) {
    redirect("/platform/mfa/setup");
  }

  return (
    <PlatformMfaEntryView mode="verify">
      <PlatformMfaCodeForm action={verifyExistingTotp} factorId={factor.id} />
    </PlatformMfaEntryView>
  );
}
