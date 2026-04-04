import React from "react";
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

type ProductRoute = {
  description: string;
  href: string;
  label: string;
  title: string;
  visibleTo?: AppUserRole[];
};

const routes: ProductRoute[] = [
  {
    description: "Org-wide analytics and team performance",
    href: "/dashboard",
    label: "Dashboard",
    title: "Executive Dashboard",
  },
  {
    description: "Review scored calls and recent activity",
    href: "/calls",
    label: "Call Library",
    title: "Call Library",
  },
  {
    description: "Add new call recordings for scoring",
    href: "/upload",
    label: "Upload Call",
    title: "Upload Call",
  },
  {
    description: "Practice scenarios and performance drills",
    href: "/roleplay",
    label: "Roleplay",
    title: "Roleplay",
  },
  {
    description: "Assigned learning modules and team progress",
    href: "/training",
    label: "Training",
    title: "Training",
  },
  {
    description: "Flagged moments and coaching highlights",
    href: "/highlights",
    label: "Highlights",
    title: "Highlights",
  },
  {
    description: "Ranked rep performance across the org",
    href: "/leaderboard",
    label: "Leaderboard",
    title: "Leaderboard",
  },
  {
    description: "Org roster and rep performance drill-downs",
    href: "/team",
    label: "Team",
    title: "Team",
    visibleTo: ["manager", "executive", "admin"],
  },
  {
    description: "Profile, integrations, and org settings",
    href: "/settings",
    label: "Settings",
    title: "Settings",
  },
  {
    description: "Scoring, training, and coaching updates",
    href: "/notifications",
    label: "Notifications",
    title: "Notifications",
  },
];

export function AuthenticatedAppShell({
  children,
  currentPath,
  user,
}: AuthenticatedAppShellProps) {
  const visibleRoutes = routes.filter((route) => {
    if (!route.visibleTo || !user.role) {
      return route.visibleTo ? false : true;
    }

    return route.visibleTo.includes(user.role);
  });

  const activeRoute =
    visibleRoutes.find((route) => isRouteActive(currentPath, route.href)) ?? routes[0];
  const firstName = user.fullName.split(" ")[0] || user.email;

  return (
    <main className="min-h-screen bg-[#060d1a] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-800/60 bg-[#080f1e] lg:flex lg:flex-col">
          <div className="border-b border-slate-800/60 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-600/15 text-blue-400">
                <TargetIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">Argos</p>
                <p className="text-sm text-slate-500">Revenue Command</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-3">
              <p className="text-sm font-medium text-slate-300">
                {user.orgName ?? `${firstName}'s Team`}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-600">
                {user.role ?? "member"}
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-5">
            {visibleRoutes.map((route) => {
              const active = isRouteActive(currentPath, route.href);

              return (
                <Link
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition",
                    active
                      ? "border-blue-500/40 bg-blue-600/15 text-blue-300"
                      : "border-transparent text-slate-400 hover:border-slate-800/80 hover:bg-slate-900/70 hover:text-slate-200",
                  )}
                  href={route.href}
                  key={route.href}
                >
                  <RouteGlyph className={cn("h-4 w-4", active ? "text-blue-300" : "text-slate-500")} />
                  <span className="flex-1">{route.label}</span>
                  {active ? <ChevronGlyph className="h-4 w-4 text-blue-300" /> : null}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-800/60 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-500/30 bg-blue-600/15 text-sm font-semibold text-blue-300">
                {getInitials(user.fullName || user.email)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">{firstName}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-800/60 bg-[#060d1a]/90 px-5 py-5 backdrop-blur sm:px-7 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
                {activeRoute.label}
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
                {activeRoute.title}
              </h1>
              <p className="mt-2 text-base text-slate-400">{activeRoute.description}</p>
            </div>
          </header>

          <div className="mx-auto max-w-6xl px-5 py-6 sm:px-7 lg:px-8 lg:py-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

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

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      <path
        d="M12 2.8v3M12 18.2v3M21.2 12h-3M5.8 12h-3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function RouteGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M5 18.5V12m4 6.5V6m4 12.5V9m4 9.5V3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
