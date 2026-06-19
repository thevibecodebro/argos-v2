import Link from "next/link";
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
    <main className="min-h-dvh bg-[#0f1115] px-6 py-8 text-[#f2f4f8]">
      <section className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <header className="border-b border-[#30343b] pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#88d498]">
            Agency MFA
          </p>
          <h1 className="mt-2 text-3xl font-black">Verify multi-factor authentication</h1>
          <p className="mt-3 text-sm leading-6 text-[#a6adbb]">
            Enter the current code from your authenticator app to continue to Agency tools.
          </p>
        </header>

        <PlatformMfaCodeForm action={verifyExistingTotp} factorId={factor.id} />

        <Link className="text-sm font-semibold text-[#88d498]" href="/platform/mfa/setup">
          Need to set up a new factor?
        </Link>
      </section>
    </main>
  );
}
