import { LegacyAuthShell } from "@/components/legacy-shell";
import { OnboardingPanel } from "@/components/onboarding-panel";

export default function OnboardingPage() {
  return (
    <LegacyAuthShell note="Create a new team or join your existing one to unlock the Argos workspace.">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-white sm:text-5xl">Welcome to Argos</h1>
        <p className="mt-4 text-lg leading-8 text-[#8696ba]">
          Set up your organization to start coaching your sales team.
        </p>
      </div>
      <div className="mt-10">
        <OnboardingPanel />
      </div>
    </LegacyAuthShell>
  );
}
