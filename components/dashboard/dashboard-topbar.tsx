"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";
import { ChevronRight, Search, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-context";
import { useNotifications } from "@/components/dashboard/notifications-provider";

interface DashboardTopbarProps {
  title: string;
  subtitle: string;
}

export const DashboardTopbar = ({ title, subtitle }: DashboardTopbarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, session } = useAuth();
  const {
    markAllRead,
    markNotificationRead,
    notifications,
    unreadCount,
  } = useNotifications();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const displayName =
    [session?.user?.firstName, session?.user?.lastName]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join(" ")
      .trim() ||
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0]?.trim() ||
    "User";
  const emailAddress = session?.user?.email ?? "user@example.com";
  const avatarUrl = (() => {
    const rawAvatarUrl = session?.user?.avatarUrl?.trim();

    if (!rawAvatarUrl) {
      return undefined;
    }

    if (/^https?:\/\//i.test(rawAvatarUrl)) {
      return rawAvatarUrl;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
    const normalizedPath = rawAvatarUrl.replace(/^\/+/, "");

    return baseUrl ? `${baseUrl}/${normalizedPath}` : rawAvatarUrl;
  })();
  const headingTitle = title.includes(",")
    ? `${title.split(",")[0]}, ${displayName}!`
    : `${title} ${displayName}!`;

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("?")[0].split("/").filter(Boolean);

    if (!segments.length) {
      return [];
    }

    const formatSegment = (segment: string) => {
      if (!segment) {
        return "";
      }

      if (/^\d+$/.test(segment) || segment.length > 24) {
        return "Details";
      }

      return segment
        .split("-")
        .filter(Boolean)
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(" ");
    };

    return segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      const label =
        index === 0 ? "Dashboard" : formatSegment(decodeURIComponent(segment));

      return {
        href,
        isLast: index === segments.length - 1,
        label,
      };
    });
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };
  const notificationPreview = notifications.slice(0, 5);

  return (
    <header className="sticky top-0 z-20 h-[81px] border-b border-default-200 bg-white px-4 py-3.5">
      <div className="flex flex-col gap-4 items-center lg:flex-row lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold leading-tight text-foreground">
            {headingTitle.split(`${displayName}!`)[0]}
            <span className="text-[#022279]">{displayName}!</span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs font-medium text-default-700">
            {breadcrumbs.length ? (
              breadcrumbs.map((item) =>
                item.isLast ? (
                  <span key={item.href} className="text-default-700">
                    {item.label}
                  </span>
                ) : (
                  <div key={item.href} className="flex items-center gap-1">
                    <Link className="hover:text-[#022279]" href={item.href}>
                      {item.label}
                    </Link>
                    <ChevronRight size={12} />
                  </div>
                ),
              )
            ) : (
              <span>{subtitle}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-center">
          <Button isIconOnly radius="full" size="sm" variant="light">
            <Search size={20} />
          </Button>
          <Divider className="h-7" orientation="vertical" />
          <Popover
            isOpen={isNotificationsOpen}
            placement="bottom-end"
            onOpenChange={setIsNotificationsOpen}
          >
            <Badge
              color="danger"
              content={unreadCount > 99 ? "99+" : unreadCount || ""}
              isInvisible={unreadCount === 0}
              placement="top-right"
              shape="circle"
            >
              <PopoverTrigger>
                <Button isIconOnly radius="full" size="sm" variant="light">
                  <Bell
                    className={`transition-transform duration-200 ${isNotificationsOpen ? "rotate-12" : ""}`}
                    size={20}
                  />
                </Button>
              </PopoverTrigger>
            </Badge>
            <PopoverContent className="w-80 p-0">
              <div className="w-full">
                <div className="border-b border-default-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      Notifications
                    </p>
                    <p className="text-xs text-default-500">
                      {unreadCount} unread
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => {
                      void markAllRead();
                    }}
                  >
                    Mark all read
                  </Button>
                </div>
                </div>
                {notificationPreview.length ? (
                  <div className="max-h-80 overflow-y-auto py-1">
                    {notificationPreview.map((notification) => (
                      <button
                        key={notification.id}
                        className="w-full px-3 py-2 text-left transition-colors hover:bg-default-100"
                        type="button"
                        onClick={() => {
                          void markNotificationRead(notification.id);
                          setIsNotificationsOpen(false);
                          const url =
                            typeof notification.data?.url === "string"
                              ? notification.data.url
                              : "";

                          if (url) {
                            router.push(url);
                          }
                        }}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-[#111827]">
                              {notification.title}
                            </p>
                            {!notification.isRead ? (
                              <span className="mt-1 size-2 shrink-0 rounded-full bg-danger" />
                            ) : null}
                          </div>
                          <p className="line-clamp-2 text-xs text-default-500">
                            {notification.body}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-6 text-center text-sm text-default-500">
                    No notifications
                  </p>
                )}
                <button
                  className="w-full border-t border-default-200 px-3 py-3 text-left text-sm font-semibold text-[#022279] transition-colors hover:bg-default-100"
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    router.push("/dashboard/notifications");
                  }}
                >
                  View all notifications
                </button>
              </div>
            </PopoverContent>
          </Popover>
          <Divider className="h-7" orientation="vertical" />
          <div className="flex items-center gap-3 rounded-xl px-1 py-1">
            <Avatar
              className="bg-primary/10"
              name={displayName}
              size="md"
              src={avatarUrl}
            />
            <div className="leading-tight">
              <p className="text-base font-semibold text-foreground">
                {displayName}
              </p>
              <p className="text-sm text-default-500">{emailAddress}</p>
            </div>
          </div>
          <Dropdown placement="bottom-end" onOpenChange={setIsProfileMenuOpen}>
            <DropdownTrigger>
              <Button isIconOnly radius="full" size="sm" variant="light">
                <ChevronRight
                  className={`transition-transform duration-200 ${isProfileMenuOpen ? "rotate-90" : ""}`}
                  size={18}
                />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile actions">
              <DropdownItem key="logout" color="danger" onPress={handleLogout}>
                Logout
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </header>
  );
};
