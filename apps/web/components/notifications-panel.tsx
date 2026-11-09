"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
} from "@/components/forge";
import type { NotificationItem } from "@/lib/notifications/service";

type NotificationsPanelProps = {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
};

export async function requestNotificationRead(url: string) {
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "Could not update notifications. Try again.");
  }
}

function timeAgo(value: string, useLocalTime: boolean) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  // Avoid server/browser timezone and clock drift before hydration completes.
  if (!useLocalTime) {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
    }).format(date);
  }
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function NotificationsPanel({
  initialNotifications,
  initialUnreadCount,
}: NotificationsPanelProps) {
  const router = useRouter();
  const [useLocalTime, setUseLocalTime] = useState(false);
  useEffect(() => setUseLocalTime(true), []);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isMutating, setIsMutating] = useState(false);
  const mutationInFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((notification) => !notification.read);
    }

    if (filter === "read") {
      return notifications.filter((notification) => notification.read);
    }

    return notifications;
  }, [filter, notifications]);

  const grouped = useMemo(() => {
    const groups = new Map<string, NotificationItem[]>();

    for (const notification of filteredNotifications) {
      const date = new Date(notification.createdAt);
      const key = Number.isFinite(date.getTime())
        ? new Intl.DateTimeFormat("en-US", { dateStyle: "full", ...(!useLocalTime ? { timeZone: "UTC" } : {}) }).format(date)
        : "Date unavailable";
      const current = groups.get(key) ?? [];
      current.push(notification);
      groups.set(key, current);
    }

    return [...groups.entries()];
  }, [filteredNotifications, useLocalTime]);

  async function markOne(notification: NotificationItem) {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setIsMutating(true);
    setError(null);
    try {
      if (!notification.read) {
        await requestNotificationRead(`/api/notifications/${notification.id}/read`);
        setNotifications((current) =>
          current.map((item) => item.id === notification.id ? { ...item, read: true } : item),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      if (notification.link) {
        router.push(notification.link);
        router.refresh();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update notifications. Try again.");
    } finally {
      mutationInFlight.current = false;
      setIsMutating(false);
    }
  }

  async function markAllRead() {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setIsMutating(true);
    setError(null);
    try {
      await requestNotificationRead("/api/notifications/read-all");
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update notifications. Try again.");
    } finally {
      mutationInFlight.current = false;
      setIsMutating(false);
    }
  }

  if (notifications.length === 0) {
    return (
      <ForgeEmptyState
        description="Uploading a call, adding annotations, and completing training modules will start populating this feed."
        icon="notifications"
        title="No notifications yet"
      />
    );
  }

  return (
    <section className="min-w-0 space-y-5" aria-busy={isMutating}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p aria-live="polite" className="text-sm font-[540] text-[var(--forge-text)]">
              {unreadCount === 0 ? "All caught up" : `${unreadCount} unread`}
            </p>
            <ForgeChip tone={unreadCount > 0 ? "gold" : "muted"}>
              {notifications.length} total
            </ForgeChip>
          </div>
        </div>
        <ForgeButton
          className="min-h-11"
          disabled={unreadCount === 0 || isMutating}
          onClick={() => {
            void markAllRead();
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          {isMutating ? "Updating..." : "Mark all read"}
        </ForgeButton>
      </div>

      {error ? <p className="text-sm text-[var(--forge-danger)]" role="alert">{error}</p> : null}

      <div
        aria-label="Filter notifications"
        className="flex flex-wrap items-center gap-2 border-b border-[var(--forge-border)] pb-3"
        data-notification-filters="active"
        role="group"
      >
        {[
          { label: "All", value: "all" as const },
          { label: "Unread", value: "unread" as const },
          { label: "Read", value: "read" as const },
        ].map((option) => (
          <button
            aria-pressed={filter === option.value}
            className={`min-h-11 rounded-lg px-4 py-2 text-sm font-[540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forge-focus)] ${
              filter === option.value
                ? "bg-[color-mix(in_srgb,var(--forge-gold)_14%,transparent)] text-[var(--forge-gold)]"
                : "text-[var(--forge-muted)] hover:bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)] hover:text-[var(--forge-text)]"
            }`}
            key={option.value}
            onClick={() => setFilter(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {grouped.length ? (
          grouped.map(([day, items]) => (
            <div key={day}>
              <p className="text-sm font-medium text-[var(--forge-muted)]">
                {day}
              </p>
              <div className="mt-3 divide-y divide-[var(--forge-border)] overflow-hidden rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface)]">
                {items.map((notification) => (
                  <button
                    className={`w-full px-4 py-5 text-left hover:bg-[var(--forge-surface-2)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--forge-focus)] disabled:cursor-wait sm:px-5 ${
                      notification.read
                        ? "border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50"
                        : "border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/5"
                    }`}
                    disabled={isMutating}
                    key={notification.id}
                    onClick={() => {
                      void markOne(notification);
                    }}
                    type="button"
                  >
                    <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words text-sm font-[540] text-[var(--forge-text)]">{notification.title}</p>
                          {!notification.read ? <ForgeChip tone="gold">Unread</ForgeChip> : null}
                        </div>
                        <p className="mt-2 max-w-[72ch] break-words text-sm leading-6 text-[var(--forge-muted)]">{notification.body}</p>
                      </div>
                      <span className="shrink-0 text-xs uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                        {timeAgo(notification.createdAt, useLocalTime)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <ForgeEmptyState
            description="No notifications match the selected filter."
            icon="notifications"
            title="No matching notifications"
          />
        )}
      </div>
    </section>
  );
}
