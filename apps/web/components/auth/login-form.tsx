"use client";

import Link from "next/link";
import { useState } from "react";
import { buildAuthRedirectUrl, getBrowserWebEnvConfigurationError } from "@/lib/env";

type LoginFormProps = {
  nextPath: string;
};

async function getSupabaseBrowserClient() {
  const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
  return createSupabaseBrowserClient();
}

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
      const supabase = await getSupabaseBrowserClient();
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
      const supabase = await getSupabaseBrowserClient();
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
    <>
      <div className="space-y-2">
        <h1
          className="font-[var(--font-display)] text-4xl font-bold tracking-tight text-[var(--forge-text)]"
          style={{
            fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
          }}
        >
          Welcome back
        </h1>
        <p
          className="text-sm uppercase tracking-[0.15em] text-[var(--forge-muted)]"
          style={{ fontFamily: "var(--font-body, 'Source Sans 3', sans-serif)" }}
        >
          Continue to call review, scorecards, training, and roleplay.
        </p>
      </div>

      <div className="space-y-6">
        <div className="sr-only" role="status" aria-live="polite">
          {status === "submitting" ? "Sending sign-in link." : status === "sent" ? "Sign-in link sent." : ""}
        </div>
        <button
          className="forge-button forge-button-secondary forge-focus-ring w-full py-3.5"
          disabled={!authEnabled}
          onClick={handleGoogleSignIn}
          type="button"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center space-x-4">
          <div className="h-px flex-1 bg-[linear-gradient(to_right,transparent,var(--forge-border))]" />
          <span
            className="text-[10px] uppercase tracking-[0.2em] text-[var(--forge-muted)]"
            style={{ fontFamily: "var(--font-body, 'Source Sans 3', sans-serif)" }}
          >
            OR
          </span>
          <div className="h-px flex-1 bg-[linear-gradient(to_left,transparent,var(--forge-border))]" />
        </div>

        <form className="space-y-6" onSubmit={handleEmailSignIn}>
          <div className="space-y-2">
            <label
              className="block pl-1 text-[10px] uppercase tracking-[0.15em] text-[var(--forge-muted)]"
              htmlFor="auth-email"
              style={{ fontFamily: "var(--font-body, 'Source Sans 3', sans-serif)" }}
            >
              Work Email
            </label>
            <div className="relative group">
              <input
                autoComplete="email"
                className="forge-form-control px-5 py-4 text-base outline-none"
                id="auth-email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
                type="email"
                value={email}
                style={{ fontFamily: "var(--font-body, 'Source Sans 3', sans-serif)" }}
              />
            </div>
          </div>

          <button
            className="forge-button forge-button-primary forge-focus-ring w-full py-4 disabled:opacity-50"
            disabled={status === "submitting" || !authEnabled}
            type="submit"
          >
            {status === "submitting" ? "Sending link..." : "Access Dashboard"}
          </button>
        </form>
      </div>

      <p
        className="text-center text-[11px] leading-6 text-[var(--forge-muted)]"
        style={{ fontFamily: "var(--font-body, 'Source Sans 3', sans-serif)" }}
      >
        By continuing, you agree to our{" "}
        <Link className="forge-focus-ring rounded text-[var(--forge-gold)] underline-offset-4 hover:underline" href="/privacy-policy">
          Privacy Policy
        </Link>
        ,{" "}
        <Link className="forge-focus-ring rounded text-[var(--forge-gold)] underline-offset-4 hover:underline" href="/terms-of-service">
          Terms of Service
        </Link>
        , and{" "}
        <Link className="forge-focus-ring rounded text-[var(--forge-gold)] underline-offset-4 hover:underline" href="/security-policy">
          Security Policy
        </Link>
        .
      </p>

      {!authEnabled ? (
        <p
          className="rounded-xl border border-[rgba(255,159,95,0.26)] bg-[rgba(255,159,95,0.1)] px-4 py-3 text-sm text-[var(--forge-ember)]"
          role="alert"
        >
          {buildConfigurationMessage()}
        </p>
      ) : null}

      {status === "sent" ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-[rgba(139,215,168,0.24)] bg-[rgba(139,215,168,0.1)] px-4 py-3 text-sm text-[var(--forge-success)]"
          role="status"
        >
          Check your inbox. The magic link will complete sign-in and return you to your requested page.
        </p>
      ) : null}

      {errorMessage ? (
        <p
          className="rounded-xl border border-[rgba(255,113,108,0.24)] bg-[rgba(255,113,108,0.1)] px-4 py-3 text-sm text-[var(--forge-danger)]"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}
