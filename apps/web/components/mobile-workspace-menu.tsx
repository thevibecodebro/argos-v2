"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { ForgeDialog } from "./forge-dialog";
import { ForgeIcon } from "./forge";
import type { NavGroup } from "./app-navigation";

export function MobileWorkspaceMenu({ currentPath, groups, organizationName, organizationSwitcher, onNavigate }: {
  currentPath: string;
  groups: NavGroup[];
  organizationName?: string | null;
  organizationSwitcher?: ReactNode;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [currentPath]);
  useEffect(() => {
    const viewport = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => { if (viewport.matches) setOpen(false); };
    viewport.addEventListener("change", closeOnDesktop);
    return () => viewport.removeEventListener("change", closeOnDesktop);
  }, []);

  return <>
    <span className="md:hidden">
      <button aria-label="Open workspace menu" aria-haspopup="dialog" aria-expanded={open} className="forge-icon-button inline-flex h-11 w-11 items-center justify-center rounded-lg" onClick={() => setOpen(true)} type="button">
        <Menu size={21} aria-hidden="true" />
      </button>
    </span>
    <ForgeDialog open={open} onOpenChange={setOpen} title="Workspace" description={organizationName ?? undefined} className="max-w-md">
      {organizationSwitcher ? <div data-mobile-organization-switcher className="mb-5">{organizationSwitcher}</div> : null}
      <nav aria-label="Workspace pages" className="space-y-5">
        {groups.map(group => <section key={group.label}>
          <h3 className="mb-1 text-sm font-semibold text-[var(--forge-muted)]">{group.label}</h3>
          <div className="grid gap-1">
            {group.items.map(item => <Link key={item.href} href={item.href} aria-current={currentPath === item.href || currentPath.startsWith(`${item.href}/`) ? "page" : undefined} className="mobile-workspace-link" onClick={event => { onNavigate(event, item.href); setOpen(false); }}>
              <ForgeIcon name={item.icon} size={20} /><span>{item.label}</span>
            </Link>)}
          </div>
        </section>)}
      </nav>
    </ForgeDialog>
  </>;
}
