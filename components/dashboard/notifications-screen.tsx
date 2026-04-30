"use client";

import type { AppNotification } from "@/apis/notifications";

import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Tab, Tabs } from "@heroui/tabs";
import { BellOff, CheckCheck, ExternalLink, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { useNotifications } from "@/components/dashboard/notifications-provider";

const sectionTitleClass = "text-sm font-medium text-[#667085]";

const EmptyNotificationState = ({ description }: { description: string }) => (
  <Card className="border border-default-200 shadow-none">
    <CardBody className="flex min-h-[220px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="rounded-full bg-[#EEF2FF] p-4 text-[#4F46E5]">
        <BellOff size={28} />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold text-[#111827]">No notifications</p>
        <p className="text-sm text-default-500">{description}</p>
      </div>
    </CardBody>
  </Card>
);

const isToday = (value: string) => {
  const date = new Date(value);
  const now = new Date();

  return date.toDateString() === now.toDateString();
};

const formatNotificationTime = (value: string) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));

const NotificationCard = ({
  notification,
  onClear,
  onOpen,
  onRead,
}: {
  notification: AppNotification;
  onClear: (notification: AppNotification) => void;
  onOpen: (notification: AppNotification) => void;
  onRead: (notification: AppNotification) => void;
}) => (
  <Card className="border border-default-200 shadow-none">
    <CardBody className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {!notification.isRead ? (
            <span className="size-2 rounded-full bg-danger" />
          ) : null}
          <p className="font-semibold text-[#111827]">{notification.title}</p>
          <Chip
            className={
              notification.category === "IMPORTANT"
                ? "bg-[#FEF3F2] text-[#B42318]"
                : "bg-[#F2F4F7] text-[#475467]"
            }
            radius="full"
            size="sm"
          >
            {notification.category === "IMPORTANT" ? "Important" : "Other"}
          </Chip>
        </div>
        <p className="text-sm text-[#475467]">{notification.body}</p>
        <p className="text-xs text-default-400">
          {formatNotificationTime(notification.createdAt)}
        </p>
      </div>
      <div className="flex flex-none items-center gap-2">
        {!notification.isRead ? (
          <Button
            isIconOnly
            aria-label="Mark notification read"
            size="sm"
            variant="light"
            onPress={() => onRead(notification)}
          >
            <CheckCheck size={16} />
          </Button>
        ) : null}
        {notification.data?.url ? (
          <Button
            isIconOnly
            aria-label="Open notification target"
            size="sm"
            variant="light"
            onPress={() => onOpen(notification)}
          >
            <ExternalLink size={16} />
          </Button>
        ) : null}
        <Button
          isIconOnly
          aria-label="Clear notification"
          size="sm"
          variant="light"
          onPress={() => onClear(notification)}
        >
          <X size={16} />
        </Button>
      </div>
    </CardBody>
  </Card>
);

const NotificationSection = ({
  emptyDescription,
  notifications,
  title,
  onClear,
  onOpen,
  onRead,
}: {
  emptyDescription: string;
  notifications: AppNotification[];
  title: string;
  onClear: (notification: AppNotification) => void;
  onOpen: (notification: AppNotification) => void;
  onRead: (notification: AppNotification) => void;
}) => (
  <div className="space-y-3">
    <p className={sectionTitleClass}>{title}</p>
    {notifications.length ? (
      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onClear={onClear}
            onOpen={onOpen}
            onRead={onRead}
          />
        ))}
      </div>
    ) : (
      <EmptyNotificationState description={emptyDescription} />
    )}
  </div>
);

export const NotificationsScreen = () => {
  const router = useRouter();
  const {
    clearNotification,
    markAllRead,
    markNotificationRead,
    notifications,
    unreadCount,
  } = useNotifications();
  const importantNotifications = notifications.filter(
    (notification) => notification.category === "IMPORTANT",
  );
  const otherNotifications = notifications.filter(
    (notification) => notification.category !== "IMPORTANT",
  );
  const todayImportant = importantNotifications.filter((notification) =>
    isToday(notification.createdAt),
  );
  const previousImportant = importantNotifications.filter(
    (notification) => !isToday(notification.createdAt),
  );
  const todayOther = otherNotifications.filter((notification) =>
    isToday(notification.createdAt),
  );
  const previousOther = otherNotifications.filter(
    (notification) => !isToday(notification.createdAt),
  );
  const handleOpen = (notification: AppNotification) => {
    if (notification.data?.url && typeof notification.data.url === "string") {
      void markNotificationRead(notification.id);
      router.push(notification.data.url);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#111827]">
            Notifications
          </h2>
          <p className="text-sm text-default-500">
            Task updates, assignments, and comments appear here.
          </p>
        </div>
        <Button
          isDisabled={unreadCount === 0}
          startContent={<CheckCheck size={16} />}
          variant="bordered"
          onPress={() => {
            void markAllRead();
          }}
        >
          Mark all read
        </Button>
      </div>

      <div className="rounded-md border border-default-200 bg-white px-5 py-4">
        <Tabs
          aria-label="Notification categories"
          classNames={{
            cursor: "bg-transparent shadow-none",
            panel: "px-0 pt-5",
            tab: "h-auto px-0 data-[hover-unselected=true]:opacity-100",
            tabContent:
              "group-data-[selected=true]:text-[#111827] text-[#667085] font-semibold text-[15px]",
            tabList: "gap-8 rounded-none bg-transparent p-0",
          }}
          color="primary"
          variant="underlined"
        >
          <Tab
            key="important"
            title={
              <div className="flex items-center gap-2">
                <span>Important</span>
                <Chip
                  className="h-5 min-w-5 bg-[#F04438] px-1 text-[10px] font-semibold text-white"
                  radius="full"
                  size="sm"
                >
                  {importantNotifications.length}
                </Chip>
              </div>
            }
          >
            <div className="space-y-5">
              <NotificationSection
                emptyDescription="Important notifications for today will appear here."
                notifications={todayImportant}
                title="Today"
                onClear={(notification) => {
                  void clearNotification(notification.id);
                }}
                onOpen={handleOpen}
                onRead={(notification) => {
                  void markNotificationRead(notification.id);
                }}
              />
              <NotificationSection
                emptyDescription="There are no important notifications in the last 7 days."
                notifications={previousImportant}
                title="Last 7 days"
                onClear={(notification) => {
                  void clearNotification(notification.id);
                }}
                onOpen={handleOpen}
                onRead={(notification) => {
                  void markNotificationRead(notification.id);
                }}
              />
            </div>
          </Tab>

          <Tab
            key="other"
            title={
              <div className="flex items-center gap-2">
                <span>Other</span>
                <Chip
                  className="h-5 min-w-5 bg-[#EAECF0] px-1 text-[10px] font-semibold text-[#475467]"
                  radius="full"
                  size="sm"
                >
                  {otherNotifications.length}
                </Chip>
              </div>
            }
          >
            <div className="space-y-5">
              <NotificationSection
                emptyDescription="Other notifications for today will appear here."
                notifications={todayOther}
                title="Today"
                onClear={(notification) => {
                  void clearNotification(notification.id);
                }}
                onOpen={handleOpen}
                onRead={(notification) => {
                  void markNotificationRead(notification.id);
                }}
              />
              <NotificationSection
                emptyDescription="There are no other notifications in the last 7 days."
                notifications={previousOther}
                title="Last 7 days"
                onClear={(notification) => {
                  void clearNotification(notification.id);
                }}
                onOpen={handleOpen}
                onRead={(notification) => {
                  void markNotificationRead(notification.id);
                }}
              />
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
};
