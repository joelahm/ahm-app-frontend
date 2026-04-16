"use client";

import type { ComponentType } from "react";

import { useState } from "react";
import NextLink from "next/link";
import clsx from "clsx";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { Tooltip } from "@heroui/tooltip";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  History,
  List,
  Megaphone,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash2,
  House,
  LayoutGrid,
  LifeBuoy,
  MessageSquareMore,
  FileText,
} from "lucide-react";

import { DashboardLogo } from "@/components/dashboard/dashboard-logo";

type SidebarItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string; size?: string | number }>;
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

const sidebarSections: SidebarSection[] = [
  {
    label: "General",
    items: [
      { href: "/dashboard", label: "AHM Dashboard", Icon: House },
      {
        href: "/dashboard/notifications",
        label: "Notifications",
        Icon: MessageSquareMore,
      },
      { href: "/dashboard/projects", label: "My Projects", Icon: House },
      { href: "/dashboard/clients", label: "Clients", Icon: Briefcase },
      { href: "/dashboard/projects-list", label: "Projects", Icon: LayoutGrid },
    ],
  },
  {
    label: "SEO",
    items: [
      {
        href: "/dashboard/keyword-research",
        label: "Keyword Research",
        Icon: FileText,
      },
      {
        href: "/dashboard/schema-generator",
        label: "Schema Generator",
        Icon: List,
      },
      {
        href: "/dashboard/ai-content-generator",
        label: "AI Content Generator",
        Icon: Sparkles,
      },
    ],
  },
  {
    label: "Scans",
    items: [
      { href: "/dashboard/quick-scan", label: "Quick Scan", Icon: Search },
      {
        href: "/dashboard/recurring-scan",
        label: "Recurring Scan",
        Icon: RefreshCw,
      },
      { href: "/dashboard/scan-history", label: "Scan History", Icon: History },
      {
        href: "/dashboard/deleted-scan-reports",
        label: "Deleted Scan Reports",
        Icon: Trash2,
      },
    ],
  },
  {
    label: "Engagement",
    items: [
      {
        href: "/dashboard/google-posts",
        label: "Google Posts",
        Icon: Megaphone,
      },
      {
        href: "/dashboard/google-reviews",
        label: "Google Reviews",
        Icon: Star,
      },
    ],
  },
  {
    label: "User",
    items: [
      { href: "/dashboard/settings", label: "Settings", Icon: Settings },
      {
        href: "/dashboard/help-support",
        label: "Help & Support",
        Icon: LifeBuoy,
      },
    ],
  },
];

const SidebarNavItem = ({
  collapsed,
  href,
  Icon,
  isActive,
  label,
}: {
  collapsed: boolean;
  href: string;
  Icon: SidebarItem["Icon"];
  isActive: boolean;
  label: string;
}) => {
  const navButton = (
    <Button
      as={NextLink}
      className={clsx(
        "h-11 text-sm w-full font-medium",
        collapsed ? "min-w-0 justify-center px-0" : "justify-start px-3",
        isActive
          ? "bg-[#F9FAFB] text-[#022279]"
          : "text-default-600 hover:bg-default-100 hover:text-default-900",
      )}
      color={isActive ? "primary" : "default"}
      href={href}
      isIconOnly={collapsed}
      prefetch={false}
      radius="sm"
      variant={isActive ? "flat" : "light"}
    >
      <Icon className="shrink-0" size={18} />
      {!collapsed && <span className="ml-1 truncate">{label}</span>}
    </Button>
  );

  if (!collapsed) {
    return navButton;
  }

  return (
    <Tooltip content={label} placement="right">
      {navButton}
    </Tooltip>
  );
};

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-default-200 bg-white transition-[width] duration-300",
        isCollapsed ? "w-[88px]" : "w-[290px]",
      )}
    >
      <div
        className={clsx(
          "flex items-center h-[80px]",
          isCollapsed ? "justify-center" : "justify-between px-4",
        )}
      >
        <DashboardLogo compact={isCollapsed} />
        {!isCollapsed && (
          <Button
            isIconOnly
            aria-label="Collapse sidebar"
            radius="full"
            size="sm"
            variant="light"
            onPress={() => setIsCollapsed(true)}
          >
            <ChevronLeft size={18} />
          </Button>
        )}
      </div>

      {isCollapsed && (
        <Button
          isIconOnly
          aria-label="Expand sidebar"
          className="mx-auto mt-2"
          radius="full"
          size="sm"
          variant="light"
          onPress={() => setIsCollapsed(false)}
        >
          <ChevronRight size={18} />
        </Button>
      )}

      <Divider />

      <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-6">
        {sidebarSections.map((section) => (
          <div key={section.label} className="space-y-1.5">
            {!isCollapsed && (
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-default-400">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <SidebarNavItem
                    key={item.href}
                    Icon={item.Icon}
                    collapsed={isCollapsed}
                    href={item.href}
                    isActive={isActive}
                    label={item.label}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};
