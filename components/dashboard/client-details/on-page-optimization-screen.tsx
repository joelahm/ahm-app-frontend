"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { Drawer, DrawerBody, DrawerContent } from "@heroui/drawer";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { ScrollShadow } from "@heroui/scroll-shadow";
import {
  ChevronLeft,
  Columns3,
  Download,
  EllipsisVertical,
  ExternalLink,
  Eye,
  FileText,
  Info,
  List,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { Tooltip } from "@heroui/tooltip";

import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { clientsApi } from "@/apis/clients";
import {
  onPageOptimizationsApi,
  type OnPageOptimizationRun,
} from "@/apis/on-page-optimizations";
import { useAuth } from "@/components/auth/auth-context";
import { OnPagePageActivityFeed } from "@/components/dashboard/client-details/on-page-optimization/on-page-page-activity-feed";
import { useAppToast } from "@/hooks/use-app-toast";

type PageFoundRow = {
  auditPage: WebsiteQaAuditPage;
  id: string;
  imageCount: number;
  keyword: string;
  metaDescription: string;
  metaTitle: string;
  selected: boolean;
  status: string;
  type: string;
  url: string;
};

type PageDisplayRow = PageFoundRow & {
  hasChildren: boolean;
  level: number;
  parentId: string | null;
};

type DetailTab =
  | "header-structure"
  | "on-page"
  | "anchor-text"
  | "image-optimization";

type HeadingIssueSeverity = "high" | "medium" | "low";

type HeadingIssue = {
  headingIndex?: number | null;
  headingLevel?: number | null;
  headingText?: string | null;
  howToFix?: string;
  recommendation?: string;
  ruleKey?: string;
  severity?: HeadingIssueSeverity;
  title?: string;
  whyItMatters?: string;
};

type OnPageIssueSeverity = "critical" | "warning" | "suggestion";

type OnPageIssue = {
  anchorIndex?: number | null;
  anchorText?: string | null;
  href?: string | null;
  howToFix?: string;
  recommendation?: string;
  rowKey?: string | null;
  ruleKey?: string;
  severity?: OnPageIssueSeverity;
  title?: string;
  whyItMatters?: string;
};

type AnchorLink = {
  accessibleText?: string;
  anchorText?: string;
  ariaLabel?: string;
  cardTitle?: string | null;
  context?: string;
  href?: string;
  imageAlt?: string;
  index?: number;
  isInternal?: boolean;
  isValidUrl?: boolean;
  doFollow?: boolean;
  finalHref?: string;
  placement?: string;
  rawHref?: string;
  redirected?: boolean;
  rel?: string;
  statusCode?: number | null;
  statusError?: string | null;
  target?: string;
  wrapsImage?: boolean;
};

type WebsiteQaSeo = {
  anchorIssues?: OnPageIssue[];
  canonical?: string | null;
  compliance?: Record<string, boolean>;
  cro?: Record<string, boolean | number>;
  error?: string | null;
  finalUrl?: string | null;
  firstH1?: string | null;
  flags?: string[];
  focusKeyword?: {
    keyword?: string | null;
    source?: string | null;
  } | null;
  headingCounts?: Partial<Record<`h${1 | 2 | 3 | 4 | 5 | 6}`, number>>;
  headingIssues?: HeadingIssue[];
  headings?: Array<{
    index?: number;
    level?: number;
    text?: string;
  }>;
  h1Count?: number | null;
  lang?: string | null;
  links?: AnchorLink[];
  metaDescription?: string | null;
  nav?: Array<{ href?: string; text?: string }>;
  onPageIssues?: OnPageIssue[];
  schemaJsonLd?: boolean | null;
  seoLinks?: AnchorLink[];
  slug?: {
    grade?: string;
    reasons?: string[];
  };
  status?: number | null;
  title?: string | null;
  url?: string;
  viewport?: string | null;
};

type WebsiteQaImage = {
  alt?: string;
  contentType?: string;
  external?: boolean;
  flags?: string[];
  filename?: string;
  height?: number | null;
  issues?: Array<{
    message?: string;
    recommendation?: string;
    ruleKey?: string;
    severity?: OnPageIssueSeverity | "pass";
  }>;
  placement?: string;
  recommendations?: string[];
  severity?: OnPageIssueSeverity | "pass";
  sizeBytes?: number | null;
  src?: string;
  statusCode?: number | null;
  statusError?: string | null;
  width?: number | null;
};

type WebpExportSummary = {
  failed: Array<{ reason: string; src: string }>;
  selected: number;
  skipped: number;
  successful: number;
};

type WebpExportStatus =
  | "idle"
  | "preparing"
  | "converting"
  | "zipping"
  | "ready";

type WebsiteQaAuditPage = {
  errors?: string[];
  images?: {
    externalCount?: number;
    flagged?: WebsiteQaImage[];
    items?: WebsiteQaImage[];
    pageIssues?: Array<{
      message?: string;
      recommendation?: string;
      ruleKey?: string;
      severity?: OnPageIssueSeverity | "pass";
    }>;
    score?: number;
    total?: number;
  };
  seo?: WebsiteQaSeo;
  url: string;
  vision?: {
    error?: string;
    issues?: Array<{
      category?: string;
      fix?: string;
      issue?: string;
      severity?: string;
      viewport?: string;
    }>;
    summary?: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = "-") =>
  typeof value === "string" && value.trim() ? value : fallback;

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const mapWebsiteQaImage = (image: Record<string, unknown>): WebsiteQaImage => ({
  alt: asString(image.alt, ""),
  contentType: asString(image.contentType, ""),
  external: Boolean(image.external),
  filename: asString(image.filename, ""),
  flags: Array.isArray(image.flags)
    ? image.flags.filter(Boolean).map(String)
    : [],
  height: typeof image.height === "number" ? image.height : null,
  issues: Array.isArray(image.issues)
    ? image.issues.filter(isRecord).map((issue) => ({
        message: asString(issue.message, ""),
        recommendation: asString(issue.recommendation, ""),
        ruleKey: asString(issue.ruleKey, ""),
        severity: asString(issue.severity, "suggestion") as OnPageIssueSeverity,
      }))
    : [],
  placement: asString(image.placement, "main_content"),
  recommendations: Array.isArray(image.recommendations)
    ? image.recommendations.filter(Boolean).map(String)
    : [],
  severity: asString(image.severity, "pass") as WebsiteQaImage["severity"],
  sizeBytes: typeof image.sizeBytes === "number" ? image.sizeBytes : null,
  src: asString(image.src, ""),
  statusCode: typeof image.statusCode === "number" ? image.statusCode : null,
  statusError: asString(image.statusError, ""),
  width: typeof image.width === "number" ? image.width : null,
});

const headingSeverityRank: Record<HeadingIssueSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const getWorstHeadingIssueSeverity = (issues: HeadingIssue[]) =>
  issues.reduce<HeadingIssueSeverity | null>((worst, issue) => {
    const severity = issue.severity ?? "medium";

    if (!worst || headingSeverityRank[severity] > headingSeverityRank[worst]) {
      return severity;
    }

    return worst;
  }, null);

const getHeadingIssueClasses = (severity: HeadingIssueSeverity | null) => {
  if (severity === "high") {
    return {
      badge: "bg-[#FEE2E2] text-[#B91C1C]",
      row: "border-[#FCA5A5] bg-[#FEF2F2]",
    };
  }

  if (severity === "medium") {
    return {
      badge: "bg-[#FEF3C7] text-[#B45309]",
      row: "border-[#FCD34D] bg-[#FFFBEB]",
    };
  }

  if (severity === "low") {
    return {
      badge: "bg-[#E0F2FE] text-[#0369A1]",
      row: "border-[#BAE6FD] bg-[#F0F9FF]",
    };
  }

  return {
    badge: "bg-[#D5FAFF] text-[#009BB5]",
    row: "border-default-100 bg-[#FAFBFC]",
  };
};

const getOnPageIssueRank = (severity: OnPageIssueSeverity) => {
  if (severity === "critical") return 3;
  if (severity === "warning") return 2;

  return 1;
};

const getWorstOnPageIssueSeverity = (issues: OnPageIssue[]) =>
  issues.reduce<OnPageIssueSeverity | null>((worst, issue) => {
    const severity = issue.severity ?? "warning";

    if (!worst || getOnPageIssueRank(severity) > getOnPageIssueRank(worst)) {
      return severity;
    }

    return worst;
  }, null);

const getOnPageIssueClasses = (severity: OnPageIssueSeverity | null) => {
  if (severity === "critical") {
    return {
      badge: "bg-[#FEE2E2] text-[#B91C1C]",
      row: "border-[#FCA5A5] bg-[#FEF2F2]",
    };
  }

  if (severity === "warning") {
    return {
      badge: "bg-[#FEF3C7] text-[#B45309]",
      row: "border-[#FCD34D] bg-[#FFFBEB]",
    };
  }

  if (severity === "suggestion") {
    return {
      badge: "bg-[#E0F2FE] text-[#0369A1]",
      row: "border-[#BAE6FD] bg-[#F0F9FF]",
    };
  }

  return {
    badge: "bg-[#CFFAFE] text-[#0284C7]",
    row: "border-default-200 bg-white",
  };
};

const getHeadingSelectionKey = (heading: {
  index?: number;
  level?: number;
  text?: string;
}) =>
  typeof heading.index === "number"
    ? `index-${heading.index}`
    : `heading-${heading.level ?? "x"}-${heading.text ?? ""}`;

const getMetaTitleLengthClass = (value: string) => {
  const length = value === "-" ? 0 : value.length;

  if (length >= 50 && length <= 60) {
    return "bg-[#DCFCE7] text-[#15803D]";
  }

  if ((length >= 40 && length < 50) || (length > 60 && length <= 70)) {
    return "bg-[#FEF3C7] text-[#B45309]";
  }

  return "bg-[#FEE2E2] text-[#B91C1C]";
};

const getMetaDescriptionLengthClass = (value: string) => {
  const length = value === "-" ? 0 : value.length;

  if (length >= 140 && length <= 160) {
    return "bg-[#DCFCE7] text-[#15803D]";
  }

  if ((length >= 120 && length < 140) || (length > 160 && length <= 180)) {
    return "bg-[#FEF3C7] text-[#B45309]";
  }

  return "bg-[#FEE2E2] text-[#B91C1C]";
};

const getAnchorStatusClass = (
  statusCode?: number | null,
  statusError?: string | null,
) => {
  if (typeof statusCode === "number" && statusCode >= 200 && statusCode < 300) {
    return "bg-[#DCFCE7] text-[#15803D]";
  }

  if (typeof statusCode === "number" && statusCode >= 300 && statusCode < 400) {
    return "bg-[#FEF3C7] text-[#B45309]";
  }

  if (
    (typeof statusCode === "number" && statusCode >= 400) ||
    (statusError && statusError !== "Not checked")
  ) {
    return "bg-[#FEE2E2] text-[#B91C1C]";
  }

  return statusPillClass;
};

const formatImageSize = (sizeBytes?: number | null) => {
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes)) {
    return "Unknown";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes}B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)}KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`;
};

const formatImagePlacement = (placement?: string) =>
  (placement || "main_content")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const imageSeverityStatus = (severity?: WebsiteQaImage["severity"]) => {
  if (severity === "critical") return "Critical";
  if (severity === "warning") return "Warning";
  if (severity === "suggestion") return "Suggestion";

  return "Pass";
};

const imageStatusClass = (severity?: WebsiteQaImage["severity"]) => {
  if (severity === "critical") return "bg-[#FEE2E2] text-[#B91C1C]";
  if (severity === "warning") return "bg-[#FEF3C7] text-[#B45309]";
  if (severity === "suggestion") return "bg-[#E0F2FE] text-[#0369A1]";

  return "bg-[#DCFCE7] text-[#15803D]";
};

const webpExportStatusLabel = (status: WebpExportStatus) => {
  if (status === "preparing") return "Preparing images...";
  if (status === "converting") return "Converting images...";
  if (status === "zipping") return "Creating ZIP...";
  if (status === "ready") return "Download ready";

  return "";
};

const getImageExtension = (src?: string) => {
  if (!src) return "";

  try {
    const pathname = new URL(src).pathname;
    const extension = pathname.split(".").pop()?.toLowerCase() ?? "";

    return extension.replace(/[^a-z0-9]/g, "");
  } catch {
    return src.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  }
};

const isTrackingOrPlaceholderImage = (image: WebsiteQaImage) => {
  const source = `${image.src ?? ""} ${image.filename ?? ""}`.toLowerCase();
  const tiny =
    typeof image.width === "number" &&
    typeof image.height === "number" &&
    image.width <= 2 &&
    image.height <= 2;

  return (
    tiny ||
    /tracking|pixel|spacer|placeholder|skeleton|loader|blank|transparent|1x1/.test(
      source,
    )
  );
};

const isEmbedThumbnail = (image: WebsiteQaImage) =>
  /youtube\.com|ytimg\.com|vimeo\.com|facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com/i.test(
    image.src ?? "",
  );

const getWebpEligibility = (image: WebsiteQaImage) => {
  const extension = getImageExtension(image.src);

  if (extension === "webp") {
    return {
      isEligible: false,
      reason: "Image already optimized as WebP",
      status: "Already WebP",
    };
  }

  if (["avif", "svg", "gif"].includes(extension)) {
    return {
      isEligible: false,
      reason: "Unsupported image format",
      status: "Excluded",
    };
  }

  if (!["jpg", "jpeg", "png"].includes(extension)) {
    return {
      isEligible: false,
      reason: "Unsupported image format",
      status: "Excluded",
    };
  }

  if (
    (typeof image.statusCode === "number" && image.statusCode >= 400) ||
    (image.statusError && image.statusError !== "Not checked")
  ) {
    return {
      isEligible: false,
      reason: "Image is broken or inaccessible",
      status: "Excluded",
    };
  }

  if (["logo", "icon"].includes(image.placement ?? "")) {
    return {
      isEligible: false,
      reason: "Decorative image excluded",
      status: "Excluded",
    };
  }

  if (isTrackingOrPlaceholderImage(image)) {
    return {
      isEligible: false,
      reason: "Tracking or placeholder image excluded",
      status: "Excluded",
    };
  }

  if (isEmbedThumbnail(image)) {
    return {
      isEligible: false,
      reason: "Third-party embed thumbnail excluded",
      status: "Excluded",
    };
  }

  if (image.external) {
    return {
      isEligible: false,
      reason: "Third-party image excluded",
      status: "Excluded",
    };
  }

  return {
    isEligible: true,
    reason: null,
    status: "Eligible",
  };
};

const truncateUrl = (url: string) =>
  url.length > 34 ? `${url.slice(0, 31)}...` : url;

const labelFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    if (!lastSegment) {
      return "Homepage";
    }

    return decodeURIComponent(lastSegment)
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {
    return url;
  }
};

const getUrlPathSegments = (url: string) => {
  try {
    const parsed = new URL(url);

    return parsed.pathname
      .replace(/\/+$/, "")
      .split("/")
      .filter(Boolean)
      .map((segment) => segment.toLowerCase());
  } catch {
    return [];
  }
};

const pageTypeFromUrl = (url: string) => {
  const segments = getUrlPathSegments(url);
  const [firstSegment] = segments;

  if (segments.length === 0) {
    return "Homepage";
  }

  if (firstSegment === "conditions") {
    return segments.length === 1 ? "Conditions Listing" : "Condition Page";
  }

  if (firstSegment === "treatments") {
    return segments.length === 1 ? "Treatment Listing" : "Treatment Page";
  }

  if (firstSegment === "services") {
    return segments.length === 1 ? "Service Listing" : "Service Page";
  }

  if (
    [
      "blog",
      "news",
      "article",
      "articles",
      "insight",
      "insights",
      "press",
    ].includes(firstSegment ?? "")
  ) {
    return "Blog Page";
  }

  if (firstSegment === "about") {
    return "About Page";
  }

  if (
    ["contact", "book", "appointment", "location"].includes(firstSegment ?? "")
  ) {
    return "Contact Page";
  }

  return "Page";
};

const getNormalizedPath = (url: string) => {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");

    return path || "/";
  } catch {
    return url;
  }
};

const buildHierarchicalPageRows = (rows: PageFoundRow[]): PageDisplayRow[] => {
  const rowByPath = new Map<string, PageFoundRow>();
  const pathByRowId = new Map<string, string>();

  rows.forEach((row) => {
    const path = getNormalizedPath(row.url);

    rowByPath.set(path, row);
    pathByRowId.set(row.id, path);
  });

  const childrenByParentId = new Map<string, PageFoundRow[]>();
  const parentIdByRowId = new Map<string, string | null>();

  rows.forEach((row) => {
    const path = pathByRowId.get(row.id) ?? getNormalizedPath(row.url);
    const segments = path.split("/").filter(Boolean);
    let parent: PageFoundRow | null = null;

    for (let index = segments.length - 1; index > 0; index -= 1) {
      const parentPath = `/${segments.slice(0, index).join("/")}`;
      const candidate = rowByPath.get(parentPath);

      if (candidate) {
        parent = candidate;
        break;
      }
    }

    parentIdByRowId.set(row.id, parent?.id ?? null);

    if (parent) {
      const children = childrenByParentId.get(parent.id) ?? [];

      children.push(row);
      childrenByParentId.set(parent.id, children);
    }
  });

  const displayRows: PageDisplayRow[] = [];
  const appendRow = (row: PageFoundRow, level: number) => {
    const children = childrenByParentId.get(row.id) ?? [];

    displayRows.push({
      ...row,
      hasChildren: children.length > 0,
      level,
      parentId: parentIdByRowId.get(row.id) ?? null,
    });

    children.forEach((child) => appendRow(child, level + 1));
  };

  rows
    .filter((row) => !parentIdByRowId.get(row.id))
    .forEach((row) => appendRow(row, 0));

  return displayRows;
};

const statusFromPage = (page: WebsiteQaAuditPage) => {
  if (page.errors?.length || page.seo?.error || page.vision?.error) {
    return "Need to Fix";
  }

  const issueCount =
    (page.seo?.flags?.length ?? 0) +
    (page.images?.flagged?.length ?? 0) +
    (page.vision?.issues?.length ?? 0);

  return issueCount > 0 ? "Need to Fix" : "Completed";
};

const getOnPageIssuesWithFallbacks = (
  page: WebsiteQaAuditPage,
): OnPageIssue[] => {
  const seo = page.seo;
  const issues = [...(seo?.onPageIssues ?? [])];
  const hasIssue = (ruleKey: string, rowKey: string) =>
    issues.some(
      (issue) => issue.ruleKey === ruleKey || issue.rowKey === rowKey,
    );
  const addIssue = (issue: OnPageIssue) => {
    if (
      !issue.ruleKey ||
      !issue.rowKey ||
      hasIssue(issue.ruleKey, issue.rowKey)
    ) {
      return;
    }

    issues.push(issue);
  };

  if (!seo) {
    return issues;
  }

  if (
    typeof seo.status === "number" &&
    (seo.status < 200 || seo.status >= 400)
  ) {
    addIssue({
      howToFix:
        "Fix the page response so the final URL returns a valid 2xx status.",
      recommendation:
        "Make sure the page is reachable and returns a successful HTTP status.",
      rowKey: "page-url",
      ruleKey: "HTTP_STATUS_NOT_SUCCESSFUL",
      severity: "critical",
      title: "Page URL is not returning a successful status",
      whyItMatters:
        "Search engines need a reachable, successful URL to crawl and index the page.",
    });
  }

  if (!seo.title) {
    addIssue({
      howToFix:
        "Add a unique 50-60 character SEO title with the primary topic near the beginning.",
      recommendation: "Add a unique title tag for this page.",
      rowKey: "meta-title",
      ruleKey: "MISSING_TITLE",
      severity: "critical",
      title: "Missing title tag",
      whyItMatters:
        "The title tag is one of the strongest on-page SEO and click-through signals.",
    });
  }

  if (!seo.metaDescription) {
    addIssue({
      howToFix:
        "Write 140-160 characters that summarize the page value and include a CTA where relevant.",
      recommendation: "Add a unique meta description for this page.",
      rowKey: "meta-description",
      ruleKey: "MISSING_META_DESCRIPTION",
      severity: "warning",
      title: "Missing meta description",
      whyItMatters:
        "A missing description can cause weak auto-generated search snippets.",
    });
  }

  if (seo.h1Count === 0 || !seo.firstH1) {
    addIssue({
      howToFix:
        "Add one H1 near the top of the content using the primary page topic.",
      recommendation:
        "Add exactly one H1 that clearly describes the page topic.",
      rowKey: "h1",
      ruleKey: "MISSING_H1",
      severity: "critical",
      title: "Missing H1",
      whyItMatters:
        "The H1 is the primary semantic heading for crawlers and accessibility tools.",
    });
  } else if (typeof seo.h1Count === "number" && seo.h1Count > 1) {
    addIssue({
      howToFix:
        "Keep the main page heading as H1 and demote secondary H1s to H2 or H3.",
      recommendation: "Keep exactly one H1 on the page.",
      rowKey: "h1",
      ruleKey: "MULTIPLE_H1",
      severity: "warning",
      title: "Multiple H1 headings",
      whyItMatters: "Multiple H1s can make the primary page topic less clear.",
    });
  }

  if ((seo.headingIssues ?? []).length) {
    addIssue({
      howToFix:
        "Open the Header Structure tab and fix the listed H1-H6 hierarchy/content issues.",
      recommendation: "Review and improve the heading structure.",
      rowKey: "headings",
      ruleKey: "HEADING_STRUCTURE_ISSUES",
      severity: "warning",
      title: "Heading structure needs improvement",
      whyItMatters:
        "Clear headings improve accessibility, crawlability, and page readability.",
    });
  }

  if (!seo.canonical) {
    addIssue({
      howToFix:
        "Use the SEO plugin or page head template to add a canonical URL.",
      recommendation:
        "Add a canonical tag that points to the preferred page URL.",
      rowKey: "canonical",
      ruleKey: "MISSING_CANONICAL",
      severity: "critical",
      title: "Canonical URL is missing",
      whyItMatters:
        "Missing canonicals can cause duplicate URL variations to compete.",
    });
  }

  if (!seo.schemaJsonLd) {
    addIssue({
      howToFix:
        "Add Organization, LocalBusiness/MedicalClinic, Breadcrumb, FAQ, Article, or Review schema where relevant.",
      recommendation: "Add valid JSON-LD schema for the page type.",
      rowKey: "schema",
      ruleKey: "MISSING_SCHEMA",
      severity: "warning",
      title: "Structured data is missing",
      whyItMatters:
        "Schema helps search engines understand page entities and can support rich results.",
    });
  }

  return issues;
};

const getAuditPages = (run: OnPageOptimizationRun | null) => {
  const audit = isRecord(run?.result) ? run.result.audit : null;

  if (!isRecord(audit) || !Array.isArray(audit.pages)) {
    return [];
  }

  return audit.pages.filter(isRecord).map((page) => ({
    errors: Array.isArray(page.errors)
      ? page.errors.filter(Boolean).map(String)
      : [],
    images: isRecord(page.images)
      ? {
          externalCount: asNumber(page.images.externalCount),
          flagged: Array.isArray(page.images.flagged)
            ? page.images.flagged.filter(isRecord).map(mapWebsiteQaImage)
            : [],
          items: Array.isArray(page.images.items)
            ? page.images.items.filter(isRecord).map(mapWebsiteQaImage)
            : [],
          pageIssues: Array.isArray(page.images.pageIssues)
            ? page.images.pageIssues.filter(isRecord).map((issue) => ({
                message: asString(issue.message, ""),
                recommendation: asString(issue.recommendation, ""),
                ruleKey: asString(issue.ruleKey, ""),
                severity: asString(
                  issue.severity,
                  "suggestion",
                ) as OnPageIssueSeverity,
              }))
            : [],
          score: asNumber(page.images.score),
          total: asNumber(page.images.total),
        }
      : undefined,
    seo: isRecord(page.seo) ? (page.seo as WebsiteQaSeo) : undefined,
    url: asString(page.url, ""),
    vision: isRecord(page.vision)
      ? (page.vision as WebsiteQaAuditPage["vision"])
      : undefined,
  }));
};

const buildPageRows = (run: OnPageOptimizationRun | null): PageFoundRow[] =>
  getAuditPages(run).map((page, index) => ({
    auditPage: page,
    id: `${page.url}-${index}`,
    imageCount: page.images?.total ?? 0,
    keyword: labelFromUrl(page.url),
    metaDescription: page.seo?.metaDescription ?? "-",
    metaTitle: page.seo?.title ?? "-",
    selected: true,
    status: statusFromPage(page),
    type: pageTypeFromUrl(page.url),
    url: page.url,
  }));

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusChipClass = (status: string) => {
  if (status === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "FAILED") {
    return "bg-red-50 text-red-700";
  }

  if (status === "RUNNING") {
    return "bg-[#EEF2FF] text-[#022279]";
  }

  return "bg-[#F3F4F6] text-[#4B5563]";
};

const formatScore = (score: number | null) =>
  typeof score === "number" ? `${score}/100` : "-";

const detailTabs: Array<{ key: DetailTab; label: string }> = [
  { key: "header-structure", label: "Header Structure" },
  { key: "on-page", label: "On-Page" },
  { key: "anchor-text", label: "Anchor Text" },
  { key: "image-optimization", label: "Image Optimization" },
];

const statusPillClass = "bg-[#CFFAFE] text-[#0284C7]";
const pageColumnLabels: Record<string, string> = {
  action: "Action",
  images: "Images",
  keyword: "Keyword",
  metaDescription: "Meta Description",
  metaTitle: "Meta Title",
  status: "Status",
  type: "Type of Page",
};
const defaultPageVisibleColumns = new Set([
  "keyword",
  "metaTitle",
  "metaDescription",
  "images",
  "type",
  "status",
  "action",
]);

interface OnPageOptimizationScreenProps {
  clientId: string | number;
}

export const OnPageOptimizationScreen = ({
  clientId,
}: OnPageOptimizationScreenProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const toastRef = useRef(toast);
  const hasLoadedSitemapSettingRef = useRef(false);
  const lastSavedSitemapUrlRef = useRef<string | null>(null);
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [isViewingPages, setIsViewingPages] = useState(false);
  const [isStartingOptimization, setIsStartingOptimization] = useState(false);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [deleteRunCandidate, setDeleteRunCandidate] =
    useState<OnPageOptimizationRun | null>(null);
  const [isDeletingRun, setIsDeletingRun] = useState(false);
  const [activeDetailTab, setActiveDetailTab] =
    useState<DetailTab>("header-structure");
  const [selectedOnPageRowId, setSelectedOnPageRowId] = useState<string | null>(
    null,
  );
  const [selectedAnchorRowId, setSelectedAnchorRowId] = useState<string | null>(
    null,
  );
  const [selectedHeadingKey, setSelectedHeadingKey] = useState<string | null>(
    null,
  );
  const [selectedImageRowId, setSelectedImageRowId] = useState<string | null>(
    null,
  );
  const [selectedWebpImageIds, setSelectedWebpImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [webpExportStatus, setWebpExportStatus] =
    useState<WebpExportStatus>("idle");
  const [webpExportSummary, setWebpExportSummary] =
    useState<WebpExportSummary | null>(null);
  const [loadingPdfRunId, setLoadingPdfRunId] = useState<string | null>(null);
  const [selectedDetailPage, setSelectedDetailPage] =
    useState<PageFoundRow | null>(null);
  const [selectedRun, setSelectedRun] = useState<OnPageOptimizationRun | null>(
    null,
  );
  const [pageSearchQuery, setPageSearchQuery] = useState("");
  const [pageStatusFilter, setPageStatusFilter] = useState("all");
  const [pageTypeFilter, setPageTypeFilter] = useState("all");
  const [pagePageSize, setPagePageSize] = useState(10);
  const [pageVisibleColumns, setPageVisibleColumns] = useState<Set<string>>(
    () => new Set(defaultPageVisibleColumns),
  );
  const [rows, setRows] = useState<OnPageOptimizationRun[]>([]);
  const pageRows = useMemo(() => buildPageRows(selectedRun), [selectedRun]);
  const hierarchicalPageRows = useMemo(
    () => buildHierarchicalPageRows(pageRows),
    [pageRows],
  );
  const pageStatusOptions = useMemo(
    () => Array.from(new Set(pageRows.map((row) => row.status))).sort(),
    [pageRows],
  );
  const pageTypeOptions = useMemo(
    () => Array.from(new Set(pageRows.map((row) => row.type))).sort(),
    [pageRows],
  );
  const filteredHierarchicalPageRows = useMemo(() => {
    const query = pageSearchQuery.trim().toLowerCase();

    return hierarchicalPageRows.filter((row) => {
      const matchesSearch =
        !query ||
        [
          row.keyword,
          row.url,
          row.metaTitle,
          row.metaDescription,
          row.type,
          row.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        pageStatusFilter === "all" || row.status === pageStatusFilter;
      const matchesType =
        pageTypeFilter === "all" || row.type === pageTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [hierarchicalPageRows, pageSearchQuery, pageStatusFilter, pageTypeFilter]);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    if (activeDetailTab !== "on-page") {
      setSelectedOnPageRowId(null);
    }

    if (activeDetailTab !== "anchor-text") {
      setSelectedAnchorRowId(null);
    }

    if (activeDetailTab !== "header-structure") {
      setSelectedHeadingKey(null);
    }

    if (activeDetailTab !== "image-optimization") {
      setSelectedImageRowId(null);
      setSelectedWebpImageIds(new Set());
      setWebpExportSummary(null);
      setWebpExportStatus("idle");
    }
  }, [activeDetailTab]);

  useEffect(() => {
    setSelectedOnPageRowId(null);
    setSelectedAnchorRowId(null);
    setSelectedHeadingKey(null);
    setSelectedImageRowId(null);
    setSelectedWebpImageIds(new Set());
    setWebpExportSummary(null);
    setWebpExportStatus("idle");
  }, [selectedDetailPage?.id]);

  const loadRuns = useCallback(async () => {
    if (!session?.accessToken) {
      setRows([]);
      setIsLoadingRuns(false);

      return;
    }

    setIsLoadingRuns(true);

    try {
      const accessToken = await getValidAccessToken();
      const [runs, client, settings] = await Promise.all([
        onPageOptimizationsApi.listRuns(accessToken, clientId),
        clientsApi.getClientById(accessToken, clientId),
        onPageOptimizationsApi.getSettings(accessToken, clientId),
      ]);
      const initialSitemapUrl =
        settings.sitemapUrl ||
        runs.find((run) => run.sitemapUrl)?.sitemapUrl ||
        client.website ||
        "";

      setRows(runs);
      lastSavedSitemapUrlRef.current = initialSitemapUrl.trim() || null;
      hasLoadedSitemapSettingRef.current = true;
      setSitemapUrl((currentValue) =>
        currentValue.trim() ? currentValue : initialSitemapUrl,
      );
    } catch (error) {
      setRows([]);
      toastRef.current.danger("Failed to load on-page optimizations.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoadingRuns(false);
    }
  }, [clientId, getValidAccessToken, session?.accessToken]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (
      !hasLoadedSitemapSettingRef.current ||
      !session?.accessToken ||
      isLoadingRuns
    ) {
      return;
    }

    const nextValue = sitemapUrl.trim() || null;

    if (nextValue === lastSavedSitemapUrlRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const accessToken = await getValidAccessToken();
          const settings = await onPageOptimizationsApi.updateSettings(
            accessToken,
            clientId,
            {
              sitemapUrl: nextValue,
            },
          );

          lastSavedSitemapUrlRef.current = settings.sitemapUrl ?? null;
        } catch (error) {
          toastRef.current.danger("Failed to save sitemap URL.", {
            description:
              error instanceof Error ? error.message : "Please try again.",
          });
        }
      })();
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    clientId,
    getValidAccessToken,
    isLoadingRuns,
    session?.accessToken,
    sitemapUrl,
  ]);

  useEffect(() => {
    const hasActiveRun = rows.some((row) =>
      ["QUEUED", "RUNNING"].includes(row.status),
    );

    if (!hasActiveRun || !session?.accessToken) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadRuns();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadRuns, rows, session?.accessToken]);

  useEffect(() => {
    if (!selectedRun) {
      return;
    }

    const updatedRun = rows.find((row) => row.id === selectedRun.id);

    if (updatedRun && updatedRun !== selectedRun) {
      setSelectedRun(updatedRun);
    }
  }, [rows, selectedRun]);

  const openPdfReport = useCallback(
    async (run: OnPageOptimizationRun) => {
      if (loadingPdfRunId) {
        return;
      }

      setLoadingPdfRunId(run.id);

      try {
        const accessToken = await getValidAccessToken();
        const blob = await onPageOptimizationsApi.downloadRunPdf(
          accessToken,
          clientId,
          run.id,
        );
        const url = window.URL.createObjectURL(blob);

        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      } catch (error) {
        toastRef.current.danger("PDF report is not available.", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setLoadingPdfRunId(null);
      }
    },
    [clientId, getValidAccessToken, loadingPdfRunId],
  );

  const handleDeleteRun = useCallback((run: OnPageOptimizationRun) => {
    setDeleteRunCandidate(run);
  }, []);

  const confirmDeleteRun = useCallback(async () => {
    if (!deleteRunCandidate) {
      return;
    }

    setIsDeletingRun(true);

    try {
      const accessToken = await getValidAccessToken();

      await onPageOptimizationsApi.deleteRun(
        accessToken,
        clientId,
        deleteRunCandidate.id,
      );
      setRows((currentRows) =>
        currentRows.filter((item) => item.id !== deleteRunCandidate.id),
      );
      setDeleteRunCandidate(null);
      toastRef.current.success("On-page optimization run deleted.");
    } catch (error) {
      toastRef.current.danger("Failed to delete run.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeletingRun(false);
    }
  }, [clientId, deleteRunCandidate, getValidAccessToken]);

  const columns = useMemo<DashboardDataTableColumn<OnPageOptimizationRun>[]>(
    () => [
      {
        key: "website",
        label: "Website",
        renderCell: (item) => (
          <div className="min-w-[220px]">
            <p className="line-clamp-1 text-sm font-medium text-[#111827]">
              {item.sitemapUrl ?? item.websiteUrl}
            </p>
            {item.sitemapUrl ? (
              <p className="mt-1 line-clamp-1 text-xs text-[#9CA3AF]">
                Target: {item.websiteUrl}
              </p>
            ) : null}
            {item.failureMessage ? (
              <p className="mt-1 line-clamp-1 text-xs text-red-600">
                {item.failureMessage}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        renderCell: (item) => (
          <Chip
            className={getStatusChipClass(item.status)}
            radius="full"
            size="sm"
            variant="flat"
          >
            {item.status}
          </Chip>
        ),
      },
      {
        key: "score",
        label: "Health Score",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm font-medium text-[#111827]">
            {formatScore(item.healthScore)}
          </span>
        ),
      },
      {
        key: "grade",
        label: "Grade",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {item.healthGrade ?? "-"}
          </span>
        ),
      },
      {
        key: "pages",
        label: "Pages",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {item.pagesAudited ?? "-"}
          </span>
        ),
      },
      {
        key: "issues",
        label: "High / Med / Low",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {item.highIssues ?? 0} / {item.mediumIssues ?? 0} /{" "}
            {item.lowIssues ?? 0}
          </span>
        ),
      },
      {
        key: "report",
        label: "Report",
        renderCell: (item) => {
          const isPdfLoading = loadingPdfRunId === item.id;

          return (
            <div className="flex flex-wrap gap-2">
              <Button
                isDisabled
                className="h-8 px-3 text-xs font-medium text-[#022279]"
                isLoading={isPdfLoading}
                size="sm"
                startContent={!isPdfLoading ? <FileText size={14} /> : null}
                variant="flat"
              >
                PDF
              </Button>
            </div>
          );
        },
      },
      {
        key: "lastRun",
        label: "Last Run",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm text-[#4B5563]">
            {formatDateTime(
              item.completedAt ?? item.startedAt ?? item.createdAt,
            )}
          </span>
        ),
      },
      {
        key: "action",
        label: "Action",
        renderCell: (item) => (
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                aria-label={`${item.websiteUrl} actions`}
                className="border border-[#D1D5DB]"
                size="sm"
                variant="bordered"
              >
                <EllipsisVertical size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label={`${item.websiteUrl} actions`}>
              <DropdownItem
                key="view"
                startContent={<Eye size={16} />}
                onPress={() => {
                  setSelectedRun(item);
                  setIsViewingPages(true);
                }}
              >
                View
              </DropdownItem>
              <DropdownItem
                key="pdf"
                isDisabled
                startContent={<Download size={16} />}
              >
                Open PDF
              </DropdownItem>
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                startContent={<Trash2 size={16} />}
                onPress={() => {
                  void handleDeleteRun(item);
                }}
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        ),
      },
    ],
    [handleDeleteRun, loadingPdfRunId, openPdfReport],
  );

  const normalizedSitemapUrl = sitemapUrl.trim();

  const handleStartOptimization = async () => {
    if (!normalizedSitemapUrl) {
      return;
    }

    setIsStartingOptimization(true);

    try {
      const accessToken = await getValidAccessToken();
      const run = await onPageOptimizationsApi.createRun(
        accessToken,
        clientId,
        {
          sitemapUrl: normalizedSitemapUrl,
        },
      );

      setRows((currentRows) => [run, ...currentRows]);
      toastRef.current.success("On-page optimization started.", {
        description: "The Website QA bot is running in the background.",
      });
    } catch (error) {
      toastRef.current.danger("Failed to start optimization.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsStartingOptimization(false);
    }
  };

  const handleDeletePage = (pageId: string) => {
    void pageId;
  };

  const openDetailPanel = (row: PageFoundRow) => {
    setSelectedDetailPage(row);
    setActiveDetailTab("header-structure");
  };

  const closeDetailPanel = () => {
    setSelectedDetailPage(null);
  };

  const renderStatusChip = (status: string) => (
    <Chip className={statusPillClass} radius="full" size="sm" variant="flat">
      {status}
    </Chip>
  );

  const handleToggleWebpImage = (id: string, isSelected: boolean) => {
    setSelectedWebpImageIds((current) => {
      const next = new Set(current);

      if (isSelected) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  };

  const handleExportWebp = async (
    imageRows: Array<{
      disabledReason: string | null;
      id: string;
      image: string;
      original: WebsiteQaImage;
    }>,
  ) => {
    const selectedRows = imageRows.filter(
      (row) => selectedWebpImageIds.has(row.id) && !row.disabledReason,
    );

    if (!selectedRows.length) {
      return;
    }

    setWebpExportStatus("preparing");
    setWebpExportSummary(null);

    setWebpExportStatus("converting");

    try {
      const accessToken = await getValidAccessToken();

      setWebpExportStatus("zipping");

      const result = await onPageOptimizationsApi.exportWebpImages(
        accessToken,
        clientId,
        {
          images: selectedRows.map((row) => ({
            filename: row.original.filename,
            src: row.image,
          })),
        },
      );
      const objectUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      const summary = result.summary ?? {
        failed: [],
        selected: selectedRows.length,
        skipped: imageRows.length - selectedRows.length,
        successful: selectedRows.length,
      };

      setWebpExportStatus("ready");
      setWebpExportSummary(summary);
      toast.success("Download ready.", {
        description: `${summary.successful} image${summary.successful === 1 ? "" : "s"} exported as WebP.`,
      });
    } catch (error) {
      setWebpExportStatus("idle");
      toast.danger("WebP export failed.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const renderDetailContent = () => {
    if (!selectedDetailPage) {
      return null;
    }

    const page = selectedDetailPage.auditPage;
    const seo = page.seo;
    const imageFlags = page.images?.flagged ?? [];
    const pageUrl = seo?.finalUrl ?? seo?.url ?? page.url;

    if (activeDetailTab === "header-structure") {
      const headings = (seo?.headings ?? []).filter(
        (heading) =>
          typeof heading.level === "number" &&
          heading.level >= 1 &&
          heading.level <= 6 &&
          typeof heading.text === "string",
      );
      const headingIssues = seo?.headingIssues ?? [];
      const headingCounts = [1, 2, 3, 4, 5, 6].map((level) => ({
        count:
          seo?.headingCounts?.[`h${level as 1 | 2 | 3 | 4 | 5 | 6}`] ??
          headings.filter((heading) => heading.level === level).length,
        level,
      }));
      const getIssuesForHeading = (heading: (typeof headings)[number]) =>
        headingIssues.filter((issue) => {
          if (
            typeof issue.headingIndex === "number" &&
            typeof heading.index === "number"
          ) {
            return issue.headingIndex === heading.index;
          }

          return (
            issue.headingLevel === heading.level &&
            typeof issue.headingText === "string" &&
            issue.headingText === heading.text
          );
        });

      return (
        <div className="min-h-[640px] border border-default-200 bg-white p-7 text-sm text-[#111111]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-semibold">Header Structure</p>
            <div className="flex flex-wrap gap-2">
              {headingCounts.map((item) => (
                <Chip
                  key={item.level}
                  className="bg-[#D5FAFF] px-2 text-xs font-medium text-[#009BB5]"
                  radius="full"
                  size="sm"
                  variant="flat"
                >
                  H{item.level}: {item.count}
                </Chip>
              ))}
            </div>
          </div>

          {headings.length ? (
            <div className="space-y-2">
              {headings.map((heading, index) => {
                const issues = getIssuesForHeading(heading);
                const severity = getWorstHeadingIssueSeverity(issues);
                const classes = getHeadingIssueClasses(severity);
                const headingKey = getHeadingSelectionKey(heading);
                const tooltipContent = issues.length
                  ? issues
                      .map((issue) => issue.title ?? issue.recommendation)
                      .filter(Boolean)
                      .join(" • ")
                  : "";

                return (
                  <div
                    key={`${heading.level}-${heading.text}-${heading.index ?? index}`}
                    className={[
                      "flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors",
                      classes.row,
                      selectedHeadingKey === headingKey
                        ? "outline outline-2 outline-offset-[-2px] outline-[#022279]"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    role="button"
                    style={{
                      marginLeft: `${((heading.level ?? 1) - 1) * 20}px`,
                    }}
                    tabIndex={0}
                    onClick={() => {
                      setSelectedHeadingKey(headingKey);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedHeadingKey(headingKey);
                      }
                    }}
                  >
                    <span
                      className={`flex h-6 min-w-9 items-center justify-center rounded-full text-xs font-semibold ${classes.badge}`}
                    >
                      H{heading.level}
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-medium leading-6 text-[#111827]">
                      {(heading.text ?? "").trim() || "(Empty heading)"}
                    </p>
                    {issues.length ? (
                      <Tooltip
                        content={
                          <div className="max-w-xs text-xs leading-5">
                            {tooltipContent}
                          </div>
                        }
                        placement="left"
                      >
                        <span className="mt-0.5 inline-flex text-[#4B5563]">
                          <Info size={16} />
                        </span>
                      </Tooltip>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-default-200 bg-[#FAFBFC] p-4">
              <p className="font-semibold">H1: {seo?.firstH1 ?? "Missing"}</p>
              <p className="mt-2 text-sm text-[#6B7280]">
                This scan only has legacy H1 data. Rerun optimisation to capture
                the full H1-H6 header structure.
              </p>
            </div>
          )}
        </div>
      );
    }

    if (activeDetailTab === "on-page") {
      const onPageIssues = getOnPageIssuesWithFallbacks(page);
      const getIssuesForOnPageRow = (rowKey: string) =>
        onPageIssues.filter((issue) => issue.rowKey === rowKey);
      const buildOnPageRow = (row: {
        icon: string;
        id: string;
        image: string;
        insight: string;
        keyword: string;
        status: string;
        subtext: string;
      }) => {
        const issues = getIssuesForOnPageRow(row.id);
        const severity = getWorstOnPageIssueSeverity(issues);

        return {
          ...row,
          issues,
          severity,
          status: severity
            ? severity === "critical"
              ? "Critical"
              : severity === "warning"
                ? "Warning"
                : "Suggestion"
            : row.status,
        };
      };
      const onPageRows = [
        buildOnPageRow({
          icon: "↗",
          id: "page-url",
          image: pageUrl,
          insight:
            typeof seo?.status === "number" && seo.status < 400
              ? "Indexable"
              : "Needs Review",
          keyword: "Page URL",
          status:
            typeof seo?.status === "number" && seo.status >= 400
              ? "Unavailable"
              : "Passed",
          subtext: pageUrl,
        }),
        buildOnPageRow({
          icon: "T",
          id: "meta-title",
          image: seo?.title ?? "-",
          insight: `${(seo?.title ?? "").length} Characters`,
          keyword: "Meta Title",
          status: seo?.title ? "Passed" : "Missing",
          subtext: seo?.title ?? "Missing",
        }),
        buildOnPageRow({
          icon: "↔",
          id: "meta-description",
          image: seo?.metaDescription ?? "-",
          insight: `${(seo?.metaDescription ?? "").length} Characters`,
          keyword: "Meta Description",
          status: seo?.metaDescription ? "Passed" : "Missing",
          subtext: seo?.metaDescription ?? "Missing",
        }),
        buildOnPageRow({
          icon: "H",
          id: "h1",
          image: seo?.firstH1 ?? "-",
          insight:
            typeof seo?.h1Count === "number" ? `${seo.h1Count} H1` : "Unknown",
          keyword: "H1",
          status: seo?.h1Count === 1 ? "Passed" : "Review",
          subtext: seo?.firstH1 ?? "Missing",
        }),
        buildOnPageRow({
          icon: "H",
          id: "headings",
          image: "Review the Header Structure tab",
          insight: seo?.headingIssues?.length
            ? `${seo.headingIssues.length} issue(s)`
            : "Clean",
          keyword: "Heading Structure",
          status: seo?.headingIssues?.length ? "Review" : "Passed",
          subtext: "H2-H6 hierarchy, duplicates, support copy",
        }),
        buildOnPageRow({
          icon: "¶",
          id: "content",
          image: "Body copy, keyword placement, duplicate paragraphs",
          insight: "Content quality",
          keyword: "Content & Keywords",
          status: "Passed",
          subtext: "Thin content, first paragraph, keyword usage",
        }),
        buildOnPageRow({
          icon: "↪",
          id: "internal-links",
          image: "Internal links and anchor context",
          insight: "Internal linking",
          keyword: "Internal Links",
          status: "Passed",
          subtext: "Contextual links, navigation support, orphan risk",
        }),
        buildOnPageRow({
          icon: "↗",
          id: "external-links",
          image: "Outbound authority and link volume",
          insight: "External linking",
          keyword: "External Links",
          status: "Passed",
          subtext: "Authority links and excessive outbound links",
        }),
        buildOnPageRow({
          icon: "▣",
          id: "canonical",
          image: seo?.canonical ?? "-",
          insight: seo?.canonical ? "Present" : "Missing",
          keyword: "Canonical",
          status: seo?.canonical ? "Passed" : "Missing",
          subtext: seo?.canonical ?? "Missing",
        }),
        buildOnPageRow({
          icon: "▣",
          id: "schema",
          image: seo?.schemaJsonLd ? "JSON-LD detected" : "-",
          insight: seo?.schemaJsonLd ? "Present" : "Missing",
          keyword: "Schema",
          status: seo?.schemaJsonLd ? "Passed" : "Missing",
          subtext: seo?.schemaJsonLd ? "JSON-LD detected" : "Missing",
        }),
        buildOnPageRow({
          icon: "⚙",
          id: "technical",
          image: "Indexability, viewport, language, mixed content",
          insight: "Technical SEO",
          keyword: "Technical SEO",
          status: "Passed",
          subtext: "Noindex, mobile meta, HTTPS, HTTP status",
        }),
        buildOnPageRow({
          icon: "◎",
          id: "social-meta",
          image: "Open Graph and Twitter/X card metadata",
          insight: "Social previews",
          keyword: "Social Metadata",
          status: "Passed",
          subtext: "OG tags and Twitter card tags",
        }),
        buildOnPageRow({
          icon: "✓",
          id: "ux-cro",
          image: "CTA, booking path, phone/email visibility",
          insight: "UX / CRO",
          keyword: "UX & Conversion",
          status: "Passed",
          subtext: "Clear CTA and conversion path",
        }),
        buildOnPageRow({
          icon: "★",
          id: "eeat",
          image: "Reviews, testimonials, credibility signals",
          insight: "E-E-A-T",
          keyword: "Trust Signals",
          status: "Passed",
          subtext: "Reviews, expertise, contact confidence",
        }),
        buildOnPageRow({
          icon: "◇",
          id: "page-type",
          image: selectedDetailPage.type,
          insight: selectedDetailPage.type,
          keyword: "Page Type",
          status: "Detected",
          subtext: selectedDetailPage.type,
        }),
      ];
      const onPageColumns: DashboardDataTableColumn<
        (typeof onPageRows)[number]
      >[] = [
        {
          key: "icon",
          label: "",
          renderCell: (item) => (
            <span className="font-semibold text-[#022279]">{item.icon}</span>
          ),
        },
        {
          key: "keyword",
          label: "Keyword",
          renderCell: (item) => (
            <div className="flex max-w-[150px] items-start gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#374151]">
                  {item.keyword}
                </p>
                <p className="line-clamp-1 text-xs text-[#9CA3AF]">
                  {item.subtext}
                </p>
              </div>
              {item.issues.length ? (
                <Tooltip
                  content={
                    <div className="max-w-xs text-xs leading-5">
                      {item.issues
                        .map((issue) => issue.title ?? issue.recommendation)
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  }
                  placement="right"
                >
                  <span className="mt-0.5 inline-flex shrink-0 text-[#4B5563]">
                    <Info size={16} />
                  </span>
                </Tooltip>
              ) : null}
            </div>
          ),
        },
        {
          key: "insights",
          label: "Insights",
          renderCell: (item) => (
            <div className="flex flex-wrap items-center gap-2">
              {renderStatusChip(item.insight)}
              {item.severity ? (
                <Chip
                  className={`${getOnPageIssueClasses(item.severity).badge} text-xs font-semibold capitalize`}
                  radius="full"
                  size="sm"
                  variant="flat"
                >
                  {item.severity}
                </Chip>
              ) : null}
            </div>
          ),
        },
        {
          key: "images",
          label: "Details",
          renderCell: (item) => (
            <span className="line-clamp-2 max-w-[180px] text-sm leading-5 text-[#374151]">
              {item.image}
            </span>
          ),
        },
        {
          key: "status",
          label: "Status",
          renderCell: (item) => {
            const severityClasses = getOnPageIssueClasses(item.severity);

            return (
              <Chip
                className={
                  item.severity ? severityClasses.badge : statusPillClass
                }
                radius="full"
                size="sm"
                variant="flat"
              >
                {item.status}
              </Chip>
            );
          },
        },
      ];

      return (
        <div className="overflow-hidden rounded-xl border border-default-200 bg-white">
          <h2 className="px-5 py-5 text-base font-semibold text-[#111827]">
            On-Page
          </h2>
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <DashboardDataTable
                disableZebraRows
                ariaLabel="On-page audit table"
                columns={onPageColumns}
                getRowKey={(item) => item.id}
                getRowProps={(item) => ({
                  className: [
                    "cursor-pointer transition-colors",
                    getOnPageIssueClasses(item.severity).row,
                    selectedOnPageRowId === item.id
                      ? "outline outline-2 outline-offset-[-2px] outline-[#022279]"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" "),
                  role: "button",
                  tabIndex: 0,
                  onClick: () => {
                    setSelectedOnPageRowId(item.id);
                  },
                  onKeyDown: (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedOnPageRowId(item.id);
                    }
                  },
                })}
                rows={onPageRows}
                title="On-Page"
                withShell={false}
              />
            </div>
          </div>
        </div>
      );
    }

    if (activeDetailTab === "anchor-text") {
      const anchorIssues = seo?.anchorIssues ?? [];
      const links: AnchorLink[] = seo?.seoLinks?.length
        ? seo.seoLinks
        : seo?.links?.length
          ? seo.links
          : (seo?.nav ?? []).map((linkItem, index) => ({
              accessibleText: linkItem.text,
              anchorText: linkItem.text,
              href: linkItem.href,
              index,
              isInternal: true,
              placement: "main_navigation",
            }));
      const getIssuesForAnchor = (linkItem: AnchorLink, id: string) =>
        anchorIssues.filter((issue) => {
          if (
            typeof issue.anchorIndex === "number" &&
            typeof linkItem.index === "number"
          ) {
            return issue.anchorIndex === linkItem.index;
          }

          return issue.href === linkItem.href || issue.rowKey === id;
        });
      const anchorRows = links.map((linkItem, index) => {
        const id = `anchor-${linkItem.index ?? index}`;
        const issues = getIssuesForAnchor(linkItem, id);
        const severity = getWorstOnPageIssueSeverity(issues);
        const anchorText =
          linkItem.accessibleText?.trim() ||
          linkItem.anchorText?.trim() ||
          (linkItem.wrapsImage ? "[Image link]" : "(Empty anchor)");

        return {
          anchorText,
          doFollow: linkItem.doFollow !== false ? "Yes" : "No",
          href: linkItem.href ?? "-",
          id,
          issues,
          placement: linkItem.placement ?? "main_content",
          statusCode: linkItem.statusCode ?? null,
          statusError: linkItem.statusError ?? null,
          statusLabel:
            typeof linkItem.statusCode === "number"
              ? String(linkItem.statusCode)
              : linkItem.statusError && linkItem.statusError !== "Not checked"
                ? "Error"
                : "Unknown",
          severity,
        };
      });
      const anchorColumns: DashboardDataTableColumn<
        (typeof anchorRows)[number]
      >[] = [
        {
          key: "anchorText",
          label: "Anchor Text",
          renderCell: (item) => (
            <div className="flex max-w-[175px] items-start gap-2">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium text-[#374151]">
                  {item.anchorText}
                </p>
                <p className="line-clamp-1 text-xs text-[#9CA3AF]">
                  {item.href}
                </p>
              </div>
              {item.issues.length ? (
                <Tooltip
                  content={
                    <div className="max-w-xs text-xs leading-5">
                      {item.issues
                        .map((issue) => issue.title ?? issue.recommendation)
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  }
                  placement="right"
                >
                  <span className="mt-0.5 inline-flex shrink-0 text-[#4B5563]">
                    <Info size={16} />
                  </span>
                </Tooltip>
              ) : null}
            </div>
          ),
        },
        {
          key: "destination",
          label: "Destination",
          renderCell: (item) => (
            <span className="line-clamp-2 max-w-[185px] break-all text-sm text-[#374151]">
              {item.href}
            </span>
          ),
        },
        {
          key: "placement",
          label: "Placement",
          renderCell: (item) => (
            <span className="whitespace-nowrap text-sm capitalize text-[#374151]">
              {item.placement.replace(/_/g, " ")}
            </span>
          ),
        },
        {
          key: "doFollow",
          label: "Do Follow",
          renderCell: (item) => (
            <Chip
              className={
                item.doFollow === "Yes"
                  ? "bg-[#DCFCE7] text-[#15803D]"
                  : "bg-[#FEF3C7] text-[#B45309]"
              }
              radius="full"
              size="sm"
              variant="flat"
            >
              {item.doFollow}
            </Chip>
          ),
        },
        {
          key: "status",
          label: "Status",
          renderCell: (item) => (
            <Chip
              className={getAnchorStatusClass(
                item.statusCode,
                item.statusError,
              )}
              radius="full"
              size="sm"
              variant="flat"
            >
              {item.statusLabel}
            </Chip>
          ),
        },
      ];

      return (
        <div className="overflow-hidden rounded-xl border border-default-200 bg-white">
          <h2 className="px-5 py-5 text-base font-semibold text-[#111827]">
            Anchor Text
          </h2>
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              <DashboardDataTable
                disableZebraRows
                ariaLabel="Anchor text audit table"
                columns={anchorColumns}
                emptyContent="No anchor links were captured for this page."
                getRowKey={(item) => item.id}
                getRowProps={(item) => ({
                  className: [
                    "cursor-pointer transition-colors",
                    getOnPageIssueClasses(item.severity).row,
                    selectedAnchorRowId === item.id
                      ? "outline outline-2 outline-offset-[-2px] outline-[#022279]"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" "),
                  role: "button",
                  tabIndex: 0,
                  onClick: () => {
                    setSelectedAnchorRowId(item.id);
                  },
                  onKeyDown: (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedAnchorRowId(item.id);
                    }
                  },
                })}
                rows={anchorRows}
                title="Anchor Text"
                withShell={false}
              />
            </div>
          </div>
        </div>
      );
    }

    const imageItems = page.images?.items?.length
      ? page.images.items
      : imageFlags;
    const imageRows = imageItems
      .map((image, index) => {
        const eligibility = getWebpEligibility(image);
        const id = `${image.src ?? "image"}-${index}`;

        return {
          altText: image.alt?.trim() ? image.alt : "Missing",
          broken:
            typeof image.statusCode === "number" && image.statusCode >= 400
              ? `HTTP ${image.statusCode}`
              : image.statusError && image.statusError !== "Not checked"
                ? "Check failed"
                : "No",
          disabledReason: eligibility.reason,
          exportStatus: eligibility.status,
          id,
          image: image.src ?? "-",
          isEligibleForWebpExport: eligibility.isEligible,
          original: image,
          placement: formatImagePlacement(image.placement),
          selected: selectedWebpImageIds.has(id),
          severity:
            image.severity ?? (image.flags?.length ? "warning" : "pass"),
          size: formatImageSize(image.sizeBytes),
          status: imageSeverityStatus(
            image.severity ?? (image.flags?.length ? "warning" : "pass"),
          ),
        };
      })
      .filter((item) => item.isEligibleForWebpExport);
    const eligibleImageRows = imageRows.filter(
      (item) => item.isEligibleForWebpExport,
    );
    const selectedEligibleCount = imageRows.filter(
      (item) =>
        item.isEligibleForWebpExport && selectedWebpImageIds.has(item.id),
    ).length;
    const allEligibleSelected =
      eligibleImageRows.length > 0 &&
      eligibleImageRows.every((item) => selectedWebpImageIds.has(item.id));
    const isExportingWebp =
      webpExportStatus === "preparing" ||
      webpExportStatus === "converting" ||
      webpExportStatus === "zipping";
    const handleSelectAllEligible = (checked: boolean) => {
      setSelectedWebpImageIds((current) => {
        const next = new Set(current);

        eligibleImageRows.forEach((item) => {
          if (checked) {
            next.add(item.id);
          } else {
            next.delete(item.id);
          }
        });

        return next;
      });
    };
    const imageColumns: DashboardDataTableColumn<(typeof imageRows)[number]>[] =
      [
        {
          className: "w-[72px]",
          key: "select",
          label: "",
          header: (
            <Tooltip content="Select all eligible JPG/PNG images">
              <Checkbox
                aria-label="Select all eligible images"
                isDisabled={!eligibleImageRows.length || isExportingWebp}
                isIndeterminate={
                  selectedEligibleCount > 0 && !allEligibleSelected
                }
                isSelected={allEligibleSelected}
                size="sm"
                onValueChange={handleSelectAllEligible}
              />
            </Tooltip>
          ),
          renderCell: (item) => {
            const checkbox = (
              <Checkbox
                aria-label={`Select ${item.image} for WebP export`}
                isDisabled={!item.isEligibleForWebpExport || isExportingWebp}
                isSelected={item.selected}
                size="sm"
                onValueChange={(checked) => {
                  handleToggleWebpImage(item.id, checked);
                }}
              />
            );

            return item.disabledReason ? (
              <Tooltip content={item.disabledReason}>{checkbox}</Tooltip>
            ) : (
              checkbox
            );
          },
        },
        {
          key: "image",
          label: "Image",
          renderCell: (item) => (
            <span className="line-clamp-2 max-w-[220px] break-all text-xs">
              {item.image}
            </span>
          ),
        },
        {
          key: "size",
          label: "Size",
          renderCell: (item) => <span>{item.size}</span>,
        },
        {
          key: "placement",
          label: "Placement",
          renderCell: (item) => <span>{item.placement}</span>,
        },
        {
          key: "altText",
          label: "Alt Text",
          renderCell: (item) => (
            <span className="line-clamp-2 max-w-[180px]">{item.altText}</span>
          ),
        },
        {
          key: "broken",
          label: "Broken Image",
          renderCell: (item) => <span>{item.broken}</span>,
        },
        {
          key: "status",
          label: "Status",
          renderCell: (item) => (
            <div className="flex flex-col items-start gap-1">
              <Chip
                className={imageStatusClass(item.severity)}
                radius="full"
                size="sm"
                variant="flat"
              >
                {item.status}
              </Chip>
              {item.exportStatus !== "Eligible" ? (
                <span className="text-[11px] text-[#6B7280]">
                  {item.exportStatus}
                </span>
              ) : null}
            </div>
          ),
        },
      ];

    return (
      <div className="overflow-hidden rounded-xl border border-default-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">
              Image Optimization
            </h2>
            {webpExportStatus !== "idle" ? (
              <p className="mt-1 text-xs text-[#6B7280]">
                {webpExportStatusLabel(webpExportStatus)}
              </p>
            ) : null}
          </div>
          <Button
            className="bg-[#022279] text-white"
            isDisabled={!selectedEligibleCount || isExportingWebp}
            isLoading={isExportingWebp}
            size="sm"
            startContent={!isExportingWebp ? <Download size={15} /> : null}
            onPress={() => {
              void handleExportWebp(imageRows);
            }}
          >
            Export WebP
          </Button>
        </div>
        {webpExportSummary ? (
          <div className="mx-5 mb-4 rounded-lg border border-default-200 bg-[#F9FAFB] px-4 py-3 text-xs text-[#374151]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-[#111827]">Export summary</p>
              <Button
                isIconOnly
                aria-label="Close export summary"
                className="h-7 w-7 min-w-7 text-[#6B7280]"
                size="sm"
                variant="light"
                onPress={() => {
                  setWebpExportSummary(null);
                }}
              >
                <X size={14} />
              </Button>
            </div>
            <p className="mt-1">
              Selected: {webpExportSummary.selected} · Successful:{" "}
              {webpExportSummary.successful} · Skipped:{" "}
              {webpExportSummary.skipped} · Failed:{" "}
              {webpExportSummary.failed.length}
            </p>
            {webpExportSummary.failed.length ? (
              <ul className="mt-2 space-y-1">
                {webpExportSummary.failed.slice(0, 3).map((failure) => (
                  <li key={`${failure.src}-${failure.reason}`}>
                    {failure.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <DashboardDataTable
              disableZebraRows
              ariaLabel="Image optimization audit table"
              columns={imageColumns}
              emptyContent="No WebP-export eligible images were captured for this page."
              getRowKey={(item) => item.id}
              getRowProps={(item) => ({
                className: [
                  "cursor-pointer transition-colors",
                  getOnPageIssueClasses(
                    item.severity === "pass" ? null : item.severity,
                  ).row,
                  selectedImageRowId === item.id
                    ? "outline outline-2 outline-offset-[-2px] outline-[#022279]"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" "),
                role: "button",
                tabIndex: 0,
                onClick: () => {
                  setSelectedImageRowId(item.id);
                },
                onKeyDown: (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedImageRowId(item.id);
                  }
                },
              })}
              rows={imageRows}
              title="Image Optimization"
              withShell={false}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderRecommendationsPanel = () => {
    if (
      activeDetailTab !== "header-structure" &&
      activeDetailTab !== "on-page" &&
      activeDetailTab !== "anchor-text" &&
      activeDetailTab !== "image-optimization"
    ) {
      return null;
    }

    const seo = selectedDetailPage?.auditPage.seo;
    const images = selectedDetailPage?.auditPage.images;

    if (activeDetailTab === "on-page") {
      const onPageIssues = selectedDetailPage
        ? getOnPageIssuesWithFallbacks(selectedDetailPage.auditPage)
        : [];
      const visibleOnPageIssues = selectedOnPageRowId
        ? onPageIssues.filter((issue) => issue.rowKey === selectedOnPageRowId)
        : onPageIssues;

      if (!onPageIssues.length) {
        return null;
      }

      return (
        <section className="rounded-xl border border-default-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#111827]">
              Recommendations
            </h2>
            {selectedOnPageRowId ? (
              <Button
                className="h-8 px-3 text-xs font-medium text-[#4B5563]"
                size="sm"
                variant="light"
                onPress={() => {
                  setSelectedOnPageRowId(null);
                }}
              >
                Clear selection
              </Button>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {visibleOnPageIssues.length ? (
              visibleOnPageIssues.map((issue, index) => {
                const severity = issue.severity ?? "warning";
                const classes = getOnPageIssueClasses(severity);

                return (
                  <div
                    key={`${issue.ruleKey ?? "on-page-issue"}-${issue.rowKey ?? index}`}
                    className={`rounded-lg border px-4 py-3 ${classes.row}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip
                        className={`${classes.badge} text-xs font-semibold capitalize`}
                        radius="full"
                        size="sm"
                        variant="flat"
                      >
                        {severity}
                      </Chip>
                      {!issue.rowKey ? (
                        <Chip
                          className="bg-[#EEF2FF] text-xs font-semibold text-[#3730A3]"
                          radius="full"
                          size="sm"
                          variant="flat"
                        >
                          Page-level
                        </Chip>
                      ) : null}
                      <p className="text-sm font-semibold text-[#111827]">
                        {issue.title ?? "On-page SEO issue"}
                      </p>
                    </div>
                    {issue.rowKey ? (
                      <p className="mt-2 text-xs font-medium text-[#6B7280]">
                        Affects: {issue.rowKey.replace(/-/g, " ")}
                      </p>
                    ) : null}
                    {issue.whyItMatters ? (
                      <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                        {issue.whyItMatters}
                      </p>
                    ) : null}
                    {issue.howToFix || issue.recommendation ? (
                      <p className="mt-2 text-sm font-medium leading-6 text-[#111827]">
                        {issue.howToFix ?? issue.recommendation}
                      </p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-default-100 bg-[#FAFBFC] px-4 py-3 text-sm font-medium leading-6 text-[#4B5563]">
                No recommendations for the selected row.
              </div>
            )}
          </div>
        </section>
      );
    }

    if (activeDetailTab === "anchor-text") {
      const anchorIssues = seo?.anchorIssues ?? [];
      const visibleAnchorIssues = selectedAnchorRowId
        ? anchorIssues.filter((issue) => {
            const issueId =
              typeof issue.anchorIndex === "number"
                ? `anchor-${issue.anchorIndex}`
                : issue.rowKey;

            return issueId === selectedAnchorRowId;
          })
        : anchorIssues;

      if (!anchorIssues.length) {
        return null;
      }

      return (
        <section className="rounded-xl border border-default-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#111827]">
              Recommendations
            </h2>
            {selectedAnchorRowId ? (
              <Button
                className="h-8 px-3 text-xs font-medium text-[#4B5563]"
                size="sm"
                variant="light"
                onPress={() => {
                  setSelectedAnchorRowId(null);
                }}
              >
                Clear selection
              </Button>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {visibleAnchorIssues.length ? (
              visibleAnchorIssues.map((issue, index) => {
                const severity = issue.severity ?? "suggestion";
                const classes = getOnPageIssueClasses(severity);

                return (
                  <div
                    key={`${issue.ruleKey ?? "anchor-issue"}-${issue.anchorIndex ?? index}`}
                    className={`rounded-lg border px-4 py-3 ${classes.row}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip
                        className={`${classes.badge} text-xs font-semibold capitalize`}
                        radius="full"
                        size="sm"
                        variant="flat"
                      >
                        {severity}
                      </Chip>
                      {!issue.anchorText && !issue.href ? (
                        <Chip
                          className="bg-[#EEF2FF] text-xs font-semibold text-[#3730A3]"
                          radius="full"
                          size="sm"
                          variant="flat"
                        >
                          Page-level
                        </Chip>
                      ) : null}
                      <p className="text-sm font-semibold text-[#111827]">
                        {issue.title ?? "Anchor text issue"}
                      </p>
                    </div>
                    {issue.anchorText || issue.href ? (
                      <p className="mt-2 line-clamp-2 text-xs font-medium text-[#6B7280]">
                        Affects: {issue.anchorText ?? issue.href}
                      </p>
                    ) : null}
                    {issue.whyItMatters ? (
                      <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                        {issue.whyItMatters}
                      </p>
                    ) : null}
                    {issue.howToFix || issue.recommendation ? (
                      <p className="mt-2 text-sm font-medium leading-6 text-[#111827]">
                        {issue.howToFix ?? issue.recommendation}
                      </p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-default-100 bg-[#FAFBFC] px-4 py-3 text-sm font-medium leading-6 text-[#4B5563]">
                No recommendations for the selected anchor.
              </div>
            )}
          </div>
        </section>
      );
    }

    if (activeDetailTab === "image-optimization") {
      const imageItems = images?.items?.length
        ? images.items
        : (images?.flagged ?? []);
      const visibleImageItems = imageItems
        .map((image, index) => ({ image, index }))
        .filter(({ image }) => getWebpEligibility(image).isEligible);
      const imageIssues = visibleImageItems.flatMap(({ image, index }) => {
        const id = `${image.src ?? "image"}-${index}`;
        const severity =
          image.severity ?? (image.flags?.length ? "warning" : "pass");

        if (severity === "pass") {
          return [];
        }

        return (image.issues ?? []).map((issue, issueIndex) => ({
          altText: image.alt?.trim() || "Missing",
          id,
          imageSrc: image.src ?? "-",
          issue,
          issueIndex,
          severity:
            issue.severity === "pass"
              ? "suggestion"
              : (issue.severity ?? "suggestion"),
          scope: "image",
        }));
      });
      const pageImageIssues = (images?.pageIssues ?? []).map(
        (issue, index) => ({
          altText: null,
          id: `page-image-issue-${index}`,
          imageSrc: "Page-level image SEO",
          issue,
          issueIndex: index,
          severity:
            issue.severity === "pass"
              ? "suggestion"
              : (issue.severity ?? "suggestion"),
          scope: "page",
        }),
      );
      const allImageIssues = selectedImageRowId
        ? imageIssues.filter((entry) => entry.id === selectedImageRowId)
        : [...imageIssues, ...pageImageIssues];

      if (!imageIssues.length && !pageImageIssues.length) {
        return null;
      }

      return (
        <section className="rounded-xl border border-default-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#111827]">
              Recommendations
            </h2>
            {selectedImageRowId ? (
              <Button
                className="h-8 px-3 text-xs font-medium text-[#4B5563]"
                size="sm"
                variant="light"
                onPress={() => {
                  setSelectedImageRowId(null);
                }}
              >
                Clear selection
              </Button>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {allImageIssues.length ? (
              allImageIssues.map((entry) => {
                const classes = getOnPageIssueClasses(entry.severity);

                return (
                  <div
                    key={`${entry.id}-${entry.issue.ruleKey ?? "image-issue"}-${entry.issueIndex}`}
                    className={`rounded-lg border px-4 py-3 ${classes.row}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip
                        className={`${classes.badge} text-xs font-semibold capitalize`}
                        radius="full"
                        size="sm"
                        variant="flat"
                      >
                        {entry.severity}
                      </Chip>
                      {entry.scope === "page" ? (
                        <Chip
                          className="bg-[#EEF2FF] text-xs font-semibold text-[#3730A3]"
                          radius="full"
                          size="sm"
                          variant="flat"
                        >
                          Page-level
                        </Chip>
                      ) : null}
                      <p className="text-sm font-semibold text-[#111827]">
                        {entry.issue.message ?? "Image optimization issue"}
                      </p>
                    </div>
                    <p className="mt-2 line-clamp-2 break-all text-xs font-medium text-[#6B7280]">
                      Affects: {entry.altText ? `${entry.altText} · ` : ""}
                      {entry.imageSrc}
                    </p>
                    {entry.issue.recommendation ? (
                      <p className="mt-3 text-sm font-medium leading-6 text-[#111827]">
                        {entry.issue.recommendation}
                      </p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-default-100 bg-[#FAFBFC] px-4 py-3 text-sm font-medium leading-6 text-[#4B5563]">
                No recommendations for the selected image.
              </div>
            )}
          </div>
        </section>
      );
    }

    const headingIssues = seo?.headingIssues ?? [];
    const visibleHeadingIssues = selectedHeadingKey
      ? headingIssues.filter((issue) => {
          const issueKey =
            typeof issue.headingIndex === "number"
              ? `index-${issue.headingIndex}`
              : `heading-${issue.headingLevel ?? "x"}-${issue.headingText ?? ""}`;

          return issueKey === selectedHeadingKey;
        })
      : headingIssues;
    const legacyH1Flags = (seo?.flags ?? []).filter((flag) =>
      /<h1>|h1/i.test(flag),
    );

    if (!headingIssues.length && !legacyH1Flags.length) {
      return null;
    }

    return (
      <section className="rounded-xl border border-default-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#111827]">
            Recommendations
          </h2>
          {selectedHeadingKey ? (
            <Button
              className="h-8 px-3 text-xs font-medium text-[#4B5563]"
              size="sm"
              variant="light"
              onPress={() => {
                setSelectedHeadingKey(null);
              }}
            >
              Clear selection
            </Button>
          ) : null}
        </div>
        {headingIssues.length ? (
          <div className="mt-4 space-y-3">
            {visibleHeadingIssues.length ? (
              visibleHeadingIssues.map((issue, index) => {
                const severity = issue.severity ?? "medium";
                const classes = getHeadingIssueClasses(severity);

                return (
                  <div
                    key={`${issue.ruleKey ?? "heading-issue"}-${issue.headingIndex ?? index}`}
                    className={`rounded-lg border px-4 py-3 ${classes.row}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip
                        className={`${classes.badge} text-xs font-semibold capitalize`}
                        radius="full"
                        size="sm"
                        variant="flat"
                      >
                        {severity}
                      </Chip>
                      {!issue.headingText &&
                      typeof issue.headingIndex !== "number" ? (
                        <Chip
                          className="bg-[#EEF2FF] text-xs font-semibold text-[#3730A3]"
                          radius="full"
                          size="sm"
                          variant="flat"
                        >
                          Page-level
                        </Chip>
                      ) : null}
                      <p className="text-sm font-semibold text-[#111827]">
                        {issue.title ?? "Heading structure issue"}
                      </p>
                    </div>
                    {issue.headingText ? (
                      <p className="mt-2 text-xs font-medium text-[#6B7280]">
                        Affects H{issue.headingLevel}: {issue.headingText}
                      </p>
                    ) : null}
                    {issue.whyItMatters ? (
                      <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                        {issue.whyItMatters}
                      </p>
                    ) : null}
                    {issue.howToFix || issue.recommendation ? (
                      <p className="mt-2 text-sm font-medium leading-6 text-[#111827]">
                        {issue.howToFix ?? issue.recommendation}
                      </p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-default-100 bg-[#FAFBFC] px-4 py-3 text-sm font-medium leading-6 text-[#4B5563]">
                No recommendations for the selected heading.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {legacyH1Flags.map((flag) => (
              <div
                key={flag}
                className="rounded-lg border border-default-100 bg-[#FAFBFC] px-4 py-3 text-sm font-medium leading-6 text-[#4B5563]"
              >
                {flag}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderActivityPanel = () => {
    if (!selectedRun || !selectedDetailPage) {
      return null;
    }

    const recommendationsPanel = renderRecommendationsPanel();

    return (
      <aside className="flex min-h-[640px] flex-col gap-5 rounded-xl bg-white xl:sticky xl:top-0">
        {recommendationsPanel ? (
          <ScrollShadow
            hideScrollBar
            className="max-h-[42vh] pr-1"
            orientation="vertical"
            size={32}
          >
            {recommendationsPanel}
          </ScrollShadow>
        ) : null}
        <div className="pr-1">
          <OnPagePageActivityFeed
            clientId={clientId}
            pageUrl={selectedDetailPage.url}
            runId={selectedRun.id}
          />
        </div>
      </aside>
    );
  };

  const pageColumns = useMemo<DashboardDataTableColumn<PageDisplayRow>[]>(
    () => [
      {
        key: "keyword",
        label: "Keyword",
        renderCell: (row) => (
          <div
            className="flex min-w-[220px] items-center gap-2"
            style={{ paddingLeft: `${Math.min(row.level, 2) * 20}px` }}
          >
            <span className="inline-block w-[14px] flex-none" />
            <span
              className={`h-8 w-1 flex-none rounded-full ${
                row.level > 0 ? "bg-[#10B981]" : "bg-[#60A5FA]"
              }`}
            />
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold text-[#111827]">
                {row.keyword}
              </p>
              <p className="mt-1 line-clamp-1 text-sm text-[#9CA3AF]">
                {truncateUrl(row.url)}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "metaTitle",
        label: "Meta Title",
        renderCell: (row) => (
          <div className="max-w-[240px]">
            <p className="line-clamp-3 text-sm leading-5 text-[#111827]">
              {row.metaTitle}
            </p>
            <span
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${getMetaTitleLengthClass(row.metaTitle)}`}
            >
              {(row.metaTitle === "-" ? "" : row.metaTitle).length} Characters
            </span>
          </div>
        ),
      },
      {
        key: "metaDescription",
        label: "Meta Description",
        renderCell: (row) => (
          <div className="max-w-[260px]">
            <p className="line-clamp-3 text-sm leading-5 text-[#111827]">
              {row.metaDescription}
            </p>
            <span
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${getMetaDescriptionLengthClass(row.metaDescription)}`}
            >
              {(row.metaDescription === "-" ? "" : row.metaDescription).length}{" "}
              Characters
            </span>
          </div>
        ),
      },
      {
        key: "images",
        label: "Images",
        renderCell: (row) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {row.imageCount}
          </span>
        ),
      },
      {
        key: "type",
        label: "Type of Page",
        renderCell: (row) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {row.type}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        renderCell: (row) => (
          <Chip
            className="bg-[#CFFAFE] text-[#0284C7]"
            radius="full"
            size="sm"
            variant="flat"
          >
            {row.status}
          </Chip>
        ),
      },
      {
        key: "action",
        label: "Action",
        renderCell: (row) => (
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                aria-label={`${row.keyword} actions`}
                className="border border-[#D1D5DB]"
                size="sm"
                variant="bordered"
              >
                <EllipsisVertical size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label={`${row.keyword} actions`}>
              <DropdownItem
                key="view"
                startContent={<Eye size={16} />}
                onPress={() => {
                  openDetailPanel(row);
                }}
              >
                View
              </DropdownItem>
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                startContent={<Trash2 size={16} />}
                onPress={() => {
                  handleDeletePage(row.id);
                }}
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        ),
      },
    ],
    [],
  );
  const visiblePageColumns = useMemo(
    () =>
      pageColumns.filter(
        (column) =>
          column.key === "action" || pageVisibleColumns.has(column.key),
      ),
    [pageColumns, pageVisibleColumns],
  );
  const hasPageFilters = Boolean(
    pageSearchQuery.trim() ||
      pageStatusFilter !== "all" ||
      pageTypeFilter !== "all",
  );

  function resetPageFilters() {
    setPageSearchQuery("");
    setPageStatusFilter("all");
    setPageTypeFilter("all");
  }

  if (isViewingPages) {
    return (
      <>
        <div className="px-6 py-6">
          <DashboardDataTable
            enableSelection
            showPagination
            ariaLabel="Pages found table"
            columns={visiblePageColumns}
            emptyContent="No page details were saved for this run yet. Open the PDF or Doc report to review the generated audit."
            getRowKey={(row) => row.id}
            headerRight={
              <div className="flex flex-wrap items-center gap-2">
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      color={hasPageFilters ? "primary" : "default"}
                      startContent={<SlidersHorizontal size={14} />}
                      variant={hasPageFilters ? "flat" : "bordered"}
                    >
                      Filter
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Pages found filters"
                    className="min-w-64"
                    closeOnSelect={false}
                  >
                    <DropdownItem key="status-filter" textValue="Status filter">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-[#4B5563]">
                          Status
                        </p>
                        <select
                          className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                          value={pageStatusFilter}
                          onChange={(event) => {
                            setPageStatusFilter(event.target.value);
                          }}
                        >
                          <option value="all">All statuses</option>
                          {pageStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </DropdownItem>
                    <DropdownItem key="type-filter" textValue="Type filter">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-[#4B5563]">
                          Type of Page
                        </p>
                        <select
                          className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                          value={pageTypeFilter}
                          onChange={(event) => {
                            setPageTypeFilter(event.target.value);
                          }}
                        >
                          <option value="all">All page types</option>
                          {pageTypeOptions.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                    </DropdownItem>
                    <DropdownItem key="reset-filters" textValue="Reset filters">
                      <Button
                        fullWidth
                        isDisabled={!hasPageFilters}
                        radius="sm"
                        variant="bordered"
                        onPress={resetPageFilters}
                      >
                        Reset
                      </Button>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      startContent={<List size={14} />}
                      variant="bordered"
                    >
                      Show {pagePageSize}
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Rows per page"
                    selectedKeys={new Set([String(pagePageSize)])}
                    selectionMode="single"
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys as Set<string>)[0];

                      if (selected) {
                        setPagePageSize(Number(selected));
                      }
                    }}
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <DropdownItem key={String(size)}>{size}</DropdownItem>
                    ))}
                  </DropdownMenu>
                </Dropdown>
                <Dropdown closeOnSelect={false}>
                  <DropdownTrigger>
                    <Button
                      startContent={<Columns3 size={14} />}
                      variant="bordered"
                    >
                      Columns
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Toggle page columns"
                    closeOnSelect={false}
                  >
                    {Object.entries(pageColumnLabels)
                      .filter(([key]) => key !== "action")
                      .map(([key, label]) => (
                        <DropdownItem
                          key={key}
                          textValue={label}
                          onPress={() => {
                            setPageVisibleColumns((current) => {
                              const next = new Set(current);

                              if (next.has(key) && next.size > 1) {
                                next.delete(key);
                              } else {
                                next.add(key);
                              }

                              return next;
                            });
                          }}
                        >
                          <Checkbox
                            className="pointer-events-none"
                            isSelected={pageVisibleColumns.has(key)}
                          >
                            {label}
                          </Checkbox>
                        </DropdownItem>
                      ))}
                  </DropdownMenu>
                </Dropdown>
                <Input
                  aria-label="Search pages found"
                  className="w-64"
                  placeholder="Search here"
                  startContent={
                    <Search className="text-default-400" size={16} />
                  }
                  value={pageSearchQuery}
                  onValueChange={setPageSearchQuery}
                />
              </div>
            }
            pageSize={pagePageSize}
            rows={filteredHierarchicalPageRows}
            title={
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  className="h-9 px-3 text-[#4B5563]"
                  startContent={<ChevronLeft size={18} />}
                  variant="light"
                  onPress={() => {
                    setIsViewingPages(false);
                  }}
                >
                  Back
                </Button>
                <span className="text-base font-semibold text-[#111827]">
                  Pages Found
                </span>
                {selectedRun ? (
                  <span className="line-clamp-1 text-xs font-normal text-[#6B7280]">
                    {selectedRun.sitemapUrl ?? selectedRun.websiteUrl}
                  </span>
                ) : null}
              </div>
            }
          />
        </div>
        <Drawer
          hideCloseButton
          classNames={{
            backdrop: "bg-black/35 backdrop-blur-sm",
            base: "w-[84vw] max-w-none",
            wrapper: "justify-end",
          }}
          isDismissable={false}
          isOpen={Boolean(selectedDetailPage)}
          placement="right"
          scrollBehavior="inside"
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              closeDetailPanel();
            }
          }}
        >
          <DrawerContent className="my-5 h-[calc(100vh-40px)] max-h-[calc(100vh-40px)] rounded-l-2xl rounded-r-none">
            <DrawerBody className="p-8">
              <Button
                isIconOnly
                aria-label="Close page details"
                className="absolute right-5 top-5 z-10"
                radius="full"
                variant="light"
                onPress={closeDetailPanel}
              >
                <X size={20} />
              </Button>

              <div className="max-w-[1560px]">
                {selectedDetailPage ? (
                  <div className="mb-5 max-w-[calc(100%-56px)]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Page
                    </p>
                    <h2 className="mt-1 text-xl font-semibold leading-7 text-[#111827]">
                      {selectedDetailPage.keyword}
                    </h2>
                    <a
                      className="mt-2 inline-flex max-w-full items-center gap-2 text-sm font-medium text-[#022279] hover:text-[#0A3AA8]"
                      href={
                        selectedDetailPage.auditPage.seo?.finalUrl ??
                        selectedDetailPage.auditPage.seo?.url ??
                        selectedDetailPage.url
                      }
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="truncate">
                        {selectedDetailPage.auditPage.seo?.finalUrl ??
                          selectedDetailPage.auditPage.seo?.url ??
                          selectedDetailPage.url}
                      </span>
                      <ExternalLink className="shrink-0" size={14} />
                    </a>
                  </div>
                ) : null}

                <div className="flex border-b border-default-200">
                  {detailTabs.map((tab) => {
                    const isActive = tab.key === activeDetailTab;

                    return (
                      <Button
                        key={tab.key}
                        className={
                          isActive
                            ? "h-10 rounded-b-none border-b-2 border-[#022279] bg-[#F5F7FB] px-6 text-sm font-semibold text-[#022279]"
                            : "h-10 rounded-none px-6 text-sm font-semibold text-[#5B5D68]"
                        }
                        variant="light"
                        onPress={() => {
                          setActiveDetailTab(tab.key);
                        }}
                      >
                        {tab.label}
                      </Button>
                    );
                  })}
                </div>

                <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_520px]">
                  {renderDetailContent()}
                  {renderActivityPanel()}
                </div>
              </div>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 px-6 py-6">
        <section className="rounded-xl border border-default-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              aria-label="Website URL"
              className="min-w-0 flex-1"
              classNames={{
                input: "text-sm text-[#111827]",
                inputWrapper:
                  "h-[44px] rounded-xl border border-[#D1D5DB] bg-white px-4 shadow-none",
              }}
              placeholder="Add website URL"
              value={sitemapUrl}
              variant="bordered"
              onValueChange={setSitemapUrl}
            />
            <div className="flex flex-wrap gap-2 lg:flex-nowrap">
              <Button
                className="h-[40px] rounded-xl bg-[#022279] px-5 text-sm font-medium text-white"
                isDisabled={!normalizedSitemapUrl}
                startContent={
                  isStartingOptimization ? <LoaderCircle size={18} /> : null
                }
                onPress={handleStartOptimization}
              >
                Start Optimization
              </Button>
            </div>
          </div>
        </section>

        <DashboardDataTable
          ariaLabel="On-page optimization table"
          columns={columns}
          emptyContent="No optimization rows yet."
          getRowKey={(item) => item.id}
          isLoading={isLoadingRuns}
          loadingLabel="Loading on-page optimizations..."
          rows={rows}
          title="On-Page Optimization"
        />
      </div>

      <Modal
        isOpen={Boolean(deleteRunCandidate)}
        placement="center"
        size="sm"
        onOpenChange={(isOpen) => {
          if (!isOpen && !isDeletingRun) {
            setDeleteRunCandidate(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader className="pb-2 text-base font-semibold text-[#111827]">
            Delete optimization run?
          </ModalHeader>
          <ModalBody className="pt-0 text-sm text-[#4B5563]">
            <p>
              This will remove the saved on-page optimization run for{" "}
              <span className="font-medium text-[#111827]">
                {deleteRunCandidate?.websiteUrl ?? "this website"}
              </span>
              .
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              isDisabled={isDeletingRun}
              variant="bordered"
              onPress={() => {
                setDeleteRunCandidate(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-danger text-white"
              isLoading={isDeletingRun}
              onPress={() => {
                void confirmDeleteRun();
              }}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
