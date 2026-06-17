import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePlatformStaffAccess } from "@/lib/platform/auth";
import {
  getVerifiedTotpFactors,
  verifyPlatformTotpCode,
} from "@/lib/platform/mfa";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function verifyExistingTotp(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();
  await verifyPlatformTotpCode(supabase, {
    factorId: String(formData.get("factorId") ?? ""),
    code: String(formData.get("code") ?? ""),
  });
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

        <form action={verifyExistingTotp} className="flex flex-col gap-3">
          <input name="factorId" type="hidden" value={factor.id} />
          <label className="text-sm font-semibold" htmlFor="code">
            Authentication code
          </label>
          <input
            autoComplete="one-time-code"
            className="rounded-md border border-[#444955] bg-[#080a0e] px-3 py-2 text-base text-[#f2f4f8]"
            id="code"
            inputMode="numeric"
            name="code"
            pattern="[0-9]*"
            required
            type="text"
          />
          <button
            className="rounded-md bg-[#88d498] px-4 py-2 text-sm font-black text-[#0b0f0c] transition hover:bg-[#a5e7b1]"
            type="submit"
          >
            Verify and continue
          </button>
        </form>

        <Link className="text-sm font-semibold text-[#88d498]" href="/platform/mfa/setup">
          Need to set up a new factor?
        </Link>
      </section>
    </main>
  );
}
