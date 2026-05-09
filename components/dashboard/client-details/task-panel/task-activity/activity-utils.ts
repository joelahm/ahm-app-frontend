import type { JSONContent } from "@/components/dashboard/client-details/task-panel/editor/rich-text-editor";

export const getRelativeTime = (value: string) => {
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return "";

  const diffSeconds = Math.round((parsed - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return formatter.format(diffSeconds, "second");
};

export const jsonToPlainText = (value: JSONContent | null): string => {
  if (!value) return "";
  const parts: string[] = [];

  const walk = (node: JSONContent) => {
    if (typeof node.text === "string") {
      parts.push(node.text);
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
      if (node.type === "paragraph") {
        parts.push("\n");
      }
    }
  };

  walk(value);

  return parts.join("").trim();
};

export const getMetadataString = (
  metadata: Record<string, unknown>,
  key: string,
) => {
  const value = metadata[key];

  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
};
