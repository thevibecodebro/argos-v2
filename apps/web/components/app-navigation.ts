import type { AppUserRole } from "@/lib/users/roles";

export type NavItem = {
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
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/calls", label: "Calls", icon: "library_books" },
      { href: "/highlights", label: "Highlights", icon: "auto_awesome" },
    ],
  },
  {
    label: "Coach",
    icon: "psychology",
    items: [
      { href: "/training", label: "Training", icon: "school" },
      { href: "/roleplay", label: "Roleplay", icon: "psychology" },
    ],
  },
  {
    label: "People",
    icon: "group",
    visibleTo: ["manager", "executive", "admin"],
    items: [
      { href: "/team", label: "Team", icon: "group" },
      { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
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
  { href: "/dashboard", label: "Home", icon: "dashboard" },
  { href: "/calls", label: "Calls", icon: "library_books" },
  { href: "/upload", label: "Upload", icon: "upload", fab: true },
  { href: "/training", label: "Coach", icon: "school" },
  { href: "/settings", label: "Me", icon: "person" },
];

export function getVisibleNavGroups(role: AppUserRole | null): NavGroup[] {
  return navGroups.filter((group) => {
    if (!group.visibleTo) return true;
    if (!role) return false;
    return group.visibleTo.includes(role);
  });
}
