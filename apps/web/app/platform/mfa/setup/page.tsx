import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePlatformStaffAccess } from "@/lib/platform/auth";
import {
  enrollPlatformTotp,
  getVerifiedTotpFactors,
  verifyPlatformTotpCode,
} from "@/lib/platform/mfa";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function verifySetupTotp(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();
  await verifyPlatformTotpCode(supabase, {
    factorId: String(formData.get("factorId") ?? ""),
    code: String(formData.get("code") ?? ""),
  });
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
    <main className="min-h-dvh bg-[#0f1115] px-6 py-8 text-[#f2f4f8]">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="border-b border-[#30343b] pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#88d498]">
            Platform MFA
          </p>
          <h1 className="mt-2 text-3xl font-black">Set up multi-factor authentication</h1>
          <p className="mt-3 text-sm leading-6 text-[#a6adbb]">
            Scan the TOTP QR code in your authenticator app, then enter the current code.
          </p>
        </header>

        <div className="rounded-md border border-[#30343b] bg-[#171a20] p-4">
          {enrollment.totp?.qr_code ? (
            <img
              alt="Platform TOTP enrollment QR code"
              className="h-48 w-48 rounded-md bg-white p-2"
              src={enrollment.totp.qr_code}
            />
          ) : null}
          {enrollment.totp?.secret ? (
            <p className="mt-4 break-all rounded-md bg-[#080a0e] p-3 font-mono text-sm text-[#f2f4f8]">
              {enrollment.totp.secret}
            </p>
          ) : null}
        </div>

        <form action={verifySetupTotp} className="flex flex-col gap-3">
          <input name="factorId" type="hidden" value={enrollment.id} />
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

        <Link className="text-sm font-semibold text-[#88d498]" href="/platform/mfa/verify">
          Already enrolled? Verify instead.
        </Link>
      </section>
    </main>
  );
}
