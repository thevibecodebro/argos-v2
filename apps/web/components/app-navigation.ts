import type { AppUserRole } from "@/lib/users/roles";
import {
  hasManagedCapability,
  type EffectiveOrganizationCapabilities,
  type ManagedCapabilityKey,
} from "@/lib/access/managed-capabilities";

type NavigationCapabilityConstraint = {
  capability?: ManagedCapabilityKey;
  anyCapabilities?: readonly ManagedCapabilityKey[];
};

export type NavItem = NavigationCapabilityConstraint & {
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

export type BottomTabItem = NavigationCapabilityConstraint & {
  activeHrefs?: readonly string[];
  href: string;
  label: string;
  icon: string;
  fab?: boolean;
};

const callsCapabilities = ["call_upload", "call_ingestion", "call_scoring"] as const;

export const navGroups: NavGroup[] = [
  {
    label: "Review",
    icon: "query_stats",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard", capability: "call_analytics" },
      { href: "/calls", label: "Recordings", icon: "library_books", anyCapabilities: callsCapabilities },
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
      { href: "/team", label: "Team", icon: "group", capability: "call_analytics" },
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
  { href: "/dashboard", label: "Home", icon: "dashboard", capability: "call_analytics" },
  { href: "/calls", label: "Recordings", icon: "library_books", anyCapabilities: callsCapabilities },
  { href: "/upload", label: "Upload", icon: "upload", fab: true, capability: "call_upload" },
  { href: "/training", label: "Coach", icon: "school", capability: "training", activeHrefs: ["/training", "/roleplay"] },
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
      items: group.items.filter(
        (item) => canAccessNavigationItem(item, access),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function getVisibleBottomTabs(access?: EffectiveOrganizationCapabilities): BottomTabItem[] {
  return bottomTabs.flatMap((item) => {
    if (item.label === "Coach" && access && !hasManagedCapability(access, "training")) {
      return hasManagedCapability(access, "roleplay")
        ? [{ ...item, href: "/roleplay", capability: "roleplay" as const }]
        : [];
    }
    return canAccessNavigationItem(item, access) ? [item] : [];
  });
}

export function getBottomTabLayout(tabs: BottomTabItem[]) {
  const centerIndex = tabs.findIndex((tab) => tab.fab);
  if (centerIndex === -1) return { before: tabs, centerTab: null, after: [] as BottomTabItem[] };
  return {
    before: tabs.slice(0, centerIndex),
    centerTab: tabs[centerIndex]!,
    after: tabs.slice(centerIndex + 1),
  };
}

function canAccessNavigationItem(item: NavigationCapabilityConstraint, access?: EffectiveOrganizationCapabilities) {
  if (!access) return true;
  return (!item.capability || hasManagedCapability(access, item.capability)) &&
    (!item.anyCapabilities || item.anyCapabilities.some((capability) => hasManagedCapability(access, capability)));
}

export function isNavigationRouteActive(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function isBottomTabActive(currentPath: string, tab: BottomTabItem) {
  return (tab.activeHrefs ?? [tab.href]).some((href) => isNavigationRouteActive(currentPath, href));
}
