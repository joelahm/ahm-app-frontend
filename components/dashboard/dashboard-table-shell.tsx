"use client";

import type { ReactNode } from "react";
import type { ButtonProps } from "@heroui/button";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";

export interface DashboardTableAction {
  key: string;
  label: string;
  color?: ButtonProps["color"];
  variant?: ButtonProps["variant"];
  startContent?: ReactNode;
  onPress?: () => void;
}

interface DashboardTableShellProps {
  title: ReactNode;
  actions?: DashboardTableAction[];
  headerRight?: ReactNode;
  children: ReactNode;
}

export const DashboardTableShell = ({
  title,
  actions = [],
  headerRight,
  children,
}: DashboardTableShellProps) => {
  return (
    <Card className="border border-default-200 shadow-none">
      <CardHeader className="flex flex-col items-start justify-between gap-3 border-b-0 border-default-200 sm:flex-row sm:items-center">
        <h2 className="font-semibold text-foreground whitespace-nowrap flex-none">
          {title}
        </h2>
        {headerRight ?? (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => (
              <Button
                key={action.key}
                className={action.color ? "bg-[#022279] text-white" : undefined}
                color="default"
                startContent={action.startContent}
                variant={action.variant ?? "bordered"}
                onPress={action.onPress}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardBody className="p-0">{children}</CardBody>
    </Card>
  );
};
