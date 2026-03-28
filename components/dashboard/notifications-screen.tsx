"use client";

import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Tab, Tabs } from "@heroui/tabs";
import { BellOff } from "lucide-react";

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

export const NotificationsScreen = () => {
  return (
    <div className="space-y-5 pb-8">
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
                  0
                </Chip>
              </div>
            }
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <p className={sectionTitleClass}>Today</p>
                <EmptyNotificationState description="Important notifications for today will appear here." />
              </div>

              <div className="space-y-3">
                <p className={sectionTitleClass}>Last 7 days</p>
                <EmptyNotificationState description="There are no important notifications in the last 7 days." />
              </div>
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
                  0
                </Chip>
              </div>
            }
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <p className={sectionTitleClass}>Today</p>
                <EmptyNotificationState description="Other notifications for today will appear here." />
              </div>

              <div className="space-y-3">
                <p className={sectionTitleClass}>Last 7 days</p>
                <EmptyNotificationState description="There are no other notifications in the last 7 days." />
              </div>
            </div>
          </Tab>

          <Tab
            key="cleared"
            title={
              <div className="flex items-center gap-2">
                <span>Cleared</span>
                <Chip
                  className="h-5 min-w-5 bg-[#EAECF0] px-1 text-[10px] font-semibold text-[#475467]"
                  radius="full"
                  size="sm"
                >
                  0
                </Chip>
              </div>
            }
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <p className={sectionTitleClass}>Today</p>
                <EmptyNotificationState description="Cleared notifications for today will appear here." />
              </div>

              <div className="space-y-3">
                <p className={sectionTitleClass}>Last 7 days</p>
                <EmptyNotificationState description="There are no cleared notifications in the last 7 days." />
              </div>
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
};
