"use client";

import { useState } from "react";
import { Button } from "@argos-v2/ui";
import { getWebEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { siteUrl } = getWebEnv();
    const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setStatus("idle");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  async function handleGoogleSignIn() {
    const supabase = createSupabaseBrowserClient();
    const { siteUrl } = getWebEnv();
    const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setErrorMessage(error.message);
    }
  }

  return (
    <div className="rounded-3xl border border-white/20 bg-white/75 p-8 shadow-[0_20px_80px_rgba(16,24,40,0.15)] backdrop-blur">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">
          Auth Foundation
        </p>
        <h2 className="text-3xl font-semibold text-slate-950">Sign in to Argos V2</h2>
        <p className="text-sm text-slate-600">
          This scaffold uses Supabase SSR. Magic link and Google sign-in both flow through
          the App Router callback route.
        </p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleEmailSignIn}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Work email</span>
          <input
            autoComplete="email"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
            type="email"
            value={email}
          />
        </label>

        <Button className="w-full" disabled={status === "submitting"} type="submit">
          {status === "submitting" ? "Sending link..." : "Send magic link"}
        </Button>
      </form>

      <div className="mt-4">
        <Button className="w-full" onClick={handleGoogleSignIn} type="button" variant="secondary">
          Continue with Google
        </Button>
      </div>

      {status === "sent" ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Check your inbox. The magic link will complete sign-in and return you to your
          requested page.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
