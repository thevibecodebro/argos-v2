import { LegacyAuthShell, LegacyPrimaryLink } from "@/components/legacy-shell";

export default function HomePage() {
  return (
    <LegacyAuthShell note="Secure login via Google or magic link. No password required.">
      <LegacyPrimaryLink href="/login">Sign in to Argos</LegacyPrimaryLink>
    </LegacyAuthShell>
  );
}
