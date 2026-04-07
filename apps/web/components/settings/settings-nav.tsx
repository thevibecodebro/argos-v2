"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@argos-v2/ui";
import type { AppUserRole } from "@/lib/users/roles";

type SettingsNavItem = {
  href: string;
  label: string;
  icon: string;
  visibleTo?: AppUserRole[];
};

const NAV_ITEMS: SettingsNavItem[] = [
  { href: "/settings",              label: "Account",      icon: "person"        },
  { href: "/settings/people",       label: "People",       icon: "group",        visibleTo: ["admin"] },
  { href: "/settings/teams",        label: "Teams",        icon: "groups",       visibleTo: ["admin"] },
  { href: "/settings/permissions",  label: "Permissions",  icon: "lock",         visibleTo: ["admin"] },
  { href: "/settings/integrations", label: "Integrations", icon: "power",        visibleTo: ["admin"] },
  { href: "/settings/compliance",   label: "Compliance",   icon: "verified_user", visibleTo: ["admin"] },
];

type SettingsNavProps = {
  role: AppUserRole | null;
};

export function SettingsNav({ role }: SettingsNavProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.visibleTo || (role !== null && item.visibleTo.includes(role))
  );

  return (
    <nav aria-label="Settings navigation">
      <p className="px-3 mb-3 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#45484f]">
        Settings
      </p>
      {visibleItems.map((item) => {
        // Exact match for /settings root, prefix match for sub-pages
        const active =
          item.href === "/settings"
            ? pathname === "/settings"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-[var(--font-display)] tracking-wider uppercase text-[0.7rem] font-bold",
              active
                ? "text-[#74b1ff] bg-[#74b1ff]/10 border-r-2 border-[#74b1ff]"
                : "text-[#45484f] hover:text-[#ecedf6] hover:bg-[#ffffff]/5",
            )}
          >
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: "18px" }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
