"use client";

import type { ComponentType } from "react";

import { Button } from "@heroui/button";
import clsx from "clsx";
import {
  User,
  Users,
  LockKeyhole,
  ReceiptText,
  Sparkles,
  MapPin,
  TableCellsSplit,
} from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/auth/auth-context";

type SettingsNavKey =
  | "users"
  | "permissions"
  | "profile"
  | "project-templates"
  | "ai-hub"
  | "citation-database"
  | "credit-usage";

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
      {
        href: "/dashboard/settings/permissions",
        icon: LockKeyhole,
        key: "permissions",
        label: "Permissions",
      },
      {
        href: "/dashboard/settings/project-templates",
        icon: ReceiptText,
        key: "project-templates",
        label: "Project Templates",
      },
      {
        href: "/dashboard/settings/ai-hub",
        icon: Sparkles,
        key: "ai-hub",
        label: "AI Hub",
      },
      {
        href: "/dashboard/settings/citation-database",
        icon: MapPin,
        key: "citation-database",
        label: "Citation Database",
      },
      {
        href: "/dashboard/settings/credit-usage",
        icon: TableCellsSplit,
        key: "credit-usage",
        label: "Credit Usage",
      },
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
  const { session } = useAuth();
  const isAdmin = session?.user.role === "ADMIN";

  const visibleGroups = SETTINGS_NAV_GROUPS.filter((group) =>
    group.title === "Admin" ? isAdmin : true,
  );

  return (
    <aside className="space-y-6 absolute left-0 top-0 h-full w-64 border-r border-default-200 p-4">
      {visibleGroups.map((group) => (
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
