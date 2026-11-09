import { hasManagedCapability, type EffectiveOrganizationCapabilities, type ManagedCapabilityKey } from "@/lib/access/managed-capabilities";
import type { SettingsSecondaryRailItem } from "./settings-secondary-rail";

const SETTINGS_SECTIONS = [
  {
    description: "Set workspace colors for buttons, text, surfaces, and states.",
    href: "/settings/branding",
    icon: "palette",
    label: "Branding",
    visibleTo: ["admin"],
    capabilities: ["workspace_branding"],
  },
  {
    description: "Manage user records and account access.",
    href: "/settings/people",
    icon: "group",
    label: "People",
    visibleTo: ["admin"],
  },
  {
    description: "Configure team structure and manager assignments.",
    href: "/settings/teams",
    icon: "groups",
    label: "Teams",
    visibleTo: ["admin"],
  },
  {
    description: "Review role scopes and permission boundaries.",
    href: "/settings/permissions",
    icon: "lock",
    label: "Permissions",
    visibleTo: ["admin"],
  },
  {
    description: "Connect and monitor supported providers.",
    href: "/settings/integrations",
    icon: "power",
    label: "Integrations",
    visibleTo: ["admin"],
    capabilities: ["integration_google_meet", "integration_ghl", "integration_zoom"],
  },
  {
    description: "Tune the scoring system used on reviewed calls.",
    href: "/settings/rubric",
    icon: "grading",
    label: "Rubrics",
    visibleTo: ["admin"],
  },
  {
    description: "Review consent and operational safeguards.",
    href: "/settings/compliance",
    icon: "verified_user",
    label: "Compliance",
    visibleTo: ["admin"],
  },
] as const;

export function getSettingsRailItems(role: string | null, access?: EffectiveOrganizationCapabilities): SettingsSecondaryRailItem[] {
  const visibleSections = SETTINGS_SECTIONS.filter((section) =>
    (role !== null && (section.visibleTo as readonly string[]).includes(role)) &&
    (!("capabilities" in section) || !access ||
      (section.capabilities as readonly ManagedCapabilityKey[]).some((capability) => hasManagedCapability(access, capability))),
  );
  return [
    { href: "/settings", icon: "person", key: "account", label: "Account" },
    ...visibleSections.map((section) => ({ href: section.href, icon: section.icon, key: section.label.toLowerCase(), label: section.label })),
  ];
}
