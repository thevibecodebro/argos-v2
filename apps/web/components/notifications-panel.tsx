"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeSurface,
} from "@/components/forge";
import type { NotificationItem } from "@/lib/notifications/service";

type NotificationsPanelProps = {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
};

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationsPanel({
  initialNotifications,
  initialUnreadCount,
}: NotificationsPanelProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isMutating, setIsMutating] = useState(false);
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
      const key = date.toISOString().slice(0, 10);
      const current = groups.get(key) ?? [];
      current.push(notification);
      groups.set(key, current);
    }

    return [...groups.entries()];
  }, [filteredNotifications]);

  async function markOne(notification: NotificationItem) {
    if (!notification.read) {
      setIsMutating(true);
      await fetch(`/api/notifications/${notification.id}/read`, { method: "POST" });
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      setIsMutating(false);
    }

    if (notification.link) {
      router.push(notification.link);
      router.refresh();
    }
  }

  async function markAllRead() {
    setIsMutating(true);
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    setIsMutating(false);
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
    <ForgeSurface as="section" className="space-y-5 p-6" variant="panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--forge-text)]">
              {unreadCount === 0 ? "All caught up" : `${unreadCount} unread`}
            </p>
            <ForgeChip tone={unreadCount > 0 ? "gold" : "muted"}>
              {notifications.length} total
            </ForgeChip>
          </div>
          <p className="mt-1 text-sm text-[var(--forge-muted)]">Scoring, coaching, and training activity across your account.</p>
        </div>
        <ForgeButton
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

      <div
        className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--forge-border)] bg-[rgba(8,6,5,0.45)] p-2"
        data-notification-filters="active"
      >
        {[
          { label: "All", value: "all" as const },
          { label: "Unread", value: "unread" as const },
          { label: "Read", value: "read" as const },
        ].map((option) => (
          <button
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              filter === option.value
                ? "bg-[rgba(241,191,123,0.14)] text-[var(--forge-gold)]"
                : "text-[var(--forge-muted)] hover:bg-[rgba(255,244,230,0.04)] hover:text-[var(--forge-text)]"
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
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
                {new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(new Date(day))}
              </p>
              <div className="mt-3 space-y-3">
                {items.map((notification) => (
                  <button
                    className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                      notification.read
                        ? "border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50"
                        : "border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/5"
                    }`}
                    key={notification.id}
                    onClick={() => {
                      void markOne(notification);
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--forge-text)]">{notification.title}</p>
                          {!notification.read ? <ForgeChip tone="gold">Unread</ForgeChip> : null}
                        </div>
                        <p className="mt-2 text-sm leading-7 text-[var(--forge-muted)]">{notification.body}</p>
                      </div>
                      <span className="shrink-0 text-xs uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                        {timeAgo(notification.createdAt)}
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
    </ForgeSurface>
  );
}
