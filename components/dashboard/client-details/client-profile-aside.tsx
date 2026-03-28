"use client";

import type { ComponentType } from "react";

import { Button } from "@heroui/button";
import clsx from "clsx";
import {
  Briefcase,
  Building2,
  ChartSpline,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
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
  icon: ComponentType<{ size?: string | number }>;
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
  { key: "content", label: "Content", icon: CircleHelp },
  { key: "gbp-posting", label: "GBP Postings", icon: CheckCircle2 },
  { key: "reviews", label: "Review Management", icon: Building2 },
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
  return (
    <aside className="space-y-3 absolute left-0 top-0 h-full w-64 border-r border-default-200 p-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#111827]">{clientName}</h2>
        <p className="text-xs text-default-500">{clientAddress}</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-default-400 mb-2">
          Menu
        </p>
        {CLIENT_MENU.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeKey;
          const className = clsx(
            "justify-start w-full",
            isActive && "text-[#022279]",
          );

          if (item.path) {
            return (
              <Link
                key={item.key}
                className="block"
                href={`/dashboard/clients/${slug}${item.path}`}
              >
                <Button
                  key={item.key}
                  className={className}
                  color="default"
                  startContent={<Icon size={15} />}
                  variant={isActive ? "flat" : "light"}
                >
                  {item.label}
                </Button>
              </Link>
            );
          }

          return (
            <Button
              key={item.key}
              className={className}
              color="default"
              startContent={<Icon size={15} />}
              type="button"
              variant={isActive ? "flat" : "light"}
            >
              {item.label}
            </Button>
          );
        })}
      </div>
    </aside>
  );
};
