"use client";

import {
  SecondaryRail,
  SecondaryRailGroup,
  SecondaryRailLink,
} from "@/components/secondary-rail";

export type SettingsSecondaryRailItem = {
  href: string;
  icon: string;
  key: string;
  label: string;
};

type SettingsSecondaryRailProps = {
  activeKey: string;
  items: SettingsSecondaryRailItem[];
};

export function SettingsSecondaryRail({
  activeKey,
  items,
}: SettingsSecondaryRailProps) {
  return (
    <SecondaryRail
      railId="settings"
      title="Settings"
    >
      <SecondaryRailGroup label="Sections">
        {items.map((item) => (
          <SecondaryRailLink
            active={item.key === activeKey}
            href={item.href}
            icon={item.icon}
            key={item.href}
            label={item.label}
          />
        ))}
      </SecondaryRailGroup>
    </SecondaryRail>
  );
}
