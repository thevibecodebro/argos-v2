import { PlatformMfaEntryView } from "@/components/auth/entry-views";
import { redirect } from "next/navigation";
import { PlatformMfaCodeForm, type PlatformMfaFormState } from "../mfa-code-form";
import { requirePlatformStaffAccess } from "@/lib/platform/auth";
import {
  enrollPlatformTotp,
  getVerifiedTotpFactors,
  verifyPlatformTotpCode,
} from "@/lib/platform/mfa";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function verifySetupTotp(
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

export default async function PlatformMfaSetupPage() {
  await requirePlatformStaffAccess({
    pathname: "/platform/mfa/setup",
    allowMfaSetup: true,
  });

  const supabase = await createSupabaseServerClient();
  const verifiedFactors = await getVerifiedTotpFactors(supabase);

  if (verifiedFactors.length > 0) {
    redirect("/platform/mfa/verify");
  }

  const enrollment = await enrollPlatformTotp(supabase);

  return (
    <PlatformMfaEntryView mode="setup" qrCode={enrollment.totp?.qr_code} secret={enrollment.totp?.secret}>
      <PlatformMfaCodeForm action={verifySetupTotp} factorId={enrollment.id} />
    </PlatformMfaEntryView>
  );
}
