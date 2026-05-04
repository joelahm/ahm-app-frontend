export const PROJECT_STATUS_OPTIONS = [
  "On Going",
  "On Hold",
  "Completed",
  "Cancelled",
  "Archived",
  "Delayed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_OPTIONS)[number];

export const normalizeProjectStatus = (
  value?: string | null,
): ProjectStatus => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) {
    return "On Going";
  }

  if (
    [
      "active",
      "draft",
      "implementation",
      "in progress",
      "onboarding",
      "ongoing",
      "on going",
      "planning",
    ].includes(normalized)
  ) {
    return "On Going";
  }

  if (normalized === "on hold" || normalized === "hold") {
    return "On Hold";
  }

  if (
    ["closed", "complete", "completed", "done", "finished"].includes(normalized)
  ) {
    return "Completed";
  }

  if (normalized === "cancel" || normalized === "cancelled") {
    return "Cancelled";
  }

  if (normalized === "archived") {
    return "Archived";
  }

  if (normalized === "delayed" || normalized === "overdue") {
    return "Delayed";
  }

  return "On Going";
};
