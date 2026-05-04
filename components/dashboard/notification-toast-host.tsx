"use client";

import { useEffect } from "react";
import { Bell, X } from "lucide-react";

import type { AppNotification } from "@/apis/notifications";

const TOAST_AUTO_DISMISS_MS = 6000;

interface NotificationToastItem {
  id: string;
  notification: AppNotification;
}

interface NotificationToastHostProps {
  toasts: NotificationToastItem[];
  onDismiss: (id: string) => void;
}

const getActorInitials = (notification: AppNotification): string | null => {
  const name = notification.actor?.name?.trim();

  if (!name) return null;

  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  const initials = `${first}${last}`.toUpperCase();

  return initials || null;
};

const NotificationToastCard = ({
  notification,
  onDismiss,
}: {
  notification: AppNotification;
  onDismiss: () => void;
}) => {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, TOAST_AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  const initials = getActorInitials(notification);
  const url = notification.data?.url ? String(notification.data.url) : null;

  return (
    <div className="pointer-events-auto flex items-start gap-3 rounded-xl border border-default-200 bg-white p-4 shadow-lg ring-1 ring-black/5">
      <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#022279]/10 text-[#022279]">
        {initials ? (
          <span className="text-xs font-semibold">{initials}</span>
        ) : (
          <Bell size={16} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#111827]">
          {notification.title}
        </p>
        <p className="mt-1 line-clamp-3 text-sm leading-5 text-default-600">
          {notification.body}
        </p>
        {url ? (
          <a
            className="mt-2 inline-block text-xs font-medium text-[#022279] hover:underline"
            href={url}
          >
            Open
          </a>
        ) : null}
      </div>
      <button
        aria-label="Dismiss notification"
        className="flex-none rounded-md p-1 text-default-400 transition-colors hover:bg-default-100 hover:text-default-700"
        type="button"
        onClick={onDismiss}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const NotificationToastHost = ({
  onDismiss,
  toasts,
}: NotificationToastHostProps) => {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((item) => (
        <NotificationToastCard
          key={item.id}
          notification={item.notification}
          onDismiss={() => onDismiss(item.id)}
        />
      ))}
    </div>
  );
};

export type { NotificationToastItem };
