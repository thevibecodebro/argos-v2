"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

  const grouped = useMemo(() => {
    const groups = new Map<string, NotificationItem[]>();

    for (const notification of notifications) {
      const date = new Date(notification.createdAt);
      const key = date.toISOString().slice(0, 10);
      const current = groups.get(key) ?? [];
      current.push(notification);
      groups.set(key, current);
    }

    return [...groups.entries()];
  }, [notifications]);

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
      <section className="rounded-[1.75rem] border border-dashed border-slate-700/80 bg-slate-950/20 px-6 py-12 text-center">
        <p className="text-lg font-medium text-slate-200">No notifications yet</p>
        <p className="mt-2 text-sm text-slate-500">
          Uploading a call, adding annotations, and completing training modules will start populating this feed.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{unreadCount} unread</p>
          <p className="mt-1 text-sm text-slate-500">Scoring, coaching, and training activity across your account.</p>
        </div>
        <button
          className="rounded-xl border border-blue-500/30 bg-blue-600/15 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-600/25 disabled:opacity-50"
          disabled={unreadCount === 0 || isMutating}
          onClick={() => {
            void markAllRead();
          }}
          type="button"
        >
          Mark all read
        </button>
      </div>

      <div className="space-y-6">
        {grouped.map(([day, items]) => (
          <div key={day}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(new Date(day))}
            </p>
            <div className="mt-3 space-y-3">
              {items.map((notification) => (
                <button
                  className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition ${
                    notification.read
                      ? "border-slate-800/70 bg-slate-950/25"
                      : "border-blue-500/25 bg-blue-600/10"
                  }`}
                  key={notification.id}
                  onClick={() => {
                    void markOne(notification);
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{notification.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-400">{notification.body}</p>
                    </div>
                    <span className="shrink-0 text-xs uppercase tracking-[0.22em] text-slate-500">
                      {timeAgo(notification.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
