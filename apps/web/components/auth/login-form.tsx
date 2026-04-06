"use client";

import { useState } from "react";
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
    <>
      {/* Welcome message */}
      <div className="space-y-2">
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{
            color: "#ecedf6",
            fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
          }}
        >
          Welcome back
        </h1>
        <p
          className="text-sm uppercase tracking-[0.15em]"
          style={{ color: "#a9abb3", fontFamily: "var(--font-manrope, Manrope, sans-serif)" }}
        >
          Enter your credentials to continue
        </p>
      </div>

      {/* Auth actions */}
      <div className="space-y-6">
        {/* Google sign-in */}
        <button
          className="auth-glass auth-glow-button w-full py-3.5 rounded-xl flex items-center justify-center space-x-3 transition-all duration-300"
          style={{ border: "1px solid rgba(69,72,79,0.3)" }}
          disabled={!authEnabled}
          onClick={handleGoogleSignIn}
          type="button"
          onMouseOver={(e) => (e.currentTarget.style.background = "rgba(34,38,47,0.9)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "")}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span
            className="font-medium"
            style={{ color: "#ecedf6", fontFamily: "var(--font-manrope, Manrope, sans-serif)" }}
          >
            Continue with Google
          </span>
        </button>

        {/* OR divider */}
        <div className="flex items-center space-x-4">
          <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, rgba(69,72,79,0.3))" }} />
          <span
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{ color: "#a9abb3", fontFamily: "var(--font-manrope, Manrope, sans-serif)" }}
          >
            OR
          </span>
          <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, rgba(69,72,79,0.3))" }} />
        </div>

        {/* Email form */}
        <form className="space-y-6" onSubmit={handleEmailSignIn}>
          <div className="space-y-2">
            <label
              className="block text-[10px] uppercase tracking-[0.15em] pl-1"
              htmlFor="auth-email"
              style={{ color: "#a9abb3", fontFamily: "var(--font-manrope, Manrope, sans-serif)" }}
            >
              Work Email
            </label>
            <div className="relative group">
              <input
                autoComplete="email"
                className="w-full rounded-xl py-4 px-5 outline-none transition-all duration-300 focus:ring-0"
                id="auth-email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
                type="email"
                value={email}
                style={{
                  background: "#000000",
                  border: "1px solid rgba(69,72,79,0.2)",
                  color: "#ecedf6",
                  fontFamily: "var(--font-manrope, Manrope, sans-serif)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#4da0ff")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(69,72,79,0.2)")}
              />
            </div>
          </div>

          <button
            className="auth-primary-glow w-full py-4 font-bold rounded-xl transition-all duration-200 active:scale-[0.98]"
            disabled={status === "submitting" || !authEnabled}
            type="submit"
            style={{
              background: "linear-gradient(to right, #74b1ff, #54a3ff)",
              color: "#002f59",
              fontFamily: "var(--font-manrope, Manrope, sans-serif)",
              opacity: (status === "submitting" || !authEnabled) ? 0.7 : 1,
            }}
          >
            {status === "submitting" ? "Sending link..." : "Access Dashboard"}
          </button>
        </form>
      </div>

      {/* Footer microcopy */}
      <p
        className="text-center text-[11px]"
        style={{ color: "#a9abb3", fontFamily: "var(--font-manrope, Manrope, sans-serif)" }}
      >
        By continuing, you agree to our{" "}
        <a className="hover:underline underline-offset-4" href="#" style={{ color: "#74b1ff" }}>
          Security Protocol
        </a>{" "}
        and{" "}
        <a className="hover:underline underline-offset-4" href="#" style={{ color: "#74b1ff" }}>
          Terms of Access
        </a>
        .
      </p>

      {/* Status messages */}
      {!authEnabled ? (
        <p className="rounded-xl border border-[#4a3c1e] bg-[#231b0a] px-4 py-3 text-sm text-[#f2d089]">
          {buildConfigurationMessage()}
        </p>
      ) : null}

      {status === "sent" ? (
        <p className="rounded-xl border border-[#19493c] bg-[#0c221d] px-4 py-3 text-sm text-[#79d7bc]">
          Check your inbox. The magic link will complete sign-in and return you to your requested page.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-xl border border-[#4f2941] bg-[#24111b] px-4 py-3 text-sm text-[#f0b8c8]">
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}
