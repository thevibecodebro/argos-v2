"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@argos-v2/ui";
import { ForgeChip, ForgeIcon, type ForgeTone } from "./forge";
import type { AppUserRole } from "@/lib/users/roles";

type GuideKind = "rep-start" | "team-coaching" | "workspace-launch";

type GuideItem = {
  description: string;
  href: string;
  icon: string;
  label: string;
};

type GuideDefinition = {
  chip: string;
  description: string;
  id: GuideKind;
  items: GuideItem[];
  primaryHref: string;
  primaryLabel: string;
  title: string;
  tone: ForgeTone;
};

type RoleOnboardingGuideProps = {
  currentPath: string;
  replaySignal: number;
  role: AppUserRole | null;
  userId: string;
};

const guides: Record<GuideKind, GuideDefinition> = {
  "rep-start": {
    chip: "Rep start",
    description:
      "Start with the work that helps you improve: reviewed calls, assigned training, and realistic practice.",
    id: "rep-start",
    items: [
      {
        description: "See scored conversations and feedback from recent reviews.",
        href: "/calls",
        icon: "subject",
        label: "Review your calls",
      },
      {
        description: "Complete lessons assigned from coaching priorities.",
        href: "/training",
        icon: "school",
        label: "Open assigned training",
      },
      {
        description: "Practice sales moments before the next live conversation.",
        href: "/roleplay",
        icon: "psychology",
        label: "Try roleplay",
      },
      {
        description: "Return to saved examples when you need a quick reference.",
        href: "/highlights",
        icon: "auto_awesome",
        label: "Review highlights",
      },
    ],
    primaryHref: "/calls",
    primaryLabel: "Open calls",
    title: "Your sales practice guide",
    tone: "cyan",
  },
  "team-coaching": {
    chip: "Team view",
    description:
      "Use Argos to spot coaching signals, review team movement, and keep practice tied to real call evidence.",
    id: "team-coaching",
    items: [
      {
        description: "Scan team score movement and coaching flags.",
        href: "/team",
        icon: "group",
        label: "Review the team",
      },
      {
        description: "Compare performance and focus areas across reps.",
        href: "/leaderboard",
        icon: "leaderboard",
        label: "Open leaderboard",
      },
      {
        description: "Bring a recorded call into the review loop.",
        href: "/upload",
        icon: "cloud_upload",
        label: "Upload a call",
      },
      {
        description: "Check lessons and practice assigned to the team.",
        href: "/training/team",
        icon: "school",
        label: "Review training",
      },
    ],
    primaryHref: "/team",
    primaryLabel: "Open team",
    title: "Team coaching guide",
    tone: "gold",
  },
  "workspace-launch": {
    chip: "Admin setup",
    description:
      "Launch the workspace by adding people, setting the scoring model, and getting the first call into review.",
    id: "workspace-launch",
    items: [
      {
        description: "Send secure invites and assign initial roles.",
        href: "/settings/people",
        icon: "group_add",
        label: "Invite teammates",
      },
      {
        description: "Set the scorecard Argos uses for call feedback.",
        href: "/settings/rubric",
        icon: "rule",
        label: "Configure your rubric",
      },
      {
        description: "Connect call sources when your recording workflow is ready.",
        href: "/settings/integrations",
        icon: "account_tree",
        label: "Connect integrations",
      },
      {
        description: "Upload one recording to create the first review loop.",
        href: "/upload",
        icon: "cloud_upload",
        label: "Upload first call",
      },
    ],
    primaryHref: "/settings/people",
    primaryLabel: "Invite team",
    title: "Workspace launch guide",
    tone: "gold",
  },
};

export function RoleOnboardingGuide({
  currentPath,
  replaySignal,
  role,
  userId,
}: RoleOnboardingGuideProps) {
  const guide = guides[getGuideKind(role)];
  const storageKey = useMemo(
    () => `argos.onboardingGuide.${userId}.${role ?? "member"}`,
    [role, userId],
  );
  const [dismissed, setDismissed] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed(storageKey));
    setManualOpen(false);
  }, [storageKey]);

  useEffect(() => {
    if (replaySignal > 0) {
      setManualOpen(true);
    }
  }, [replaySignal]);

  const shouldShow = manualOpen || (currentPath === "/dashboard" && !dismissed);

  if (!shouldShow) {
    return null;
  }

  function dismissGuide() {
    setManualOpen(false);
    setDismissed(true);
    writeDismissed(storageKey);
  }

  return (
    <section
      className="px-3 pt-3 sm:px-4 lg:px-6"
      data-role-onboarding-guide={guide.id}
    >
      <div className="overflow-hidden rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.8%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--forge-text)_4.5%,transparent)]">
        <div className="flex flex-col gap-3 border-b border-[var(--forge-border)] px-3 py-3 sm:px-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-[var(--forge-muted)]">
                First run
              </p>
              <ForgeChip tone={guide.tone}>{guide.chip}</ForgeChip>
            </div>
            <h2 className="mt-2 text-base font-semibold text-[var(--forge-text)]">
              {guide.title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-[var(--forge-muted)]">
              {guide.description}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              className="forge-button forge-button-primary forge-focus-ring min-h-9 rounded-lg px-3 py-2 text-xs"
              href={guide.primaryHref}
            >
              <ForgeIcon name="arrow_forward" size={15} />
              <span>{guide.primaryLabel}</span>
            </Link>
            <button
              aria-label="Dismiss product guide"
              className="forge-button forge-button-ghost forge-focus-ring min-h-9 rounded-lg px-3 py-2 text-xs"
              onClick={dismissGuide}
              type="button"
            >
              <ForgeIcon name="close" size={15} />
              <span>Dismiss</span>
            </button>
          </div>
        </div>
        <div className="grid gap-px bg-[var(--forge-border)] sm:grid-cols-2 xl:grid-cols-4">
          {guide.items.map((item) => (
            <Link
              className={cn(
                "group min-h-24 bg-[color-mix(in_srgb,var(--forge-shadow)_96%,transparent)] px-3 py-3 transition",
                "hover:bg-[color-mix(in_srgb,var(--forge-gold)_5.5%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--forge-gold)]",
              )}
              href={item.href}
              key={item.label}
            >
              <span className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_3.5%,transparent)] text-[var(--forge-gold)] transition group-hover:border-[color-mix(in_srgb,var(--forge-gold)_34%,transparent)]">
                  <ForgeIcon name={item.icon} size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--forge-text)]">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--forge-muted)]">
                    {item.description}
                  </span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function getGuideKind(role: AppUserRole | null): GuideKind {
  if (role === "admin") return "workspace-launch";
  if (role === "rep") return "rep-start";
  return "team-coaching";
}

function readDismissed(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === "dismissed";
  } catch {
    return false;
  }
}

function writeDismissed(storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, "dismissed");
  } catch {
    // Browser storage can be unavailable in privacy-restricted sessions.
  }
}
