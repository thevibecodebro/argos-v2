"use client";

import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "@argos-v2/ui";
import { ForgeIcon } from "./forge";

type SecondaryRailProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
  description?: string;
  eyebrow?: string;
  railId: string;
  title: string;
};

type SecondaryRailGroupProps = {
  children?: ReactNode;
  className?: string;
  label: string;
};

type SecondaryRailLinkProps = {
  active?: boolean;
  description?: string;
  href: string;
  icon: string;
  label: string;
};

type SecondaryRailButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  badge?: ReactNode;
  description?: string;
  icon: string;
  label: string;
};

export function SecondaryRail({
  children,
  className,
  description,
  eyebrow,
  railId,
  title,
  ...props
}: SecondaryRailProps) {
  const storageKey = `argos.secondaryRail.${railId}.collapsed`;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "true" || saved === "false") {
      setCollapsed(saved === "true");
    }
  }, [storageKey]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(storageKey, String(next));
      return next;
    });
  }

  return (
    <aside
      aria-label={title}
      className={cn("secondary-rail", className)}
      data-secondary-rail={railId}
      data-secondary-rail-collapsed={collapsed ? "true" : "false"}
      {...props}
    >
      <div className="secondary-rail-header">
        <div className="secondary-rail-header-text min-w-0">
          {eyebrow ? <p className="forge-page-eyebrow">{eyebrow}</p> : null}
          <h2 className="mt-1 truncate text-sm font-semibold text-[var(--forge-secondary-rail-text)]">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[var(--forge-secondary-rail-muted)]">{description}</p>
          ) : null}
        </div>
        <button
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          className="secondary-rail-collapse-control forge-icon-button h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          onClick={toggleCollapsed}
          title={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          type="button"
        >
          <ForgeIcon name={collapsed ? "chevron_right" : "chevron_left"} size={19} />
        </button>
      </div>

      <div className="secondary-rail-body">{children}</div>
    </aside>
  );
}

export function SecondaryRailGroup({
  children,
  className,
  label,
}: SecondaryRailGroupProps) {
  return (
    <section className={cn("secondary-rail-group", className)} data-secondary-rail-group={label}>
      <p className="secondary-rail-group-label">{label}</p>
      <div className="secondary-rail-group-items">{children}</div>
    </section>
  );
}

export function SecondaryRailLink({
  active = false,
  description,
  href,
  icon,
  label,
}: SecondaryRailLinkProps) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn("secondary-rail-item", active && "secondary-rail-item--active")}
      href={href}
      title={label}
    >
      <ForgeIcon className="secondary-rail-item-icon" name={icon} size={18} />
      <span className="secondary-rail-item-copy">
        <span className="secondary-rail-item-label">{label}</span>
        {description ? <span className="secondary-rail-item-description">{description}</span> : null}
      </span>
    </Link>
  );
}

export function SecondaryRailButton({
  active = false,
  badge,
  className,
  description,
  icon,
  label,
  type = "button",
  ...props
}: SecondaryRailButtonProps) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn("secondary-rail-item", active && "secondary-rail-item--active", className)}
      title={label}
      type={type}
      {...props}
    >
      <ForgeIcon className="secondary-rail-item-icon" name={icon} size={18} />
      <span className="secondary-rail-item-copy">
        <span className="secondary-rail-item-label">{label}</span>
        {description ? <span className="secondary-rail-item-description">{description}</span> : null}
      </span>
      {badge ? <span className="secondary-rail-item-badge">{badge}</span> : null}
    </button>
  );
}
