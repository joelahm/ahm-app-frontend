import { parseDate, today } from "@internationalized/date";

import {
  PROJECT_STATUS_OPTIONS,
} from "@/lib/project-statuses";
import { normalizeTaskStatus } from "@/lib/task-statuses";

export const toFriendlyDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value.includes("T") ? value.slice(0, 10) : value;
  }

  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const getTaskDueDateTime = (value?: string) => {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? Number.POSITIVE_INFINITY
    : parsed.getTime();
};

export const getStatusChipClassName = (status?: string) => {
  const normalizedStatus = normalizeTaskStatus(status ?? "");

  if (normalizedStatus === "Completed") {
    return "bg-[#DCFCE7] text-[#059669]";
  }

  if (normalizedStatus === "On Hold") {
    return "bg-[#FEF3C7] text-[#B45309]";
  }

  if (normalizedStatus === "In Progress") {
    return "bg-[#DBEAFE] text-[#1D4ED8]";
  }

  if (normalizedStatus === "Internal Review") {
    return "bg-[#E9D5FF] text-[#7E22CE]";
  }

  if (normalizedStatus === "Client Review") {
    return "bg-[#FCE7F3] text-[#BE185D]";
  }

  return "bg-[#E5E7EB] text-[#374151]";
};

export const defaultProjectStatusOptions = [...PROJECT_STATUS_OPTIONS];

export const toCalendarDate = (value?: string | null) => {
  if (!value || value === "-") {
    return null;
  }

  const normalized = value.includes("T") ? value.slice(0, 10) : value;

  try {
    return parseDate(normalized);
  } catch {
    return null;
  }
};

export const calendarDateToIso = (value: ReturnType<typeof today>) =>
  value.toString();

export const resolveServerAssetUrl = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  const normalizedPath = value.replace(/^\/+/, "");

  return baseUrl ? `${baseUrl}/${normalizedPath}` : value;
};

export const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

export const extractSelectedLines = (range: Range) => {
  const fragment = range.cloneContents();
  const container = document.createElement("div");

  container.appendChild(fragment);

  let buffer = "";

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      buffer += node.textContent ?? "";

      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    const blockTags = new Set(["div", "p", "li", "ul", "ol"]);

    if (tagName === "br") {
      buffer += "\n";

      return;
    }

    Array.from(element.childNodes).forEach((childNode) => {
      walk(childNode);
    });

    if (blockTags.has(tagName)) {
      buffer += "\n";
    }
  };

  Array.from(container.childNodes).forEach((childNode) => {
    walk(childNode);
  });

  return buffer
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

export const getCaretCharacterOffset = (element: HTMLElement) => {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();

  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
};

export const sanitizeCommentHtml = (html: string) => {
  if (typeof window === "undefined" || !html) {
    return "";
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(html, "text/html");
  const blockedTags = ["script", "style", "iframe", "object", "embed"];

  blockedTags.forEach((tagName) => {
    documentNode.querySelectorAll(tagName).forEach((node) => {
      node.remove();
    });
  });

  documentNode.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim().toLowerCase();

      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);

        return;
      }

      if (
        (attributeName === "href" || attributeName === "src") &&
        attributeValue.startsWith("javascript:")
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return documentNode.body.innerHTML;
};
