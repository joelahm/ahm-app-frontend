"use client";

import type { ComponentType } from "react";

import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { Tooltip } from "@heroui/tooltip";
import clsx from "clsx";
import {
  Briefcase,
  Building2,
  ChartSpline,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardPen,
  Clock3,
  FolderKanban,
  Globe,
  ListChecks,
} from "lucide-react";
import Link from "next/link";

type ClientMenuKey =
  | "details"
  | "projects"
  | "analytics"
  | "tasks"
  | "local-rankings"
  | "gbp"
  | "content"
  | "gbp-posting"
  | "reviews"
  | "citations";

interface ClientProfileAsideProps {
  activeKey: ClientMenuKey;
  clientAddress?: string;
  clientName?: string;
  slug: string;
}

interface ClientMenuItem {
  key: ClientMenuKey;
  label: string;
  icon: ComponentType<{ className?: string; size?: string | number }>;
  path?: string;
}

const CLIENT_MENU: ClientMenuItem[] = [
  { key: "details", label: "Client Details", icon: Briefcase, path: "/" },
  { key: "projects", label: "Projects", icon: FolderKanban, path: "/projects" },
  {
    key: "analytics",
    label: "Analytics",
    icon: ChartSpline,
    path: "/analytics",
  },
  { key: "tasks", label: "Tasks", icon: ClipboardCheck, path: "/task-lists" },
  {
    key: "local-rankings",
    label: "Local Rankings",
    icon: ListChecks,
    path: "/local-rankings",
  },
  { key: "gbp", label: "GBP", icon: Globe, path: "/gbp" },
  {
    key: "content",
    label: "Website Content",
    icon: ClipboardPen,
    path: "/website-content",
  },
  {
    key: "gbp-posting",
    label: "GBP Postings",
    icon: CheckCircle2,
    path: "/gbp-postings",
  },
  {
    key: "reviews",
    label: "Review Management",
    icon: Building2,
    path: "/review-management",
  },
  {
    key: "citations",
    label: "Local Citations",
    icon: Clock3,
    path: "/local-citations",
  },
];

export const ClientProfileAside = ({
  activeKey,
  clientAddress = "",
  clientName = "",
  slug,
}: ClientProfileAsideProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem("client-menu-collapsed");
    const nextIsCollapsed = storedValue === "true";

    setIsCollapsed(nextIsCollapsed);
    document.documentElement.dataset.clientMenuCollapsed = nextIsCollapsed
      ? "true"
      : "false";
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      const nextValue = !current;

      window.localStorage.setItem(
        "client-menu-collapsed",
        nextValue ? "true" : "false",
      );
      document.documentElement.dataset.clientMenuCollapsed = nextValue
        ? "true"
        : "false";

      return nextValue;
    });
  };

  return (
    <aside
      className={clsx(
        "absolute left-0 top-0 h-full space-y-3 border-r border-default-200 p-4 transition-[width] duration-300",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      <div
        className={clsx(
          "mb-6 flex items-start gap-2",
          isCollapsed ? "justify-center" : "justify-between",
        )}
      >
        {!isCollapsed ? (
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-[#111827]">
              {clientName}
            </h2>
            <p className="truncate text-xs text-default-500">{clientAddress}</p>
          </div>
        ) : null}
        <Button
          isIconOnly
          aria-label={
            isCollapsed ? "Expand client menu" : "Collapse client menu"
          }
          radius="full"
          size="sm"
          variant="light"
          onPress={toggleCollapsed}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>

      <div className="space-y-1">
        {!isCollapsed ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-default-400">
            Menu
          </p>
        ) : null}
        {CLIENT_MENU.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeKey;
          const className = clsx(
            "w-full",
            isCollapsed ? "min-w-0 justify-center px-0" : "justify-start",
            isActive && "text-[#022279]",
          );
          const buttonContent = (
            <>
              <Icon className="shrink-0" size={15} />
              {!isCollapsed ? (
                <span className="truncate">{item.label}</span>
              ) : null}
            </>
          );
          const menuButton = item.path ? (
            <Link
              key={item.key}
              className="block"
              href={`/dashboard/clients/${slug}${item.path}`}
            >
              <Button
                key={item.key}
                className={className}
                color="default"
                isIconOnly={isCollapsed}
                variant={isActive ? "flat" : "light"}
              >
                {buttonContent}
              </Button>
            </Link>
          ) : (
            <Button
              key={item.key}
              className={className}
              color="default"
              isIconOnly={isCollapsed}
              type="button"
              variant={isActive ? "flat" : "light"}
            >
              {buttonContent}
            </Button>
          );

          if (!isCollapsed) {
            return menuButton;
          }

          return (
            <Tooltip key={item.key} content={item.label} placement="right">
              {menuButton}
            </Tooltip>
          );
        })}
      </div>
    </aside>
  );
};
