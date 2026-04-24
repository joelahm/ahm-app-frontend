export const TASK_STATUS_OPTIONS = [
  "To Do",
  "In Progress",
  "Internal Review",
  "Client Review",
  "On Hold",
  "Completed",
] as const;

export const normalizeTaskStatus = (value?: string | null) => {
  const source = (value ?? "").trim();
  const normalized = source.toUpperCase();

  if (normalized === "DONE" || normalized === "COMPLETED") {
    return "Completed";
  }

  if (normalized === "IN PROGRESS") {
    return "In Progress";
  }

  if (normalized === "ON HOLD") {
    return "On Hold";
  }

  if (normalized === "INTERNAL REVIEW") {
    return "Internal Review";
  }

  if (normalized === "CLIENT REVIEW") {
    return "Client Review";
  }

  return source || "To Do";
};
