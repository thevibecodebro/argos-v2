"use client";

import { useState } from "react";
import { Button, cn } from "@argos-v2/ui";
import { buildAuthRedirectUrl, getBrowserWebEnvConfigurationError } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const configurationError = getBrowserWebEnvConfigurationError();
  const authEnabled = configurationError === null;

  function buildConfigurationMessage() {
    if (!configurationError) {
      return null;
    }

    return `${configurationError} If you just added apps/web/.env.local, restart the Next.js dev server.`;
  }

  async function handleEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const configurationMessage = buildConfigurationMessage();

    if (configurationMessage) {
      setStatus("idle");
      setErrorMessage(configurationMessage);
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = buildAuthRedirectUrl(nextPath, {
        runtimeOrigin: window.location.origin,
      });
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
    } catch (error) {
      setStatus("idle");
      setErrorMessage(error instanceof Error ? error.message : "Unable to start sign-in.");
    }
  }

  async function handleGoogleSignIn() {
    const configurationMessage = buildConfigurationMessage();

    if (configurationMessage) {
      setErrorMessage(configurationMessage);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = buildAuthRedirectUrl(nextPath, {
        runtimeOrigin: window.location.origin,
      });

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        setErrorMessage(error.message);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start sign-in.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-[1.75rem] border border-[#182748] bg-[#101a30] p-5 text-left shadow-[0_18px_50px_rgba(2,8,23,0.35)] sm:p-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5aa0ff]">
          Secure Access
        </p>
        <h2 className="text-[2rem] font-semibold tracking-tight text-white sm:text-[2.35rem]">
          Sign in to continue
        </h2>
        <p className="text-base leading-7 text-[#8091b5]">
          Use Google or a passwordless magic link. After sign-in, you&apos;ll be returned to{" "}
          <span className="font-semibold text-[#dbe6ff]">{nextPath}</span>.
        </p>
      </div>

      <div className="mt-6">
        <Button
          className={cn(
            "!min-h-14 !w-full !rounded-[1.15rem] !bg-[#101a30] !px-6 !text-lg !font-semibold !text-[#dbe7ff] !shadow-none ring-1 !ring-[#253454] hover:!bg-[#12203c]",
          )}
          disabled={!authEnabled}
          onClick={handleGoogleSignIn}
          type="button"
          variant="secondary"
        >
          Continue with Google
        </Button>
      </div>

      <div className="my-5 flex items-center gap-4">
        <div className="h-px flex-1 bg-[#203152]" />
        <span className="text-sm uppercase tracking-[0.24em] text-[#5f7094]">or</span>
        <div className="h-px flex-1 bg-[#203152]" />
      </div>

      <form className="space-y-4" onSubmit={handleEmailSignIn}>
        <label className="block space-y-2">
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-[#5f7094]">
            Work Email
          </span>
          <input
            autoComplete="email"
            className="w-full rounded-[1.15rem] border border-[#223250] bg-[#0b1428] px-4 py-4 text-lg text-[#eef4ff] outline-none transition placeholder:text-[#56688d] focus:border-[#3f7fff] focus:ring-4 focus:ring-[#3f7fff]/15"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
            type="email"
            value={email}
          />
        </label>

        <Button
          className={cn(
            "!min-h-16 !w-full !rounded-[1.3rem] !bg-[#2c63f6] !px-6 !text-xl !font-semibold !text-white !shadow-none hover:!bg-[#4476ff]",
          )}
          disabled={status === "submitting" || !authEnabled}
          type="submit"
        >
          {status === "submitting" ? "Sending link..." : "Send magic link"}
        </Button>
      </form>

      {!authEnabled ? (
        <p className="mt-4 rounded-[1rem] border border-[#4a3c1e] bg-[#231b0a] px-4 py-3 text-sm text-[#f2d089]">
          {buildConfigurationMessage()}
        </p>
      ) : null}

      {status === "sent" ? (
        <p className="mt-4 rounded-[1rem] border border-[#19493c] bg-[#0c221d] px-4 py-3 text-sm text-[#79d7bc]">
          Check your inbox. The magic link will complete sign-in and return you to your
          requested page.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-[1rem] border border-[#4f2941] bg-[#24111b] px-4 py-3 text-sm text-[#f0b8c8]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
