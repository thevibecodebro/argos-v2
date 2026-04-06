"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@argos-v2/ui";
import type { AppUserRole } from "@/lib/users/roles";

type ShellUser = {
  email: string;
  fullName: string;
  orgName?: string | null;
  role: AppUserRole | null;
};

type AuthenticatedAppShellProps = {
  children: React.ReactNode;
  currentPath: string;
  user: ShellUser;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

type NavGroup = {
  label: string;
  icon: string;
  items: NavItem[];
  visibleTo?: AppUserRole[];
};

// ── Navigation config ────────────────────────────────────────────────────────

const standaloneRoutes: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
  },
];

const navGroups: NavGroup[] = [
  {
    label: "Calls",
    icon: "library_books",
    items: [
      { href: "/calls", label: "Call Library", icon: "library_books" },
      { href: "/highlights", label: "Highlights", icon: "auto_awesome" },
    ],
  },
  {
    label: "Coaching",
    icon: "psychology",
    items: [
      { href: "/roleplay", label: "Roleplay", icon: "psychology" },
      { href: "/training", label: "Training", icon: "school" },
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
];

// ── Shell ─────────────────────────────────────────────────────────────────────

export function AuthenticatedAppShell({
  children,
  currentPath,
  user,
}: AuthenticatedAppShellProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const initials = getInitials(user.fullName || user.email);

  const visibleGroups = navGroups.filter((group) => {
    if (!group.visibleTo) return true;
    if (!user.role) return false;
    return group.visibleTo.includes(user.role);
  });

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    if (accountOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountOpen]);

  return (
    <div className="bg-[#0b0e14] text-[#ecedf6] min-h-screen">
      {/* ── Sidebar ── */}
      <aside className="h-screen w-60 fixed left-0 top-0 bg-[#0b0e14] flex flex-col py-8 px-4 z-50 border-r border-[#45484f]/10">
        {/* Brand */}
        <div className="mb-10 px-3">
          <h1 className="text-2xl font-bold tracking-tighter text-[#ecedf6] font-[var(--font-display)]">
            Argos
          </h1>
          <p className="tracking-wider uppercase text-[0.65rem] font-bold text-[#45484f] font-[var(--font-display)] mt-0.5">
            {user.orgName ?? "Command Center"}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto space-y-1" aria-label="Primary navigation">
          {/* Standalone items */}
          {standaloneRoutes.map((route) => {
            const active = isRouteActive(currentPath, route.href);
            return (
              <NavLink key={route.href} href={route.href} label={route.label} icon={route.icon} active={active} />
            );
          })}

          {/* Grouped items */}
          {visibleGroups.map((group) => {
            const groupActive = group.items.some((item) => isRouteActive(currentPath, item.href));
            return (
              <div key={group.label} className="mt-3">
                <p className={cn(
                  "px-3 mb-1 text-[0.6rem] font-bold uppercase tracking-[0.2em] font-[var(--font-display)]",
                  groupActive ? "text-[#74b1ff]/60" : "text-[#45484f]/70",
                )}>
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const active = isRouteActive(currentPath, item.href);
                  return (
                    <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={active} />
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Main area ── */}
      <div className="ml-60 min-h-screen flex flex-col">
        {/* Fixed header */}
        <header className="fixed top-0 right-0 w-[calc(100%-15rem)] z-40 bg-[#0b0e14]/80 backdrop-blur-xl flex justify-end items-center px-10 py-4 border-b border-[#45484f]/10 gap-4">
          {/* Upload CTA */}
          <Link
            href="/upload"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider font-[var(--font-display)] transition-all",
              isRouteActive(currentPath, "/upload")
                ? "bg-[#74b1ff]/20 text-[#74b1ff] border border-[#74b1ff]/30"
                : "bg-[#74b1ff]/10 text-[#74b1ff] border border-[#74b1ff]/20 hover:bg-[#74b1ff]/20",
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>cloud_upload</span>
            Upload
          </Link>

          {/* Notifications */}
          <Link
            href="/notifications"
            aria-label="Notifications"
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
              isRouteActive(currentPath, "/notifications")
                ? "text-[#74b1ff] bg-[#74b1ff]/10"
                : "text-[#a9abb3] hover:text-[#74b1ff] hover:bg-[#74b1ff]/5",
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>notifications</span>
          </Link>

          {/* Account menu */}
          <div className="relative" ref={accountRef}>
            <button
              aria-expanded={accountOpen}
              aria-haspopup="true"
              aria-label="Account menu"
              className="w-9 h-9 rounded-full bg-[#22262f] border border-[#45484f]/30 flex items-center justify-center text-sm font-bold text-[#74b1ff] hover:border-[#74b1ff]/40 transition-all select-none"
              onClick={() => setAccountOpen((v) => !v)}
              type="button"
            >
              {initials}
            </button>

            <div
              className={cn(
                "absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#13161e] border border-[#45484f]/20 shadow-[0_16px_48px_rgba(0,0,0,0.5)] overflow-hidden z-50 transition-all duration-150",
                accountOpen ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none -translate-y-1",
              )}
              aria-hidden={!accountOpen}
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-[#45484f]/10">
                <p className="text-sm font-semibold text-[#ecedf6] truncate">{user.fullName || user.email}</p>
                {user.fullName && (
                  <p className="text-xs text-[#45484f] truncate mt-0.5">{user.email}</p>
                )}
                {user.role && (
                  <p className="text-[0.6rem] uppercase tracking-[0.18em] text-[#45484f] font-bold mt-1">{user.role}</p>
                )}
              </div>

              {/* Settings */}
              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-3 text-sm text-[#a9abb3] hover:text-[#ecedf6] hover:bg-[#74b1ff]/5 transition-all"
                onClick={() => setAccountOpen(false)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>settings</span>
                Settings
              </Link>

              <div className="border-t border-[#45484f]/10">
                <form action="/auth/signout" method="post">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#a9abb3] hover:text-[#ecedf6] hover:bg-[#74b1ff]/5 transition-all text-left"
                    type="submit"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>logout</span>
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mt-[65px] flex-1">
          {children}
        </main>
      </div>

      {/* Ambient background glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-[#74b1ff]/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-[600px] h-[600px] bg-[#6dddff]/5 blur-[150px] rounded-full" />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-[var(--font-display)] tracking-wider uppercase text-[0.7rem] font-bold",
        active
          ? "text-[#74b1ff] bg-[#74b1ff]/10 border-r-2 border-[#74b1ff]"
          : "text-[#45484f] hover:text-[#ecedf6] hover:bg-[#ffffff]/5",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className="material-symbols-outlined shrink-0" style={{ fontSize: "18px" }}>
        {icon}
      </span>
      {label}
    </Link>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function isRouteActive(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
