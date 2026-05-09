"use client";

import { Chip } from "@heroui/chip";

import { normalizeTaskStatus } from "@/lib/task-statuses";

import { getStatusChipClassName } from "./task-panel-utils";

export const TaskStatusChip = ({ status }: { status?: string }) => {
  const normalizedStatus = normalizeTaskStatus(status ?? "");

  return (
    <Chip
      className={getStatusChipClassName(normalizedStatus)}
      radius="full"
      size="sm"
      variant="flat"
    >
      {normalizedStatus}
    </Chip>
  );
};
