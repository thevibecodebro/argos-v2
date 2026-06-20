"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { ForgeIcon } from "./forge";
import { getVisibleNavGroups } from "./app-navigation";
import type { AppUserRole } from "@/lib/users/roles";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: AppUserRole | null;
  onBeforeNavigate?: (href: string) => void;
};

const quickActions = [
  { href: "/upload", label: "Upload a call", icon: "upload" },
];

export function CommandPalette({
  open,
  onOpenChange,
  role,
  onBeforeNavigate,
}: CommandPaletteProps) {
  const router = useRouter();
  const groups = getVisibleNavGroups(role);

  function go(href: string) {
    onBeforeNavigate?.(href);
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Command.Dialog
      className="forge-command"
      contentClassName="forge-command-dialog"
      label="Command menu"
      onOpenChange={onOpenChange}
      open={open}
      overlayClassName="forge-command-overlay"
    >
      <Command.Input placeholder="Search pages and actions…" />
      <Command.List>
        <Command.Empty>No matches.</Command.Empty>

        <Command.Group heading="Quick actions">
          {quickActions.map((action) => (
            <Command.Item
              key={action.href}
              onSelect={() => go(action.href)}
              value={`${action.label} ${action.href}`}
            >
              <ForgeIcon name={action.icon} size={17} />
              {action.label}
            </Command.Item>
          ))}
        </Command.Group>

        {groups.map((group) => (
          <Command.Group heading={group.label} key={group.label}>
            {group.items.map((item) => (
              <Command.Item
                data-command-destination={item.href}
                key={item.href}
                onSelect={() => go(item.href)}
                value={`${item.label} ${group.label} ${item.href}`}
              >
                <ForgeIcon name={item.icon} size={17} />
                {item.label}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
