"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type PlatformMfaFormState = {
  error: string | null;
};

type PlatformMfaCodeFormProps = {
  action: (
    state: PlatformMfaFormState,
    formData: FormData,
  ) => Promise<PlatformMfaFormState>;
  factorId: string;
};

export function PlatformMfaCodeForm({ action, factorId }: PlatformMfaCodeFormProps) {
  const [state, formAction] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="factorId" type="hidden" value={factorId} />
      <label className="text-sm font-semibold" htmlFor="code">
        Authentication code
      </label>
      <input
        aria-describedby={state.error ? "mfa-code-error" : undefined}
        aria-invalid={state.error ? "true" : undefined}
        autoComplete="one-time-code"
        className="rounded-md border border-[#444955] bg-[#080a0e] px-3 py-2 text-base text-[#f2f4f8]"
        id="code"
        inputMode="numeric"
        name="code"
        pattern="[0-9]*"
        required
        type="text"
      />
      {state.error ? (
        <p
          className="rounded-md border border-[#8f3333] bg-[#2a1111] px-3 py-2 text-sm font-semibold text-[#ffb4b4]"
          id="mfa-code-error"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-md bg-[#88d498] px-4 py-2 text-sm font-black text-[#0b0f0c] transition hover:bg-[#a5e7b1] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Verifying..." : "Verify and continue"}
    </button>
  );
}
