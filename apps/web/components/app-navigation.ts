import type { AppUserRole } from "@/lib/users/roles";
import {
  hasManagedCapability,
  type EffectiveOrganizationCapabilities,
  type ManagedCapabilityKey,
} from "@/lib/access/managed-capabilities";

export type NavItem = {
  anyCapabilities?: ManagedCapabilityKey[];
  capability?: ManagedCapabilityKey;
  href: string;
  label: string;
  icon: string;
};

export type NavGroup = {
  label: string;
  icon: string;
  items: NavItem[];
  visibleTo?: AppUserRole[];
};

export type BottomTabItem = {
  anyCapabilities?: ManagedCapabilityKey[];
  capability?: ManagedCapabilityKey;
  href: string;
  label: string;
  icon: string;
  fab?: boolean;
};

export const navGroups: NavGroup[] = [
  {
    label: "Review",
    icon: "query_stats",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard", capability: "call_scoring" },
      {
        href: "/calls",
        label: "Recordings",
        icon: "library_books",
        anyCapabilities: ["call_upload", "call_ingestion", "call_scoring"],
      },
      { href: "/highlights", label: "Highlights", icon: "auto_awesome", capability: "highlights" },
    ],
  },
  {
    label: "Coach",
    icon: "psychology",
    items: [
      { href: "/training", label: "Training", icon: "school", capability: "training" },
      { href: "/roleplay", label: "Roleplay", icon: "psychology", capability: "roleplay" },
    ],
  },
  {
    label: "People",
    icon: "group",
    visibleTo: ["manager", "executive", "admin"],
    items: [
      { href: "/team", label: "Team", icon: "group", capability: "call_scoring" },
      { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard", capability: "leaderboard" },
    ],
  },
  {
    label: "System",
    icon: "settings",
    items: [
      { href: "/notifications", label: "Notifications", icon: "notifications" },
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

// Mobile bottom tab bar — five slots with a centered upload action (Option A).
export const bottomTabs: BottomTabItem[] = [
  { href: "/dashboard", label: "Home", icon: "dashboard", capability: "call_scoring" },
  {
    href: "/calls",
    label: "Recordings",
    icon: "library_books",
    anyCapabilities: ["call_upload", "call_ingestion", "call_scoring"],
  },
  { href: "/upload", label: "Upload", icon: "upload", fab: true, capability: "call_upload" },
  { href: "/training", label: "Coach", icon: "school", capability: "training" },
  { href: "/settings", label: "Me", icon: "person" },
];

export function getVisibleNavGroups(
  role: AppUserRole | null,
  access?: EffectiveOrganizationCapabilities,
): NavGroup[] {
  return navGroups
    .filter((group) => {
      if (!group.visibleTo) return true;
      if (!role) return false;
      return group.visibleTo.includes(role);
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isNavigationItemVisible(item, access)),
    }))
    .filter((group) => group.items.length > 0);
}

export function getVisibleBottomTabs(access?: EffectiveOrganizationCapabilities) {
  return bottomTabs.filter((item) => isNavigationItemVisible(item, access));
}

function isNavigationItemVisible(
  item: Pick<NavItem, "anyCapabilities" | "capability">,
  access?: EffectiveOrganizationCapabilities,
) {
  if (!access) return true;
  if (item.anyCapabilities) {
    return item.anyCapabilities.some((capability) => hasManagedCapability(access, capability));
  }
  return !item.capability || hasManagedCapability(access, item.capability);
}
