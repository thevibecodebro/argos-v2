"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@argos-v2/ui";
import { ForgeIcon } from "../forge";
import type { AppUserRole } from "@/lib/users/roles";

type SettingsNavItem = {
  href: string;
  label: string;
  icon: string;
  visibleTo?: AppUserRole[];
};

type SettingsNavGroup = {
  label: string;
  items: SettingsNavItem[];
};

const NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/settings", label: "Account", icon: "person" },
      { href: "/settings/integrations", label: "Integrations", icon: "power", visibleTo: ["admin"] },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/settings/people", label: "People", icon: "group", visibleTo: ["admin"] },
      { href: "/settings/teams", label: "Teams", icon: "groups", visibleTo: ["admin"] },
      { href: "/settings/permissions", label: "Permissions", icon: "lock", visibleTo: ["admin"] },
    ],
  },
  {
    label: "Coaching system",
    items: [
      { href: "/settings/rubric", label: "Rubrics", icon: "grading", visibleTo: ["admin"] },
      { href: "/settings/compliance", label: "Compliance", icon: "verified_user", visibleTo: ["admin"] },
    ],
  },
];

type SettingsNavProps = {
  initialCollapsed?: boolean;
  role: AppUserRole | null;
};

export function SettingsNav({ initialCollapsed = false, role }: SettingsNavProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.visibleTo || (role !== null && item.visibleTo.includes(role))
    ),
  })).filter((group) => group.items.length > 0);

  useEffect(() => {
    const saved = window.localStorage.getItem("argos.settingsRailCollapsed");
    if (saved === "true" || saved === "false") {
      setCollapsed(saved === "true");
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("argos.settingsRailCollapsed", String(next));
      return next;
    });
  }

  return (
    <nav
      aria-label="Settings navigation"
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0",
        collapsed && "lg:[&_.forge-nav-link]:justify-center",
      )}
      data-settings-nav-collapsed={collapsed ? "true" : "false"}
      data-settings-nav-theme="forge"
    >
      <button
        aria-label={collapsed ? "Expand settings navigation" : "Collapse settings navigation"}
        className="forge-icon-button mb-4 hidden h-10 w-10 items-center justify-center rounded-xl lg:flex"
        onClick={toggleCollapsed}
        title={collapsed ? "Expand settings navigation" : "Collapse settings navigation"}
        type="button"
      >
        <ForgeIcon name={collapsed ? "chevron_right" : "chevron_left"} size={20} />
      </button>

      {visibleGroups.map((group) => (
        <div className="contents lg:mt-5 lg:block first:lg:mt-0" key={group.label}>
          <p className={cn("forge-nav-section-label mb-2 hidden px-3 lg:block", collapsed && "lg:sr-only")}>
            {group.label}
          </p>
          <div className="contents lg:block lg:space-y-1">
            {group.items.map((item) => {
              // Exact match for /settings root, prefix match for sub-pages
              const active =
                item.href === "/settings"
                  ? pathname === "/settings"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "forge-nav-link flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 font-[var(--font-display)] text-[0.7rem] font-bold uppercase tracking-[0.16em] lg:shrink",
                    collapsed && "lg:h-11 lg:px-0",
                    active && "forge-nav-link--active",
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <ForgeIcon name={item.icon} size={18} />
                  <span className={cn("truncate", collapsed && "lg:sr-only")} data-settings-nav-label="true">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
