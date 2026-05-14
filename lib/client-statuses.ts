export const CLIENT_STATUS_VALUES = [
  "Active",
  "New Client",
  "Onboarding",
  "Implementation",
  "On Hold",
  "Churned",
  "Inactive",
] as const;

export type ClientStatus = (typeof CLIENT_STATUS_VALUES)[number];

export const DEFAULT_CLIENT_STATUS: ClientStatus = "Active";

const STATUS_BY_KEY: Record<string, ClientStatus> = {
  ACTIVE: "Active",
  NEW_CLIENT: "New Client",
  NEWCLIENT: "New Client",
  NEW: "New Client",
  ONBOARDING: "Onboarding",
  IMPLEMENTATION: "Implementation",
  ON_HOLD: "On Hold",
  ONHOLD: "On Hold",
  CHURNED: "Churned",
  INACTIVE: "Inactive",
};

const STATUS_STYLES: Record<ClientStatus | "Deleted", { chip: string }> = {
  Active: { chip: "bg-[#DCFCE7] text-[#059669]" },
  "New Client": { chip: "bg-[#DBEAFE] text-[#1D4ED8]" },
  Onboarding: { chip: "bg-[#E0E7FF] text-[#4338CA]" },
  Implementation: { chip: "bg-[#EDE9FE] text-[#6D28D9]" },
  "On Hold": { chip: "bg-[#FEF3C7] text-[#B45309]" },
  Churned: { chip: "bg-[#FEE2E2] text-[#B91C1C]" },
  Inactive: { chip: "bg-[#F3F4F6] text-[#4B5563]" },
  Deleted: { chip: "bg-[#FECACA] text-[#7F1D1D]" },
};

export const normalizeClientStatusLabel = (
  value?: string | null,
): ClientStatus => {
  const trimmed = (value ?? "").trim();

  if (!trimmed) {
    return DEFAULT_CLIENT_STATUS;
  }

  const upperKey = trimmed.toUpperCase().replace(/[\s-]+/g, "_");

  if (STATUS_BY_KEY[upperKey]) {
    return STATUS_BY_KEY[upperKey];
  }

  const matchedOption = CLIENT_STATUS_VALUES.find(
    (option) => option.toLowerCase() === trimmed.toLowerCase(),
  );

  if (matchedOption) {
    return matchedOption;
  }

  return DEFAULT_CLIENT_STATUS;
};

export const isDeletedClientStatus = (value?: string | null) => {
  const trimmed = (value ?? "").trim().toLowerCase();

  return trimmed === "deleted";
};

export const getClientStatusChipClassName = (value?: string | null) => {
  if (isDeletedClientStatus(value)) {
    return STATUS_STYLES.Deleted.chip;
  }

  return STATUS_STYLES[normalizeClientStatusLabel(value)].chip;
};

export const getClientStatusDisplay = (value?: string | null) => {
  if (isDeletedClientStatus(value)) {
    return "Deleted";
  }

  return normalizeClientStatusLabel(value);
};
