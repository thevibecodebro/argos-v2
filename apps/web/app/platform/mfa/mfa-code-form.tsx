"use client";

import { useActionState, type ReactNode } from "react";
import { entryStyles } from "@/components/auth/entry-surface";
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
      <PlatformMfaCodeFields error={state.error} factorId={factorId}>
        <SubmitButton />
      </PlatformMfaCodeFields>
    </form>
  );
}

export function PlatformMfaCodeFields({ error, factorId, children }: {
  error: string | null;
  factorId: string;
  children?: ReactNode;
}) {
  return (
    <>
      <input name="factorId" type="hidden" value={factorId} />
      <label className="text-sm font-semibold" htmlFor="code">
        Authentication code
      </label>
      <input
        aria-describedby={error ? "mfa-code-error" : undefined}
        aria-invalid={error ? "true" : undefined}
        autoComplete="one-time-code"
        className={entryStyles.input}
        id="code"
        inputMode="numeric"
        name="code"
        pattern="[0-9]*"
        required
        type="text"
      />
      {error ? (
        <p
          className={entryStyles.error}
          id="mfa-code-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {children ?? <PlatformMfaSubmitButton pending={false} />}
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <PlatformMfaSubmitButton pending={pending} />;
}

export function PlatformMfaSubmitButton({ pending }: { pending: boolean }) {
  return (
    <button className={`${entryStyles.primary} forge-focus-ring`} disabled={pending} type="submit">
      {pending ? "Verifying..." : "Verify and continue"}
    </button>
  );
}
