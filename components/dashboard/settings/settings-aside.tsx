"use client";

import type { ComponentType } from "react";

import { Button } from "@heroui/button";
import clsx from "clsx";
import { User, Users } from "lucide-react";
import Link from "next/link";

type SettingsNavKey = "users" | "permissions" | "profile";

interface SettingsAsideProps {
  activeKey: SettingsNavKey;
}

interface SettingsNavItem {
  href: string;
  icon: ComponentType<{ size?: string | number }>;
  key: SettingsNavKey;
  label: string;
}

interface SettingsNavGroup {
  items: SettingsNavItem[];
  title: string;
}

const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    items: [
      {
        href: "/dashboard/settings",
        icon: Users,
        key: "users",
        label: "Users",
      },
      /* {
        href: "/dashboard/settings/permissions",
        icon: ShieldCheck,
        key: "permissions",
        label: "Permissions",
      }, */
    ],
    title: "Admin",
  },
  {
    items: [
      {
        href: "/dashboard/settings/profile",
        icon: User,
        key: "profile",
        label: "Profile",
      },
    ],
    title: "My Profile",
  },
];

export const SettingsAside = ({ activeKey }: SettingsAsideProps) => {
  return (
    <aside className="space-y-6 absolute left-0 top-0 h-full w-64 border-r border-default-200 p-4">
      {SETTINGS_NAV_GROUPS.map((group) => (
        <div key={group.title} className="space-y-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-default-400">
            {group.title}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activeKey;

            return (
              <Link key={item.key} className="block" href={item.href}>
                <Button
                  className={clsx(
                    "w-full justify-start",
                    isActive && "text-[#022279]",
                  )}
                  color="default"
                  startContent={<Icon size={15} />}
                  variant={isActive ? "flat" : "light"}
                >
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
};
