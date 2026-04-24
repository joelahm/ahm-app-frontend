"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Progress } from "@heroui/progress";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Input, Textarea } from "@heroui/input";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import {
  Bold,
  CornerDownRight,
  Columns3,
  EllipsisVertical,
  ImageIcon,
  Italic,
  List,
  GripVertical,
  ListOrdered,
  Minus,
  Paperclip,
  Pencil,
  Plus,
  SendHorizontal,
  Settings,
  Search,
  SlidersHorizontal,
  Strikethrough,
  Trash2,
  Underline,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { aiPromptsApi } from "@/apis/ai-prompts";
import { clientsApi, type ClientDetails } from "@/apis/clients";
import {
  keywordResearchApi,
  type KeywordResearchItem,
} from "@/apis/keyword-research";
import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import {
  AddWebsiteContentKeywordsModal,
  AddWebsiteContentKeywordsPayload,
} from "@/components/dashboard/client-details/add-website-content-keywords-modal";
import {
  WebsiteContentKeywordItem,
  type WebsiteContentFormValues,
  WebsiteContentKeywordsModal,
} from "@/components/dashboard/keyword-research/website-content-keywords-modal";
import { keywordContentListsApi } from "@/apis/keyword-content-lists";
import { useAuth } from "@/components/auth/auth-context";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  buildAiPromptTemplateValues,
  resolveAiPromptTemplate,
} from "@/lib/ai-prompt-template";
import { manusApi } from "@/apis/manus";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  buildCommentMessage,
  buildPendingAttachmentsFromFileList,
  MAX_COMMENT_ATTACHMENT_BYTES,
  MAX_COMMENT_ATTACHMENTS,
  MAX_COMMENT_ATTACHMENTS_TOTAL_BYTES,
  MAX_COMMENT_PAYLOAD_BYTES,
  parseCommentAttachments,
  PendingAttachmentItem,
  validateCommentPayloadSize,
} from "@/lib/comment-attachments";

const TOTAL_CREDITS = 80;

const INITIAL_BREAKDOWN = [
  { key: "treatment", label: "Treatment pages", allocated: 10, used: 0 },
  { key: "condition", label: "Condition pages", allocated: 5, used: 0 },
  { key: "blogs", label: "Blogs", allocated: 40, used: 0 },
  { key: "press", label: "Press Release", allocated: 10, used: 0 },
  { key: "homepage", label: "Homepage", allocated: 1, used: 0 },
];

const MODAL_ROW_ORDER = [
  "homepage",
  "treatment",
  "condition",
  "press",
  "blogs",
];

type BreakdownItem = {
  allocated: number;
  key: string;
  label: string;
  used: number;
};

const cloneBreakdown = (items: BreakdownItem[]) =>
  items.map((item) => ({ ...item }));

const normalizeBreakdownItems = (
  sourceItems?: BreakdownItem[],
): BreakdownItem[] => {
  const sourceByKey = new Map(
    (sourceItems ?? []).map((item) => [item.key, item]),
  );

  return INITIAL_BREAKDOWN.map((defaultItem) => {
    const source = sourceByKey.get(defaultItem.key);

    return {
      allocated:
        typeof source?.allocated === "number"
          ? source.allocated
          : defaultItem.allocated,
      key: defaultItem.key,
      label: defaultItem.label,
      used: typeof source?.used === "number" ? source.used : defaultItem.used,
    };
  });
};

type WebsiteContentRow = {
  altDescription: string | null;
  altTitle: string | null;
  contentLength: string;
  depth: number;
  generatedContent: string | null;
  id: string;
  isPillarArticle: boolean;
  isSelected: boolean;
  intent: string;
  keywordId: string;
  keyword: string;
  listId: string;
  metaDescription: string | null;
  metaTitle: string | null;
  parentKeywordId: string | null;
  status: string;
  sv: string;
  title: string;
  type: string;
};

type BreakdownTableRow = {
  allocated: number;
  key: string;
  label: string;
  remaining: number;
  used: number;
};

type GenerationModalState = {
  content: string;
  error: string;
  isGenerating: boolean;
  isOpen: boolean;
  rowId: string | null;
  rowKeyword: string;
};

type GeneratedSeoFields = {
  altDescription: string;
  altTitle: string;
  metaDescription: string;
  metaTitle: string;
};

type WebsiteContentComment = {
  author: {
    avatarUrl: string | null;
    firstName: string | null;
    id: string;
    lastName: string | null;
  } | null;
  comment: string;
  createdAt: string;
  id: string;
};

type FeaturedImageUpload = {
  name: string;
  previewUrl: string;
  sizeLabel: string;
};

type EditContentFormValues = {
  altDescription: string;
  altTitle: string;
  articleTitle: string;
  citation: string;
  content: string;
  intent: string;
  keyword: string;
  metaDescription: string;
  metaTitle: string;
  status: string;
};

const EDIT_CONTENT_SCHEMA = yup.object({
  altDescription: yup.string().max(255).default(""),
  altTitle: yup.string().max(255).default(""),
  articleTitle: yup.string().trim().required("Article title is required."),
  citation: yup.string().trim().required().default("In-text"),
  content: yup.string().trim().required("Content is required."),
  intent: yup.string().trim().required().default("Informational"),
  keyword: yup.string().trim().required().default(""),
  metaDescription: yup.string().max(320).default(""),
  metaTitle: yup.string().max(160).default(""),
  status: yup.string().trim().required().default("Draft"),
});

const CONTENT_STATUS_OPTIONS = ["Draft", "Generating", "Completed", "Failed"];
const CITATION_OPTIONS = ["In-text", "Footnote", "Reference"];
const INTENT_OPTIONS = [
  "Informational",
  "Commercial",
  "Transactional",
  "Navigational",
];

const stripHtmlToPlainText = (value: string) => {
  if (!value) {
    return "";
  }

  const cleanedValue = value
    .replace(/<[^>\n]{0,80}$/g, "")
    .replace(/<\/[^>\n]{0,80}$/g, "")
    .replace(/&lt;[^&\n]{0,80}$/g, "")
    .replace(/(?:^|\n)\s*[<][a-z0-9/\s-]*$/gi, "")
    .trim();

  const withLineBreaks = cleanedValue
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(p|div|h1|h2|h3|h4|h5|h6)\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n- ")
    .replace(/<\/\s*li\s*>/gi, "")
    .replace(/<[^>]+>/g, " ");

  const decoded = withLineBreaks
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  return decoded
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n?\s*<\s*[a-z0-9/]*\s*$/i, "")
    .trim();
};

const cleanGeneratedWebsiteContent = (value: string) =>
  value
    .trim()
    .replace(/\s*<[^>\n\r]*$/g, "")
    .replace(/\s*&(?:[a-zA-Z0-9#]*)?$/g, "")
    .replace(/\n?\s*#{1,6}\s*$/g, "")
    .trim();

const sanitizeGeneratedRichTextHtml = (value: string) => {
  const cleanedValue = cleanGeneratedWebsiteContent(value);

  if (!cleanedValue) {
    return "";
  }

  if (!/<[a-z][\s\S]*>/i.test(cleanedValue)) {
    return toEditorHtmlContent(cleanedValue);
  }

  if (typeof window === "undefined") {
    return cleanedValue;
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(cleanedValue, "text/html");
  const blockedTags = ["script", "style", "iframe", "object", "embed"];
  const allowedTags = new Set([
    "a",
    "blockquote",
    "br",
    "em",
    "h1",
    "h2",
    "h3",
    "li",
    "ol",
    "p",
    "strong",
    "ul",
  ]);

  blockedTags.forEach((tagName) => {
    documentNode.querySelectorAll(tagName).forEach((node) => {
      node.remove();
    });
  });

  Array.from(documentNode.body.querySelectorAll("*")).forEach((element) => {
    const tagName = element.tagName.toLowerCase();

    if (!allowedTags.has(tagName)) {
      const parent = element.parentNode;

      if (!parent) {
        element.remove();

        return;
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }

      parent.removeChild(element);

      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase();

      if (tagName === "a" && attributeName === "href") {
        const href = attribute.value.trim();

        if (/^(https?:|mailto:|tel:|#)/i.test(href)) {
          element.setAttribute("href", href);
          element.setAttribute("rel", "noopener noreferrer");
          element.setAttribute("target", "_blank");
        } else {
          element.removeAttribute(attribute.name);
        }

        return;
      }

      element.removeAttribute(attribute.name);
    });
  });

  const normalizedHtml = documentNode.body.innerHTML
    .replace(/<(p|h1|h2|h3|li)>\s*<\/\1>/gi, "")
    .trim();

  return normalizedHtml || toEditorHtmlContent(cleanedValue);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toEditorHtmlContent = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "<p></p>";
  }

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return value;
  }

  return trimmed
    .split(/\n{2,}/)
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
};

const resolveServerAssetUrl = (value?: string | null) => {
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

const sanitizeCommentHtml = (html: string) => {
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
const CONTENT_LENGTH_OPTIONS = [
  {
    description: "(800-1000 words | Ideal for Service Pages)",
    label: "Short",
    value: "Short",
  },
  {
    description: "(1000-1500 words | Ideal for Standard Blogs)",
    label: "Standard",
    value: "Standard",
  },
  {
    description: "(1800-2500 words | Ideal for Comprehensive Blogs)",
    label: "Comprehensive",
    value: "Comprehensive",
  },
] as const;

const formatIntentAbbreviation = (value: string) => {
  if (!value || value === "-") {
    return "-";
  }

  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join(",");
};

const toLabelCase = (value: string) =>
  value
    .split(" ")
    .map((part) =>
      part
        ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`
        : "",
    )
    .join(" ");

const statusChipClass = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized.includes("failed")) {
    return "bg-[#FEE2E2] text-[#B91C1C]";
  }

  if (normalized.includes("generating")) {
    return "bg-[#FEF3C7] text-[#92400E]";
  }

  if (normalized.includes("completed")) {
    return "bg-[#BDF4FF] text-[#0284C7]";
  }

  if (normalized.includes("progress")) {
    return "bg-[#BDF4FF] text-[#0284C7]";
  }

  if (normalized.includes("review")) {
    return "bg-[#BDF4FF] text-[#0284C7]";
  }

  if (normalized.includes("implementation")) {
    return "bg-[#BDF4FF] text-[#0284C7]";
  }

  return "bg-[#BDF4FF] text-[#0284C7]";
};

const normalizePageTypeForPrompt = (pageType: string) => {
  const normalized = pageType.trim().toLowerCase();

  if (normalized.includes("home")) {
    return "Homepage";
  }

  if (normalized.includes("treatment") || normalized.includes("service")) {
    return "Treatment Page";
  }

  if (normalized.includes("condition")) {
    return "Conditions Page";
  }

  if (normalized.includes("blog")) {
    return "Blog Page";
  }

  if (normalized.includes("press")) {
    return "Press Release";
  }

  return pageType.trim();
};

const getBreakdownKeyForContentType = (contentType: string) => {
  const normalized = contentType.trim().toLowerCase();

  if (normalized.includes("home")) {
    return "homepage";
  }

  if (normalized.includes("treatment") || normalized.includes("service")) {
    return "treatment";
  }

  if (normalized.includes("condition")) {
    return "condition";
  }

  if (normalized.includes("blog")) {
    return "blogs";
  }

  if (normalized.includes("press")) {
    return "press";
  }

  return null;
};

const applyUsedCountsToBreakdown = (
  items: BreakdownItem[],
  usedByKey: Record<string, number>,
) =>
  items.map((item) => ({
    ...item,
    used: usedByKey[item.key] ?? 0,
  }));

const getLengthInstruction = (contentLength: string) => {
  const normalized = contentLength.trim().toLowerCase();
  const numericMatch = normalized.match(/\d[\d,]*/);

  if (numericMatch) {
    const wordCount = numericMatch[0]?.replace(/,/g, "");

    return `IMPORTANT: Override any previous length instruction in the template. Write approximately ${wordCount} words for this row. Stay within 10% of that target.`;
  }

  if (normalized.includes("short")) {
    return "IMPORTANT: Override any previous length instruction in the template. Write 800-1000 words for this row.";
  }

  if (normalized.includes("standard") || normalized.includes("medium")) {
    return "IMPORTANT: Override any previous length instruction in the template. Write 1000-1500 words for this row.";
  }

  return "IMPORTANT: Override any previous length instruction in the template. Write 1800-2500 words for this row.";
};

const getMaxOutputTokensForContentLength = (contentLength: string) => {
  const normalized = contentLength.trim().toLowerCase();
  const numericMatch = normalized.match(/\d[\d,]*/);

  if (numericMatch) {
    const targetWords = Number(numericMatch[0]?.replace(/,/g, ""));

    if (Number.isFinite(targetWords) && targetWords > 0) {
      return Math.min(Math.max(Math.ceil(targetWords * 1.8) + 600, 1200), 6500);
    }
  }

  if (normalized.includes("short")) {
    return 2400;
  }

  if (normalized.includes("standard") || normalized.includes("medium")) {
    return 3600;
  }

  return 6000;
};

const parseGeneratedSeoFields = (value: string): GeneratedSeoFields => {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonSource = fencedMatch?.[1]?.trim() || trimmed;
  const objectMatch = jsonSource.match(/\{[\s\S]*\}/);
  const normalizedSource = objectMatch?.[0] || jsonSource;
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(normalizedSource) as Record<string, unknown>;
  } catch {
    throw new Error("Failed to parse generated SEO metadata.");
  }

  const metaTitle =
    typeof parsed.metaTitle === "string" ? parsed.metaTitle.trim() : "";
  const metaDescription =
    typeof parsed.metaDescription === "string"
      ? parsed.metaDescription.trim()
      : "";
  const altTitle =
    typeof parsed.altTitle === "string" ? parsed.altTitle.trim() : "";
  const altDescription =
    typeof parsed.altDescription === "string"
      ? parsed.altDescription.trim()
      : "";

  if (!metaTitle || !metaDescription || !altTitle || !altDescription) {
    throw new Error("Generated SEO metadata was incomplete.");
  }

  return {
    altDescription,
    altTitle,
    metaDescription,
    metaTitle,
  };
};

const mapKeywordContentListsToRows = (
  records: Array<{
    id: string;
    keywords: Array<{
      altDescription?: string | null;
      altTitle?: string | null;
      contentLength?: string | null;
      contentType?: string | null;
      generatedContent?: string | null;
      id?: string | null;
      isPillarArticle?: boolean | null;
      intent?: string | null;
      keyword?: string | null;
      metaDescription?: string | null;
      metaTitle?: string | null;
      parentKeywordId?: string | null;
      searchVolume?: number | null;
      status?: string | null;
      title?: string | null;
    }>;
  }>,
) =>
  records.flatMap((record, recordIndex) =>
    (record.keywords ?? [])
      .filter((item) => item && item.keyword)
      .map((item, keywordIndex) => {
        const keywordId =
          (typeof item.id === "string" && item.id.trim()) ||
          `${record.id}-${keywordIndex}`;

        return {
          altDescription:
            typeof item.altDescription === "string" &&
            item.altDescription.trim()
              ? item.altDescription
              : null,
          altTitle:
            typeof item.altTitle === "string" && item.altTitle.trim()
              ? item.altTitle
              : null,
          contentLength:
            (typeof item.contentLength === "string" && item.contentLength) ||
            "Short",
          depth: 0,
          generatedContent:
            typeof item.generatedContent === "string" &&
            item.generatedContent.trim()
              ? item.generatedContent
              : null,
          id: `${record.id}:${keywordId}:${recordIndex}:${keywordIndex}`,
          isPillarArticle: Boolean(item.isPillarArticle),
          isSelected: false,
          intent: item.intent || "-",
          keyword: item.keyword || "",
          keywordId,
          listId: record.id,
          metaDescription:
            typeof item.metaDescription === "string" &&
            item.metaDescription.trim()
              ? item.metaDescription
              : null,
          metaTitle:
            typeof item.metaTitle === "string" && item.metaTitle.trim()
              ? item.metaTitle
              : null,
          parentKeywordId:
            typeof item.parentKeywordId === "string" &&
            item.parentKeywordId.trim()
              ? item.parentKeywordId
              : null,
          status:
            (typeof item.status === "string" && item.status) || "Not started",
          sv:
            typeof item.searchVolume === "number"
              ? String(item.searchVolume)
              : "-",
          title: item.title || "",
          type: item.contentType || "-",
        };
      }),
  );

const enrichRowDepths = (sourceRows: WebsiteContentRow[]) => {
  const rowByKeywordId = new Map(
    sourceRows.map((row) => [row.keywordId, row] as const),
  );

  const resolveDepth = (row: WebsiteContentRow) => {
    let depth = 0;
    let currentParentId = row.parentKeywordId;
    const visited = new Set<string>();

    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const parent = rowByKeywordId.get(currentParentId);

      if (!parent) {
        break;
      }

      depth += 1;
      currentParentId = parent.parentKeywordId;

      if (depth >= 4) {
        break;
      }
    }

    return depth;
  };

  return sourceRows.map((row) => ({
    ...row,
    depth: resolveDepth(row),
  }));
};

export const ClientWebsiteContentScreen = ({
  clientId,
}: {
  clientId?: string;
}) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [breakdown, setBreakdown] =
    useState<BreakdownItem[]>(INITIAL_BREAKDOWN);
  const [draftBreakdown, setDraftBreakdown] =
    useState<BreakdownItem[]>(INITIAL_BREAKDOWN);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [isAddKeywordsModalOpen, setIsAddKeywordsModalOpen] = useState(false);
  const [
    isWebsiteContentKeywordsModalOpen,
    setIsWebsiteContentKeywordsModalOpen,
  ] = useState(false);
  const [draftKeywordPayload, setDraftKeywordPayload] =
    useState<AddWebsiteContentKeywordsPayload | null>(null);
  const [websiteContentKeywords, setWebsiteContentKeywords] = useState<
    WebsiteContentKeywordItem[]
  >([]);
  const [rows, setRows] = useState<WebsiteContentRow[]>([]);
  const [writingByRowId, setWritingByRowId] = useState<Record<string, boolean>>(
    {},
  );
  const [draggingKeywordId, setDraggingKeywordId] = useState<string | null>(
    null,
  );
  const [dragOverKeywordId, setDragOverKeywordId] = useState<string | null>(
    null,
  );
  const [generationModal, setGenerationModal] = useState<GenerationModalState>({
    content: "",
    error: "",
    isGenerating: false,
    isOpen: false,
    rowId: null,
    rowKeyword: "",
  });
  const [overwriteConfirmRowId, setOverwriteConfirmRowId] = useState<
    string | null
  >(null);
  const [clusterConfirmRowId, setClusterConfirmRowId] = useState<string | null>(
    null,
  );
  const [generationClientDetails, setGenerationClientDetails] =
    useState<ClientDetails | null>(null);
  const [promptTemplateByType, setPromptTemplateByType] = useState<
    Record<string, string>
  >({});
  const commentEditorRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const featuredImageInputRef = useRef<HTMLInputElement | null>(null);
  const [commentsByRowId, setCommentsByRowId] = useState<
    Record<string, WebsiteContentComment[]>
  >({});
  const [commentInput, setCommentInput] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<string | null>(
    null,
  );
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachmentItem[]
  >([]);
  const [commentAttachmentLibrary, setCommentAttachmentLibrary] = useState<
    Record<
      string,
      { isImage: boolean; mimeType?: string; name: string; previewUrl: string }
    >
  >({});
  const [previewAttachment, setPreviewAttachment] = useState<{
    name: string;
    url: string;
  } | null>(null);
  const [featuredImagesByRowId, setFeaturedImagesByRowId] = useState<
    Record<string, FeaturedImageUpload | null>
  >({});
  const {
    control: editContentControl,
    formState: { errors: editContentErrors, isSubmitting: isSavingEditContent },
    handleSubmit: handleEditContentSubmit,
    reset: resetEditContentForm,
  } = useForm<EditContentFormValues>({
    defaultValues: {
      altDescription: "",
      altTitle: "",
      articleTitle: "",
      citation: "In-text",
      content: "",
      intent: "Informational",
      keyword: "",
      metaDescription: "",
      metaTitle: "",
      status: "Draft",
    },
    mode: "onSubmit",
  });

  const loadSavedKeywords = useCallback(async () => {
    if (!session?.accessToken || !clientId) {
      setRows([]);

      return;
    }

    const response = await keywordContentListsApi.listKeywordContentLists(
      session.accessToken,
      { clientId },
    );

    setRows(
      enrichRowDepths(
        mapKeywordContentListsToRows(
          response.keywordContentLists.map((record) => ({
            id: record.id,
            keywords: record.keywords,
          })),
        ),
      ),
    );
  }, [clientId, session?.accessToken]);

  const loadSavedBreakdown = useCallback(async () => {
    if (!session?.accessToken || !clientId) {
      setBreakdown(INITIAL_BREAKDOWN);

      return;
    }

    const response = await keywordContentListsApi.getClientContentBreakdown(
      session.accessToken,
      clientId,
    );
    const normalized = normalizeBreakdownItems(response.items);

    setBreakdown(normalized);
  }, [clientId, session?.accessToken]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        await Promise.all([loadSavedKeywords(), loadSavedBreakdown()]);
      } catch {
        if (!isMounted) {
          return;
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadSavedBreakdown, loadSavedKeywords]);

  useEffect(() => {
    if (!session?.accessToken || !clientId) {
      setGenerationClientDetails(null);
      setPromptTemplateByType({});

      return;
    }

    let isMounted = true;

    const loadGenerationContext = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const [promptsResponse, clientDetailsResponse] = await Promise.all([
          aiPromptsApi.getPrompts(accessToken),
          clientsApi.getClientById(accessToken, clientId),
        ]);

        if (!isMounted) {
          return;
        }

        const byType = promptsResponse.aiPrompts.reduce<Record<string, string>>(
          (acc, prompt) => {
            const normalizedType = normalizePageTypeForPrompt(
              prompt.typeOfPost,
            );

            if (
              !normalizedType ||
              prompt.status.toLowerCase() !== "active" ||
              !prompt.prompt?.trim()
            ) {
              return acc;
            }

            const existing = acc[normalizedType];

            if (!existing) {
              acc[normalizedType] = prompt.prompt?.trim() || "";
            }

            return acc;
          },
          {},
        );

        setGenerationClientDetails(clientDetailsResponse);
        setPromptTemplateByType(byType);
      } catch {
        if (!isMounted) {
          return;
        }

        setGenerationClientDetails(null);
        setPromptTemplateByType({});
      }
    };

    void loadGenerationContext();

    return () => {
      isMounted = false;
    };
  }, [clientId, getValidAccessToken, session?.accessToken]);

  const liveUsedByBreakdownKey = useMemo(
    () =>
      rows.reduce<Record<string, number>>((counts, row) => {
        const key = getBreakdownKeyForContentType(row.type);

        if (!key) {
          return counts;
        }

        counts[key] = (counts[key] ?? 0) + 1;

        return counts;
      }, {}),
    [rows],
  );
  const liveBreakdown = useMemo(
    () => applyUsedCountsToBreakdown(breakdown, liveUsedByBreakdownKey),
    [breakdown, liveUsedByBreakdownKey],
  );
  const liveDraftBreakdown = useMemo(
    () => applyUsedCountsToBreakdown(draftBreakdown, liveUsedByBreakdownKey),
    [draftBreakdown, liveUsedByBreakdownKey],
  );

  const totalAllocated = liveBreakdown.reduce(
    (sum, item) => sum + item.allocated,
    0,
  );
  const totalUsed = liveBreakdown.reduce((sum, item) => sum + item.used, 0);

  const modalRows = useMemo(
    () =>
      MODAL_ROW_ORDER.map((key) =>
        liveDraftBreakdown.find((item) => item.key === key),
      ).filter((item): item is BreakdownItem => Boolean(item)),
    [liveDraftBreakdown],
  );

  const modalAllocated = liveDraftBreakdown.reduce(
    (sum, item) => sum + item.allocated,
    0,
  );
  const modalUsed = liveDraftBreakdown.reduce(
    (sum, item) => sum + item.used,
    0,
  );
  const modalRemaining = Math.max(0, modalAllocated - modalUsed);
  const modalUnallocated = Math.max(0, TOTAL_CREDITS - modalAllocated);
  const breakdownRows: BreakdownTableRow[] = modalRows.map((item) => ({
    allocated: item.allocated,
    key: item.key,
    label: item.label,
    remaining: Math.max(0, item.allocated - item.used),
    used: item.used,
  }));

  const updateAllocated = (key: string, delta: number) => {
    setDraftBreakdown((current) =>
      current.map((item) => {
        if (item.key !== key) {
          return item;
        }

        return {
          ...item,
          allocated: Math.max(item.used, item.allocated + delta),
        };
      }),
    );
  };

  const updateRowById = (rowId: string, patch: Partial<WebsiteContentRow>) => {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  };

  const persistKeywordHierarchy = useCallback(
    async (
      row: WebsiteContentRow,
      payload: { isPillarArticle?: boolean; parentKeywordId?: string | null },
    ) => {
      if (!session?.accessToken) {
        throw new Error("Session expired. Please login again.");
      }

      await keywordContentListsApi.updateKeywordContentListKeyword(
        session.accessToken,
        {
          keywordId: row.keywordId,
          listId: row.listId,
          ...payload,
        },
      );
    },
    [session?.accessToken],
  );

  const wouldCreateCycle = useCallback(
    (draggedRow: WebsiteContentRow, targetRow: WebsiteContentRow) => {
      let currentParentId = targetRow.parentKeywordId;
      const visited = new Set<string>([targetRow.keywordId]);

      while (currentParentId && !visited.has(currentParentId)) {
        if (currentParentId === draggedRow.keywordId) {
          return true;
        }

        visited.add(currentParentId);

        const parent = rows.find((row) => row.keywordId === currentParentId);

        currentParentId = parent?.parentKeywordId ?? null;
      }

      return false;
    },
    [rows],
  );

  const applyHierarchyUpdate = useCallback(
    (keywordId: string, parentKeywordId: string | null) => {
      setRows((current) =>
        enrichRowDepths(
          current.map((row) =>
            row.keywordId === keywordId
              ? {
                  ...row,
                  isPillarArticle: parentKeywordId
                    ? false
                    : row.isPillarArticle,
                  parentKeywordId,
                }
              : row,
          ),
        ),
      );
    },
    [],
  );

  const handleDropOnKeyword = useCallback(
    async (targetRow: WebsiteContentRow, draggedKeywordId?: string) => {
      const sourceKeywordId = draggedKeywordId || draggingKeywordId;

      if (!sourceKeywordId || sourceKeywordId === targetRow.keywordId) {
        return;
      }

      const draggedRow =
        rows.find((row) => row.keywordId === sourceKeywordId) ?? null;

      if (!draggedRow) {
        return;
      }

      if (wouldCreateCycle(draggedRow, targetRow)) {
        toast.danger("Invalid hierarchy. This would create a loop.");

        return;
      }

      const previousParent = draggedRow.parentKeywordId;

      applyHierarchyUpdate(draggedRow.keywordId, targetRow.keywordId);

      try {
        await persistKeywordHierarchy(draggedRow, {
          isPillarArticle: false,
          parentKeywordId: targetRow.keywordId,
        });
      } catch (error) {
        applyHierarchyUpdate(draggedRow.keywordId, previousParent);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update hierarchy.";

        toast.danger(message);
      }
    },
    [
      draggingKeywordId,
      rows,
      wouldCreateCycle,
      applyHierarchyUpdate,
      persistKeywordHierarchy,
      toast,
    ],
  );

  const handleMakeKeywordTopLevel = useCallback(
    async (draggedKeywordId?: string) => {
      const sourceKeywordId = draggedKeywordId || draggingKeywordId;

      if (!sourceKeywordId) {
        return;
      }

      const draggedRow =
        rows.find((row) => row.keywordId === sourceKeywordId) ?? null;

      if (!draggedRow) {
        return;
      }

      const previousParent = draggedRow.parentKeywordId;

      applyHierarchyUpdate(draggedRow.keywordId, null);

      try {
        await persistKeywordHierarchy(draggedRow, {
          parentKeywordId: null,
        });
      } catch (error) {
        applyHierarchyUpdate(draggedRow.keywordId, previousParent);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update hierarchy.";

        toast.danger(message);
      }
    },
    [
      draggingKeywordId,
      rows,
      applyHierarchyUpdate,
      persistKeywordHierarchy,
      toast,
    ],
  );

  const handleDeleteKeyword = useCallback(
    async (row: WebsiteContentRow) => {
      if (!session?.accessToken) {
        toast.danger("Session expired. Please login again.");

        return;
      }

      if (!row.listId || !row.keywordId) {
        toast.danger("Unable to delete this keyword.");

        return;
      }

      try {
        await keywordContentListsApi.deleteKeywordContentListKeyword(
          session.accessToken,
          {
            keywordId: row.keywordId,
            listId: row.listId,
          },
        );
        await loadSavedKeywords();
        toast.success("Keyword deleted successfully.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete keyword.";

        toast.danger(message);
      }
    },
    [loadSavedKeywords, session?.accessToken, toast],
  );

  const setRowLoadingState = useCallback(
    (rowId: string, isLoading: boolean) => {
      setWritingByRowId((current) => ({
        ...current,
        [rowId]: isLoading,
      }));
    },
    [],
  );

  const hasExistingGeneratedContent = useCallback(
    (row: WebsiteContentRow) => Boolean(row.generatedContent?.trim()),
    [],
  );

  const getClusterChildRows = useCallback(
    (row: WebsiteContentRow) =>
      rows.filter((candidate) => candidate.parentKeywordId === row.keywordId),
    [rows],
  );

  const isClusterParentRow = useCallback(
    (row: WebsiteContentRow) => getClusterChildRows(row).length > 0,
    [getClusterChildRows],
  );

  const getWriteButtonLabel = useCallback(
    (row: WebsiteContentRow) => {
      if (isClusterParentRow(row)) {
        return "Write Whole Cluster";
      }

      if (row.isPillarArticle && !row.parentKeywordId) {
        return "Write Pillar";
      }

      return "Write Content";
    },
    [isClusterParentRow],
  );

  const getParentPillarRow = useCallback(
    (row: WebsiteContentRow) => {
      if (!row.parentKeywordId) {
        return null;
      }

      const rowByKeywordId = new Map(
        rows.map((candidate) => [candidate.keywordId, candidate] as const),
      );
      const visited = new Set<string>();
      let current = rowByKeywordId.get(row.parentKeywordId) ?? null;

      while (
        current &&
        current.parentKeywordId &&
        !visited.has(current.keywordId)
      ) {
        visited.add(current.keywordId);
        const next = rowByKeywordId.get(current.parentKeywordId) ?? null;

        if (!next) {
          break;
        }

        current = next;
      }

      return current;
    },
    [rows],
  );

  const detectClusterType = useCallback(
    (row: WebsiteContentRow): "pillar" | "cluster" => {
      if (row.parentKeywordId) {
        return "cluster";
      }

      if (row.isPillarArticle) {
        return "pillar";
      }

      return "pillar";
    },
    [],
  );

  const getPromptTemplateByType = useCallback(
    (pageType: string) => {
      const normalizedType = normalizePageTypeForPrompt(pageType);

      if (promptTemplateByType[normalizedType]) {
        return promptTemplateByType[normalizedType];
      }

      return "";
    },
    [promptTemplateByType],
  );

  const persistRowPatch = useCallback(
    async (
      row: WebsiteContentRow,
      patch: {
        altDescription?: string | null;
        altTitle?: string | null;
        contentLength?: string;
        contentType?: string;
        generatedContent?: string | null;
        metaDescription?: string | null;
        metaTitle?: string | null;
        status?: string;
        title?: string;
      },
    ) => {
      if (!session?.accessToken) {
        throw new Error("Session expired. Please login again.");
      }

      await keywordContentListsApi.updateKeywordContentListKeyword(
        session.accessToken,
        {
          keywordId: row.keywordId,
          listId: row.listId,
          ...patch,
        },
      );
    },
    [session?.accessToken],
  );

  const buildGenerationPrompt = useCallback(
    (row: WebsiteContentRow) => {
      const promptTemplate = getPromptTemplateByType(row.type);

      if (!promptTemplate) {
        throw new Error(
          `No active AI prompt found for page type "${normalizePageTypeForPrompt(row.type)}".`,
        );
      }

      const clusterType = detectClusterType(row);
      const parentPillarRow = getParentPillarRow(row);
      const parentPillarTopic = parentPillarRow?.keyword || "";
      const lengthInstruction = getLengthInstruction(row.contentLength);
      const clusterInstruction =
        clusterType === "pillar"
          ? "This is a pillar content page. Write broad, comprehensive, authority-style content for the main topic."
          : `This is a cluster content page. Write focused subtopic content that semantically supports the pillar topic "${parentPillarTopic}". Include internal linking context to the pillar page when relevant.`;

      const resolvedPrompt = resolveAiPromptTemplate({
        template: promptTemplate,
        values: buildAiPromptTemplateValues({
          audience: "",
          businessName: generationClientDetails?.businessName?.trim() || "",
          clientDetails: generationClientDetails,
          contentType: normalizePageTypeForPrompt(row.type),
          intent: row.intent || "",
          keyword: row.keyword,
          location:
            generationClientDetails?.cityState?.trim() ||
            generationClientDetails?.country?.trim() ||
            "",
          pageType: normalizePageTypeForPrompt(row.type),
          requireClient: true,
          topic: row.keyword,
          url: generationClientDetails?.website?.trim() || "",
        }),
      }).trim();

      return `${resolvedPrompt}\n\n${clusterInstruction}\nCluster Type: ${clusterType}\nParent Pillar Topic: ${parentPillarTopic || "N/A"}\n\nFINAL LENGTH REQUIREMENT:\n${lengthInstruction}\n\nFORMATTING REQUIREMENT:\nReturn clean semantic HTML suitable for a WYSIWYG editor. Use exactly one <h1> near the top for the main page title, use <h2> for primary sections, use <h3> only when needed for subsections, use <p> for body copy, and use <ul>/<ol>/<li> where appropriate. Do not return markdown, code fences, inline styles, or wrapper tags like <html> or <body>.\n\nCOMPLETION REQUIREMENT:\nFinish with a complete sentence and a complete final section. Do not end with an unfinished paragraph, incomplete word, partial HTML tag, markdown fragment, dangling \"<\", or dangling character. Close every opened tag before the answer ends.`.trim();
    },
    [
      detectClusterType,
      generationClientDetails,
      getParentPillarRow,
      getPromptTemplateByType,
    ],
  );

  const buildSeoFieldsPrompt = useCallback(
    (row: WebsiteContentRow, contentHtml: string) => {
      const plainContent = stripHtmlToPlainText(contentHtml);
      const businessName = generationClientDetails?.businessName?.trim() || "";
      const location =
        generationClientDetails?.cityState?.trim() ||
        generationClientDetails?.country?.trim() ||
        "";
      const articleTitle = row.title?.trim() || toLabelCase(row.keyword);

      return `You are generating SEO fields for a website content page.

Return JSON only with this exact shape:
{
  "metaTitle": "...",
  "metaDescription": "...",
  "altTitle": "...",
  "altDescription": "..."
}

Rules:
- metaTitle must be SEO-optimized, natural, and under 60 characters.
- metaDescription must be compelling, natural, and between 140 and 160 characters.
- altTitle must be a concise featured image title under 125 characters.
- altDescription must clearly describe a relevant featured image for this page and stay under 160 characters.
- Use the primary keyword naturally.
- Do not include markdown, code fences, explanations, or extra keys.

Context:
- Business Name: ${businessName || "N/A"}
- Location: ${location || "N/A"}
- Page Type: ${normalizePageTypeForPrompt(row.type)}
- Primary Keyword: ${row.keyword}
- Article Title: ${articleTitle}

Content:
${plainContent}`.trim();
    },
    [generationClientDetails],
  );

  const openGenerationModal = useCallback((row: WebsiteContentRow) => {
    setGenerationModal({
      content: "",
      error: "",
      isGenerating: true,
      isOpen: true,
      rowId: row.id,
      rowKeyword: row.keyword,
    });
  }, []);

  const generateContentForRow = useCallback(
    async (
      row: WebsiteContentRow,
      options?: { openModal?: boolean; showSuccessToast?: boolean },
    ) => {
      setRowLoadingState(row.id, true);
      updateRowById(row.id, { status: "Generating" });
      if (options?.openModal ?? true) {
        openGenerationModal(row);
      }

      try {
        if (!session?.accessToken) {
          throw new Error("Session expired. Please login again.");
        }

        const prompt = buildGenerationPrompt(row);
        const response = await manusApi.generateText(session.accessToken, {
          clientId,
          maxCharacters: getMaxOutputTokensForContentLength(row.contentLength),
          prompt,
          provider: "OPENAI",
        });
        const generatedContent = sanitizeGeneratedRichTextHtml(
          response.text?.trim() || "",
        );

        if (!generatedContent) {
          throw new Error("No content was generated. Please try again.");
        }

        const seoPrompt = buildSeoFieldsPrompt(row, generatedContent);
        const seoResponse = await manusApi.generateText(session.accessToken, {
          clientId,
          maxCharacters: 700,
          prompt: seoPrompt,
          provider: "OPENAI",
        });
        const generatedSeoFields = parseGeneratedSeoFields(
          seoResponse.text?.trim() || "",
        );

        await persistRowPatch(row, {
          altDescription: generatedSeoFields.altDescription,
          altTitle: generatedSeoFields.altTitle,
          contentLength: row.contentLength,
          contentType: row.type,
          generatedContent,
          metaDescription: generatedSeoFields.metaDescription,
          metaTitle: generatedSeoFields.metaTitle,
          status: "Completed",
          title: row.title,
        });

        updateRowById(row.id, {
          altDescription: generatedSeoFields.altDescription,
          altTitle: generatedSeoFields.altTitle,
          generatedContent,
          metaDescription: generatedSeoFields.metaDescription,
          metaTitle: generatedSeoFields.metaTitle,
          status: "Completed",
        });
        if (options?.openModal ?? true) {
          setGenerationModal({
            content: generatedContent,
            error: "",
            isGenerating: false,
            isOpen: true,
            rowId: row.id,
            rowKeyword: row.keyword,
          });
        }
        if (options?.showSuccessToast ?? true) {
          toast.success("Content generated successfully.");
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate content.";

        updateRowById(row.id, { status: "Failed" });
        void persistRowPatch(row, { status: "Failed" });
        if (options?.openModal ?? true) {
          setGenerationModal((current) => ({
            ...current,
            error: message,
            isGenerating: false,
            isOpen: true,
          }));
        }
        throw new Error(message);
      } finally {
        setRowLoadingState(row.id, false);
      }
    },
    [
      buildSeoFieldsPrompt,
      buildGenerationPrompt,
      clientId,
      openGenerationModal,
      persistRowPatch,
      session?.accessToken,
      setRowLoadingState,
      toast,
      updateRowById,
    ],
  );

  const handleGenerateForRow = useCallback(
    async (row: WebsiteContentRow) => {
      if (writingByRowId[row.id]) {
        return;
      }

      try {
        await generateContentForRow(row);
      } catch (error) {
        toast.danger(
          error instanceof Error
            ? error.message
            : "Failed to generate content.",
        );
      }
    },
    [generateContentForRow, toast, writingByRowId],
  );

  const handleGenerateForCluster = useCallback(
    async (row: WebsiteContentRow) => {
      const clusterRows = [row, ...getClusterChildRows(row)];

      if (clusterRows.some((clusterRow) => writingByRowId[clusterRow.id])) {
        return;
      }

      setGenerationModal({
        content: "",
        error: "",
        isGenerating: true,
        isOpen: true,
        rowId: row.id,
        rowKeyword: row.keyword,
      });

      try {
        for (const clusterRow of clusterRows) {
          setGenerationModal((current) => ({
            ...current,
            content: "",
            error: "",
            isGenerating: true,
            rowId: clusterRow.id,
            rowKeyword: clusterRow.keyword,
          }));
          await generateContentForRow(clusterRow, {
            openModal: false,
            showSuccessToast: false,
          });
        }

        const lastRow = clusterRows[clusterRows.length - 1];

        setGenerationModal({
          content: lastRow?.generatedContent || "",
          error: "",
          isGenerating: false,
          isOpen: false,
          rowId: lastRow?.id ?? row.id,
          rowKeyword: lastRow?.keyword ?? row.keyword,
        });
        toast.success("Cluster content generated successfully.");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate cluster content.";

        setGenerationModal((current) => ({
          ...current,
          error: message,
          isGenerating: false,
          isOpen: true,
        }));
        toast.danger(message);
      }
    },
    [generateContentForRow, getClusterChildRows, toast, writingByRowId],
  );

  const handleWriteClick = useCallback(
    (row: WebsiteContentRow) => {
      if (writingByRowId[row.id]) {
        return;
      }

      if (isClusterParentRow(row)) {
        setClusterConfirmRowId(row.id);

        return;
      }

      if (hasExistingGeneratedContent(row)) {
        setOverwriteConfirmRowId(row.id);

        return;
      }

      void handleGenerateForRow(row);
    },
    [
      handleGenerateForRow,
      hasExistingGeneratedContent,
      isClusterParentRow,
      writingByRowId,
    ],
  );

  const overwriteTargetRow = useMemo(
    () =>
      overwriteConfirmRowId
        ? (rows.find((row) => row.id === overwriteConfirmRowId) ?? null)
        : null,
    [overwriteConfirmRowId, rows],
  );
  const clusterTargetRow = useMemo(
    () =>
      clusterConfirmRowId
        ? (rows.find((row) => row.id === clusterConfirmRowId) ?? null)
        : null,
    [clusterConfirmRowId, rows],
  );
  const clusterTargetRows = useMemo(
    () =>
      clusterTargetRow
        ? [clusterTargetRow, ...getClusterChildRows(clusterTargetRow)]
        : [],
    [clusterTargetRow, getClusterChildRows],
  );
  const clusterOverwriteCount = useMemo(
    () => clusterTargetRows.filter(hasExistingGeneratedContent).length,
    [clusterTargetRows, hasExistingGeneratedContent],
  );

  const editContentRow = useMemo(
    () =>
      generationModal.rowId
        ? (rows.find((row) => row.id === generationModal.rowId) ?? null)
        : null,
    [generationModal.rowId, rows],
  );

  useEffect(() => {
    if (
      !generationModal.isOpen ||
      generationModal.isGenerating ||
      !editContentRow
    ) {
      return;
    }

    const editorContent = toEditorHtmlContent(
      generationModal.content || editContentRow.generatedContent || "",
    );
    const articleTitle =
      editContentRow.title?.trim() || toLabelCase(editContentRow.keyword);

    resetEditContentForm({
      altDescription: editContentRow.altDescription?.trim() || "",
      altTitle: editContentRow.altTitle?.trim() || "",
      articleTitle,
      citation: "In-text",
      content: editorContent,
      intent:
        editContentRow.intent && editContentRow.intent !== "-"
          ? editContentRow.intent
          : "Informational",
      keyword: editContentRow.keyword,
      metaDescription: editContentRow.metaDescription?.trim() || "",
      metaTitle: editContentRow.metaTitle?.trim() || articleTitle,
      status: editContentRow.status || "Draft",
    });
  }, [
    editContentRow,
    generationModal.content,
    generationModal.isGenerating,
    generationModal.isOpen,
    resetEditContentForm,
  ]);

  const handleSaveEditedContent = useCallback(
    async (values: EditContentFormValues) => {
      if (!editContentRow) {
        return;
      }

      const validated = await EDIT_CONTENT_SCHEMA.validate(values, {
        abortEarly: false,
        stripUnknown: true,
      });
      const plainContent = stripHtmlToPlainText(validated.content);

      if (!plainContent) {
        throw new Error("Content is required.");
      }

      await persistRowPatch(editContentRow, {
        altDescription: validated.altDescription,
        altTitle: validated.altTitle,
        contentLength: editContentRow.contentLength,
        contentType: editContentRow.type,
        generatedContent: validated.content,
        metaDescription: validated.metaDescription,
        metaTitle: validated.metaTitle,
        status: validated.status,
        title: validated.articleTitle,
      });

      updateRowById(editContentRow.id, {
        altDescription: validated.altDescription,
        altTitle: validated.altTitle,
        generatedContent: validated.content,
        metaDescription: validated.metaDescription,
        metaTitle: validated.metaTitle,
        status: validated.status,
        title: validated.articleTitle,
      });

      setGenerationModal((current) => ({
        ...current,
        content: validated.content,
        error: "",
        isOpen: false,
      }));
      toast.success("Content saved.");
    },
    [editContentRow, persistRowPatch, toast, updateRowById],
  );

  const modalComments = useMemo(
    () =>
      editContentRow?.id ? (commentsByRowId[editContentRow.id] ?? []) : [],
    [commentsByRowId, editContentRow?.id],
  );
  const featuredImage = useMemo(
    () =>
      editContentRow?.id
        ? (featuredImagesByRowId[editContentRow.id] ?? null)
        : null,
    [editContentRow?.id, featuredImagesByRowId],
  );

  const formatCommentAuthor = (comment: WebsiteContentComment) => {
    if (!comment.author) {
      return "User";
    }

    const parts = [comment.author.firstName, comment.author.lastName]
      .map((value) => value?.trim() ?? "")
      .filter(Boolean);

    return parts.join(" ") || "User";
  };

  const formatCommentTime = (value?: string | null) => {
    if (!value) {
      return "-";
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString();
  };

  const refreshEditorState = () => {
    const editor = commentEditorRef.current;

    if (!editor) {
      return;
    }

    setCommentInput(editor.innerText || "");
  };

  const applyEditorCommand = (command: string, value?: string) => {
    const editor = commentEditorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    editor.focus();
    document.execCommand(command, false, value);
    refreshEditorState();
  };

  const handleAttachmentSelection = async (
    fileList: FileList | null,
    options?: { forceImage?: boolean },
  ) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const {
      attachments,
      countExceededFiles,
      oversizedFiles,
      totalSizeExceededFiles,
      unsupportedFiles,
    } = await buildPendingAttachmentsFromFileList(fileList, {
      currentAttachments: pendingAttachments,
      imageOnly: options?.forceImage,
    });

    if (!attachments.length) {
      if (unsupportedFiles.length > 0) {
        toast.warning("Unsupported file type.", {
          description: options?.forceImage
            ? "Please upload image files only."
            : "Please upload a supported file format.",
        });
      }

      if (oversizedFiles.length > 0) {
        toast.warning("File is too large.", {
          description: `Each file must be ${Math.floor(MAX_COMMENT_ATTACHMENT_BYTES / 1024)}KB or less.`,
        });
      }

      if (totalSizeExceededFiles.length > 0) {
        toast.warning("Total attachment size exceeded.", {
          description: `Combined attachments must stay under ${Math.floor(
            MAX_COMMENT_ATTACHMENTS_TOTAL_BYTES / 1024,
          )}KB.`,
        });
      }

      if (countExceededFiles.length > 0) {
        toast.warning("Attachment limit reached.", {
          description: `You can attach up to ${MAX_COMMENT_ATTACHMENTS} files per comment.`,
        });
      }

      return;
    }

    setPendingAttachments((current) => [...current, ...attachments]);

    if (unsupportedFiles.length > 0) {
      toast.warning("Some files were skipped because they are not images.");
    }

    if (oversizedFiles.length > 0) {
      toast.warning("Some files were skipped for size limits.");
    }

    if (totalSizeExceededFiles.length > 0) {
      toast.warning("Some files were skipped because total size is too large.");
    }

    if (countExceededFiles.length > 0) {
      toast.warning(
        "Some files were skipped because attachment limit is reached.",
      );
    }
  };

  const handleAddComment = useCallback(async () => {
    if (!editContentRow || isSendingComment) {
      return;
    }

    const editorHtml = commentEditorRef.current?.innerHTML?.trim() ?? "";
    const message = buildCommentMessage({
      editorHtml,
      pendingAttachments,
      plainText: commentInput,
    });

    if (!message) {
      return;
    }

    const payloadValidation = validateCommentPayloadSize(message);

    if (!payloadValidation.isValid) {
      toast.warning("Comment is too large to send.", {
        description: `Please reduce text or attachments (max ${Math.floor(
          MAX_COMMENT_PAYLOAD_BYTES / 1024,
        )}KB payload).`,
      });

      return;
    }

    setIsSendingComment(true);

    try {
      setCommentAttachmentLibrary((previous) => {
        const next = { ...previous };

        pendingAttachments.forEach((attachment) => {
          if (!attachment.previewUrl && !attachment.dataUrl) {
            return;
          }

          next[attachment.id] = {
            isImage: attachment.isImage,
            mimeType: attachment.mimeType,
            name: attachment.name,
            previewUrl: attachment.dataUrl ?? attachment.previewUrl ?? "",
          };
        });

        return next;
      });

      const createdComment: WebsiteContentComment = {
        author: {
          avatarUrl: session?.user?.avatarUrl ?? null,
          firstName: session?.user?.firstName ?? session?.user?.name ?? "You",
          id: String(session?.user?.id ?? "current-user"),
          lastName: session?.user?.lastName ?? null,
        },
        comment: message,
        createdAt: new Date().toISOString(),
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };

      setCommentsByRowId((current) => ({
        ...current,
        [editContentRow.id]: [
          ...(current[editContentRow.id] ?? []),
          createdComment,
        ],
      }));

      setCommentInput("");
      setPendingAttachments([]);
      if (commentEditorRef.current) {
        commentEditorRef.current.innerHTML = "";
      }
    } finally {
      setIsSendingComment(false);
    }
  }, [
    commentInput,
    editContentRow,
    pendingAttachments,
    session?.user,
    isSendingComment,
  ]);

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!editContentRow) {
        return;
      }

      setIsDeletingCommentId(commentId);
      setCommentsByRowId((current) => ({
        ...current,
        [editContentRow.id]: (current[editContentRow.id] ?? []).filter(
          (comment) => comment.id !== commentId,
        ),
      }));
      setIsDeletingCommentId(null);
    },
    [editContentRow],
  );

  useEffect(() => {
    setCommentInput("");
    setPendingAttachments([]);
    if (commentEditorRef.current) {
      commentEditorRef.current.innerHTML = "";
    }
  }, [editContentRow?.id]);

  const handleFeaturedImageUpload = useCallback(
    (fileList: FileList | null) => {
      if (!editContentRow || !fileList || fileList.length === 0) {
        return;
      }

      const file = fileList[0];

      if (!file.type.startsWith("image/")) {
        toast.danger("Please upload an image file.");

        return;
      }

      const previewUrl = URL.createObjectURL(file);
      const sizeLabel = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

      setFeaturedImagesByRowId((current) => {
        const previous = current[editContentRow.id];

        if (previous?.previewUrl) {
          URL.revokeObjectURL(previous.previewUrl);
        }

        return {
          ...current,
          [editContentRow.id]: {
            name: file.name,
            previewUrl,
            sizeLabel,
          },
        };
      });
    },
    [editContentRow, toast],
  );

  const handleRemoveFeaturedImage = useCallback(() => {
    if (!editContentRow) {
      return;
    }

    setFeaturedImagesByRowId((current) => {
      const previous = current[editContentRow.id];

      if (previous?.previewUrl) {
        URL.revokeObjectURL(previous.previewUrl);
      }

      return {
        ...current,
        [editContentRow.id]: null,
      };
    });
  }, [editContentRow]);

  useEffect(
    () => () => {
      Object.values(featuredImagesByRowId).forEach((item) => {
        if (item?.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    },
    [featuredImagesByRowId],
  );

  const tableColumns: DashboardDataTableColumn<WebsiteContentRow>[] = [
    {
      key: "select",
      label: "",
      className: "w-10 bg-[#F9FAFB] text-[#111827]",
      renderCell: (item) => (
        <Checkbox
          aria-label={`Select ${item.keyword}`}
          isSelected={item.isSelected}
          onValueChange={(isSelected) => {
            updateRowById(item.id, { isSelected });
          }}
        />
      ),
    },
    {
      key: "sv",
      label: "SV",
      className: "bg-[#F9FAFB] text-[#111827]",
      renderCell: (item) => item.sv,
    },
    {
      key: "intent",
      label: "Intent",
      className: "bg-[#F9FAFB] text-[#111827]",
      renderCell: (item) => formatIntentAbbreviation(item.intent),
    },
    {
      key: "keyword",
      label: "Keyword",
      className: "bg-[#F9FAFB] text-[#111827]",
      renderCell: (item) => (
        <div
          className="flex items-center gap-2"
          style={{ paddingLeft: `${item.depth * 16}px` }}
        >
          <GripVertical className="text-[#9CA3AF]" size={14} />
          {item.depth > 0 ? (
            <CornerDownRight className="text-[#9CA3AF]" size={14} />
          ) : null}
          <span className="text-sm text-[#111827]">{item.keyword}</span>
          {item.isPillarArticle ? (
            <Chip
              className="bg-[#DCFCE7] text-[#166534]"
              radius="full"
              size="sm"
            >
              Pillar
            </Chip>
          ) : null}
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      className: "bg-[#F9FAFB] text-[#111827]",
      renderCell: (item) => (
        <Chip className="bg-[#B9EFFF] text-[#0284C7]" radius="full" size="sm">
          {toLabelCase(item.type)}
        </Chip>
      ),
    },
    {
      key: "title",
      label: "Title",
      className: "bg-[#F9FAFB] text-[#111827]",
      renderCell: (item) => item.title || "-",
    },
    {
      key: "contentLength",
      label: "Content Length (Words)",
      className: "bg-[#F9FAFB] text-[#111827]",
      renderCell: (item) => (
        <Select
          aria-label={`Content length for ${item.keyword}`}
          className="min-w-[180px] max-w-[180px]"
          classNames={{
            trigger: "min-h-9 text-sm",
            value: "text-sm",
          }}
          selectedKeys={item.contentLength ? [item.contentLength] : []}
          size="sm"
          variant="bordered"
          onSelectionChange={(keys) => {
            const [selectedKey] =
              keys === "all" ? [] : Array.from(keys).map(String);

            if (!selectedKey) {
              return;
            }

            updateRowById(item.id, { contentLength: selectedKey });
            void persistRowPatch(item, { contentLength: selectedKey }).catch(
              () => {
                // Keep local selection to avoid noisy UX on transient errors.
              },
            );
          }}
        >
          {CONTENT_LENGTH_OPTIONS.map((option) => (
            <SelectItem key={option.value} textValue={option.label}>
              <div className="flex flex-col">
                <span className="text-sm text-[#111827]">{option.label}</span>
                <span className="text-xs text-[#9CA3AF]">
                  {option.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </Select>
      ),
    },
    {
      key: "status",
      label: "Status",
      className: "bg-[#F9FAFB] text-[#111827]",
      renderCell: (item) => (
        <Chip className={statusChipClass(item.status)} radius="full" size="sm">
          {item.status}
        </Chip>
      ),
    },
    {
      key: "action",
      label: "Action",
      className: "bg-[#F9FAFB] text-[#111827]",
      renderCell: (item) => {
        const hasClusterChildren = rows.some(
          (row) => row.parentKeywordId === item.keywordId,
        );
        const isClusterParent = !item.parentKeywordId && hasClusterChildren;
        const actionItems = [
          ...(isClusterParent
            ? [
                {
                  key: "edit-cluster",
                  label: "Edit Cluster",
                  startContent: <Settings size={16} />,
                },
              ]
            : []),
          {
            key: "edit-content",
            label: "Edit Content",
            startContent: <Pencil size={16} />,
          },
          {
            key: "settings",
            label: "Settings",
            startContent: <Settings size={16} />,
          },
          {
            key: "delete",
            label: "Delete",
            startContent: <Trash2 size={16} />,
            className: "text-danger",
            color: "danger" as const,
          },
        ];

        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              isDisabled={Boolean(writingByRowId[item.id])}
              isLoading={Boolean(writingByRowId[item.id])}
              radius="md"
              size="sm"
              variant="bordered"
              onPress={() => {
                handleWriteClick(item);
              }}
            >
              {writingByRowId[item.id]
                ? "Generating..."
                : getWriteButtonLabel(item)}
            </Button>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button isIconOnly radius="md" size="sm" variant="bordered">
                  <EllipsisVertical size={16} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label={`Actions for ${item.keyword}`}
                onAction={(actionKey) => {
                  if (actionKey === "edit-cluster") {
                    toast.info(
                      "Cluster edit mode is available via hierarchy.",
                      {
                        description:
                          "Use drag-and-drop in the keyword column to update this pillar's child cluster structure.",
                      },
                    );

                    return;
                  }

                  if (actionKey === "edit-content") {
                    setGenerationModal({
                      content: item.generatedContent || "",
                      error: "",
                      isGenerating: false,
                      isOpen: true,
                      rowId: item.id,
                      rowKeyword: item.keyword,
                    });

                    return;
                  }

                  if (actionKey === "delete") {
                    void handleDeleteKeyword(item);
                  }
                }}
              >
                {actionItems.map((actionItem) => (
                  <DropdownItem
                    key={actionItem.key}
                    className={actionItem.className}
                    color={actionItem.color}
                    startContent={actionItem.startContent}
                  >
                    {actionItem.label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  const handleSaveWebsiteContentKeywords = async (
    values: WebsiteContentFormValues,
  ) => {
    if (!session?.accessToken) {
      throw new Error("You must be signed in to save keywords.");
    }

    if (!clientId) {
      throw new Error("Client is required.");
    }

    const clusteringEnabled = Boolean(
      draftKeywordPayload?.enableContentClustering ??
        values.enableContentClustering,
    );
    const pillarKeywordId = values.keywords[0]?.id ?? null;

    await keywordContentListsApi.createKeywordContentList(session.accessToken, {
      audience: values.audience || "",
      clientId,
      enableContentClustering: clusteringEnabled,
      keywords: values.keywords.map((item, index) => ({
        contentType: item.contentType || "",
        cpc: item.cpc,
        id: item.id,
        intent: item.intent,
        isPillarArticle: clusteringEnabled && index === 0,
        kd: item.kd,
        keyword: item.keyword,
        parentKeywordId:
          clusteringEnabled && index > 0 && pillarKeywordId
            ? pillarKeywordId
            : null,
        searchVolume: item.searchVolume,
        title: item.title || "",
      })),
      location: draftKeywordPayload?.country || "Website Content",
      topic: values.topic || "",
    });
    await loadSavedKeywords();

    toast.success("Keywords saved successfully.");
  };

  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[270px_1fr]">
        <Card className="border border-default-200 shadow-none">
          <CardHeader className="px-4 pb-2 pt-4">
            <h2 className="text-base font-semibold text-[#1F2937]">
              Total Content
            </h2>
          </CardHeader>
          <CardBody className="px-4 pb-5 pt-1">
            <div className="border-t border-default-200 pt-5">
              <div className="mx-auto mt-2 h-[96px] w-[188px] rounded-t-full border-[12px] border-b-0 border-[#E6EAF7]" />
              <div className="-mt-1 text-center">
                <p className="text-3xl font-semibold leading-tight text-[#1F2937]">
                  {totalUsed}/{totalAllocated}
                </p>
                <p className="text-base text-[#9CA3AF]">Total Content</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-default-200 shadow-none">
          <CardHeader className="flex items-center justify-between px-4 pb-3 pt-4">
            <h2 className="text-base font-semibold text-[#1F2937]">
              Content breakdown
            </h2>
            <Button
              radius="sm"
              size="sm"
              variant="bordered"
              onPress={() => {
                setDraftBreakdown(cloneBreakdown(liveBreakdown));
                setIsBreakdownModalOpen(true);
              }}
            >
              Edit
            </Button>
          </CardHeader>
          <CardBody className="space-y-4 px-4 pb-5 pt-2">
            {liveBreakdown.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-[170px_1fr_auto] items-center gap-3"
              >
                <span className="text-sm text-[#111827]">{item.label}</span>
                <Progress
                  aria-label={item.label}
                  classNames={{
                    indicator: "bg-[#022279]",
                    track: "bg-[#E6EAF7]",
                  }}
                  size="sm"
                  value={
                    item.allocated > 0 ? (item.used / item.allocated) * 100 : 0
                  }
                />
                <span className="text-base font-semibold text-[#1F2937]">
                  {item.used}/{item.allocated}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card className="border border-default-200 shadow-none">
        <CardHeader className="flex flex-col items-start justify-between gap-3 border-b border-default-200 px-4 py-3 md:flex-row md:items-center">
          <h2 className="text-base font-semibold leading-8 text-[#1F2937]">
            Web Content
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              startContent={<SlidersHorizontal size={14} />}
              variant="bordered"
            >
              Filter
            </Button>
            <Button startContent={<ListOrdered size={14} />} variant="bordered">
              Show 10
            </Button>
            <Button startContent={<Columns3 size={14} />} variant="bordered">
              Columns
            </Button>
            <Button
              className="bg-[#022279] text-white"
              startContent={<Plus size={14} />}
              onPress={() => {
                setIsAddKeywordsModalOpen(true);
              }}
            >
              Add Keyword
            </Button>
          </div>
        </CardHeader>

        <CardBody className="px-0 pt-0">
          <div
            className="mx-4 mt-4 rounded-lg border border-dashed border-default-300 bg-[#F8FAFC] px-3 py-2 text-xs text-[#6B7280]"
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const draggedKeywordId =
                event.dataTransfer?.getData("text/plain") || draggingKeywordId;

              void handleMakeKeywordTopLevel(draggedKeywordId || undefined);
              setDraggingKeywordId(null);
              setDragOverKeywordId(null);
            }}
          >
            Drag a keyword here to make it top-level (no parent)
          </div>
          <DashboardDataTable
            showPagination
            ariaLabel="Website content table"
            columns={tableColumns}
            getRowKey={(item) => item.id}
            getRowProps={(item) => ({
              className: `${dragOverKeywordId === item.keywordId ? "bg-[#EEF2FF]" : ""}`,
              draggable: true,
              onDragEnd: () => {
                setDraggingKeywordId(null);
                setDragOverKeywordId(null);
              },
              onDragEnter: (event) => {
                event.preventDefault();

                if (draggingKeywordId && draggingKeywordId !== item.keywordId) {
                  setDragOverKeywordId(item.keywordId);
                }
              },
              onDragLeave: () => {
                if (dragOverKeywordId === item.keywordId) {
                  setDragOverKeywordId(null);
                }
              },
              onDragOver: (event) => {
                event.preventDefault();
              },
              onDragStart: (event) => {
                event.dataTransfer?.setData("text/plain", item.keywordId);
                event.dataTransfer!.effectAllowed = "move";
                setDraggingKeywordId(item.keywordId);
              },
              onDrop: (event) => {
                event.preventDefault();
                const draggedKeywordId =
                  event.dataTransfer?.getData("text/plain") ||
                  draggingKeywordId;

                if (draggedKeywordId) {
                  void handleDropOnKeyword(item, draggedKeywordId);
                }
                setDraggingKeywordId(null);
                setDragOverKeywordId(null);
              },
            })}
            pageSize={10}
            rows={rows}
            title=""
            withShell={false}
          />

          {rows.length === 0 ? (
            <div className="px-4 pb-10 pt-8 text-center">
              <h3 className="text-2xl leading-[1.2] text-[#111827]">
                Lorem ipsum dolor sit amet consectetur.
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-base text-[#6B7280]">
                Lorem ipsum dolor sit amet consectetur. Tincidunt sed tortor eu
                iaculis pulvinar congue hendrerit nibh. Ultrices commodo turpis
                sit etiam auctor.
              </p>
              <div className="mt-8 flex items-center justify-center gap-5">
                <Link href="/dashboard/keyword-research">
                  <Button
                    className="bg-[#022279] text-white"
                    startContent={<Search size={16} />}
                  >
                    Start Keyword Research
                  </Button>
                </Link>
                <span className="text-sm text-[#6B7280]">Or</span>
                <Button
                  className="bg-[#022279] text-white"
                  startContent={<Plus size={16} />}
                  onPress={() => {
                    setIsAddKeywordsModalOpen(true);
                  }}
                >
                  Add Keyword
                </Button>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Modal
        hideCloseButton
        isOpen={isBreakdownModalOpen}
        size="4xl"
        onOpenChange={setIsBreakdownModalOpen}
      >
        <ModalContent>
          <ModalHeader className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">
                Content Breakdown
              </h2>
              <div className="mt-4 space-y-1">
                <p className="text-[20px] font-semibold text-[#111827]">
                  Contents: {TOTAL_CREDITS}{" "}
                  <span className="text-base font-medium text-[#6B7280]">
                    Total Credits
                  </span>
                </p>
                <p className="text-base font-semibold text-[#4B5563]">
                  Allocated: {modalAllocated}
                </p>
                <p className="text-base font-semibold text-[#4B5563]">
                  Unallocated: {modalUnallocated}
                </p>
              </div>
            </div>
            <Button
              isIconOnly
              radius="full"
              size="sm"
              variant="light"
              onPress={() => {
                setIsBreakdownModalOpen(false);
              }}
            >
              <X size={20} />
            </Button>
          </ModalHeader>
          <ModalBody className="pb-5">
            <div className="overflow-hidden rounded-xl border border-default-200">
              <DashboardDataTable
                ariaLabel="Content breakdown table"
                columns={[
                  {
                    key: "label",
                    label: "Location / Client",
                    className: "bg-[#F9FAFB] text-[#111827]",
                    renderCell: (item) => (
                      <span className="text-[#1F2937]">{item.label}</span>
                    ),
                  },
                  {
                    key: "allocated",
                    label: "Allocated",
                    className: "bg-[#F9FAFB] text-[#111827]",
                    renderCell: (item) => (
                      <div className="inline-flex items-center gap-4 rounded-xl border border-default-200 px-3 py-2 text-[#1F2937]">
                        <button
                          className="text-[#9CA3AF]"
                          type="button"
                          onClick={() => {
                            updateAllocated(item.key, -1);
                          }}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="min-w-6 text-center">
                          {item.allocated}
                        </span>
                        <button
                          className="text-[#022279]"
                          type="button"
                          onClick={() => {
                            updateAllocated(item.key, 1);
                          }}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ),
                  },
                  {
                    key: "used",
                    label: "Used",
                    className: "bg-[#F9FAFB] text-[#111827]",
                    renderCell: (item) => (
                      <span className="text-[#1F2937]">{item.used}</span>
                    ),
                  },
                  {
                    key: "remaining",
                    label: "Remaining",
                    className: "bg-[#F9FAFB] text-[#111827]",
                    renderCell: (item) => (
                      <span className="text-[#1F2937]">{item.remaining}</span>
                    ),
                  },
                ]}
                getRowKey={(item) => item.key}
                rows={breakdownRows}
                title=""
                withShell={false}
              />
            </div>

            <div className="pt-2">
              <div className="mb-2 flex items-center justify-between text-[#374151]">
                <span className="text-base font-semibold">Total</span>
                <div className="flex items-center gap-12">
                  <span className="text-base font-semibold">
                    Used {modalUsed}
                  </span>
                  <span className="text-base font-semibold">
                    Remaining {modalRemaining}
                  </span>
                </div>
              </div>
              <Progress
                aria-label="Used content progress"
                classNames={{
                  indicator: "bg-[#022279]",
                  track: "bg-[#E5E7EB]",
                }}
                value={
                  modalAllocated > 0 ? (modalUsed / modalAllocated) * 100 : 0
                }
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                className="bg-[#022279] text-white"
                onPress={async () => {
                  if (!session?.accessToken || !clientId) {
                    toast.danger("Unable to save content breakdown.");

                    return;
                  }

                  try {
                    const response =
                      await keywordContentListsApi.saveClientContentBreakdown(
                        session.accessToken,
                        {
                          clientId,
                          items: liveDraftBreakdown,
                        },
                      );
                    const normalized = normalizeBreakdownItems(response.items);

                    setBreakdown(normalized);
                    setDraftBreakdown(
                      cloneBreakdown(
                        applyUsedCountsToBreakdown(
                          normalized,
                          liveUsedByBreakdownKey,
                        ),
                      ),
                    );
                    setIsBreakdownModalOpen(false);
                    toast.success("Content breakdown saved.");
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Failed to save content breakdown.";

                    toast.danger(message);
                  }
                }}
              >
                Save Changes
              </Button>
              <Button
                variant="bordered"
                onPress={() => {
                  setIsBreakdownModalOpen(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal
        hideCloseButton
        isOpen={Boolean(overwriteTargetRow)}
        size="md"
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOverwriteConfirmRowId(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader className="pb-2">
            <h3 className="text-lg font-semibold text-[#111827]">
              Overwrite Existing Content
            </h3>
          </ModalHeader>
          <ModalBody className="pt-0 text-sm text-[#4B5563]">
            This content already has generated text. Continuing will overwrite
            the existing content. Do you want to proceed?
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              onPress={() => {
                setOverwriteConfirmRowId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#022279] text-white"
              onPress={() => {
                const row = overwriteTargetRow;

                setOverwriteConfirmRowId(null);
                if (!row) {
                  return;
                }

                void handleGenerateForRow(row);
              }}
            >
              Continue
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        hideCloseButton
        isOpen={Boolean(clusterTargetRow)}
        size="md"
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setClusterConfirmRowId(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader className="pb-2">
            <h3 className="text-lg font-semibold text-[#111827]">
              Write Content For This Cluster
            </h3>
          </ModalHeader>
          <ModalBody className="space-y-3 pt-0 text-sm text-[#4B5563]">
            <p>
              This will generate content for the pillar page and{" "}
              {Math.max(clusterTargetRows.length - 1, 0)} child page
              {clusterTargetRows.length - 1 === 1 ? "" : "s"} in this cluster.
            </p>
            <p>
              Existing generated content in these rows will be overwritten.
              {clusterOverwriteCount > 0
                ? ` ${clusterOverwriteCount} row${
                    clusterOverwriteCount === 1 ? "" : "s"
                  } already ${
                    clusterOverwriteCount === 1 ? "has" : "have"
                  } generated content.`
                : ""}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              onPress={() => {
                setClusterConfirmRowId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#022279] text-white"
              onPress={() => {
                const row = clusterTargetRow;

                setClusterConfirmRowId(null);
                if (!row) {
                  return;
                }

                void handleGenerateForCluster(row);
              }}
            >
              Continue
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        hideCloseButton
        isOpen={generationModal.isOpen}
        scrollBehavior="inside"
        size="5xl"
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setGenerationModal((current) => ({
              ...current,
              isOpen: false,
            }));
          }
        }}
      >
        <ModalContent>
          <ModalHeader className="flex items-center justify-between border-b border-default-200 pb-3">
            <h3 className="text-lg font-semibold text-[#111827]">
              Edit Content
            </h3>
            <Button
              isIconOnly
              radius="full"
              size="sm"
              variant="light"
              onPress={() => {
                setGenerationModal((current) => ({
                  ...current,
                  isOpen: false,
                }));
              }}
            >
              <X size={18} />
            </Button>
          </ModalHeader>
          <ModalBody className="pt-4">
            {generationModal.isGenerating ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                <Spinner size="lg" />
                <p className="text-sm font-medium text-[#111827]">
                  Generating content...
                </p>
                <p className="max-w-lg text-xs text-[#6B7280]">
                  Please wait while we generate your content using the selected
                  page type, length, and clustering context.
                </p>
              </div>
            ) : generationModal.error ? (
              <div className="min-h-[180px] rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                {generationModal.error}
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Controller
                      control={editContentControl}
                      name="status"
                      render={({ field }) => (
                        <div className="space-y-1">
                          <label
                            className="text-xs font-medium text-[#374151]"
                            htmlFor="edit-content-status"
                          >
                            Status
                          </label>
                          <Select
                            aria-label="Status"
                            id="edit-content-status"
                            selectedKeys={field.value ? [field.value] : []}
                            size="sm"
                            variant="bordered"
                            onSelectionChange={(keys) => {
                              const [next] =
                                keys === "all"
                                  ? []
                                  : Array.from(keys).map(String);

                              if (next) {
                                field.onChange(next);
                              }
                            }}
                          >
                            {CONTENT_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option}>{option}</SelectItem>
                            ))}
                          </Select>
                        </div>
                      )}
                    />
                    <Controller
                      control={editContentControl}
                      name="keyword"
                      render={({ field }) => (
                        <div className="space-y-1">
                          <label
                            className="text-xs font-medium text-[#374151]"
                            htmlFor="edit-content-keyword"
                          >
                            Keyword
                          </label>
                          <Input
                            {...field}
                            isReadOnly
                            id="edit-content-keyword"
                            size="sm"
                            variant="bordered"
                          />
                        </div>
                      )}
                    />
                    <Controller
                      control={editContentControl}
                      name="intent"
                      render={({ field }) => (
                        <div className="space-y-1">
                          <label
                            className="text-xs font-medium text-[#374151]"
                            htmlFor="edit-content-intent"
                          >
                            Intent
                          </label>
                          <Select
                            aria-label="Intent"
                            id="edit-content-intent"
                            selectedKeys={field.value ? [field.value] : []}
                            size="sm"
                            variant="bordered"
                            onSelectionChange={(keys) => {
                              const [next] =
                                keys === "all"
                                  ? []
                                  : Array.from(keys).map(String);

                              if (next) {
                                field.onChange(next);
                              }
                            }}
                          >
                            {INTENT_OPTIONS.map((option) => (
                              <SelectItem key={option}>{option}</SelectItem>
                            ))}
                          </Select>
                        </div>
                      )}
                    />
                    <Controller
                      control={editContentControl}
                      name="citation"
                      render={({ field }) => (
                        <div className="space-y-1">
                          <label
                            className="text-xs font-medium text-[#374151]"
                            htmlFor="edit-content-citation"
                          >
                            Citation
                          </label>
                          <Select
                            aria-label="Citation"
                            id="edit-content-citation"
                            selectedKeys={field.value ? [field.value] : []}
                            size="sm"
                            variant="bordered"
                            onSelectionChange={(keys) => {
                              const [next] =
                                keys === "all"
                                  ? []
                                  : Array.from(keys).map(String);

                              if (next) {
                                field.onChange(next);
                              }
                            }}
                          >
                            {CITATION_OPTIONS.map((option) => (
                              <SelectItem key={option}>{option}</SelectItem>
                            ))}
                          </Select>
                        </div>
                      )}
                    />
                  </div>

                  <Controller
                    control={editContentControl}
                    name="metaTitle"
                    render={({ field }) => (
                      <div className="space-y-1">
                        <label
                          className="text-xs font-medium text-[#374151]"
                          htmlFor="edit-content-meta-title"
                        >
                          Meta Title
                        </label>
                        <Input
                          {...field}
                          id="edit-content-meta-title"
                          size="sm"
                          variant="bordered"
                        />
                      </div>
                    )}
                  />
                  <Controller
                    control={editContentControl}
                    name="metaDescription"
                    render={({ field }) => (
                      <div className="space-y-1">
                        <label
                          className="text-xs font-medium text-[#374151]"
                          htmlFor="edit-content-meta-description"
                        >
                          Meta Description
                        </label>
                        <Textarea
                          {...field}
                          id="edit-content-meta-description"
                          size="sm"
                          variant="bordered"
                        />
                      </div>
                    )}
                  />
                  <Controller
                    control={editContentControl}
                    name="articleTitle"
                    render={({ field }) => (
                      <div className="space-y-1">
                        <label
                          className="text-xs font-medium text-[#374151]"
                          htmlFor="edit-content-article-title"
                        >
                          Article Title
                        </label>
                        <Input
                          {...field}
                          errorMessage={editContentErrors.articleTitle?.message}
                          id="edit-content-article-title"
                          isInvalid={Boolean(editContentErrors.articleTitle)}
                          size="sm"
                          variant="bordered"
                        />
                      </div>
                    )}
                    rules={{ required: "Article title is required." }}
                  />

                  <div className="space-y-1">
                    <label
                      className="text-sm font-medium text-[#374151]"
                      htmlFor="edit-content-body"
                    >
                      Content
                    </label>
                    <Controller
                      control={editContentControl}
                      name="content"
                      render={({ field }) => (
                        <div className="space-y-1">
                          <RichTextEditor
                            editorId="edit-content-body"
                            minHeightClassName="min-h-[260px]"
                            placeholder="Write generated content..."
                            value={field.value || "<p></p>"}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                          />
                          {editContentErrors.content ? (
                            <p className="text-xs text-danger">
                              {editContentErrors.content.message}
                            </p>
                          ) : null}
                        </div>
                      )}
                      rules={{ required: "Content is required." }}
                    />
                  </div>

                  <div className="space-y-3">
                    <label
                      className="text-sm font-medium text-[#374151]"
                      htmlFor="edit-content-featured-image"
                    >
                      Featured Image
                    </label>
                    <div className="w-[170px] rounded-xl border border-default-200 p-2">
                      <button
                        className="block w-full"
                        type="button"
                        onClick={() => {
                          if (featuredImage?.previewUrl) {
                            setPreviewAttachment({
                              name: featuredImage.name,
                              url: featuredImage.previewUrl,
                            });
                          } else {
                            featuredImageInputRef.current?.click();
                          }
                        }}
                      >
                        {featuredImage?.previewUrl ? (
                          <Image
                            unoptimized
                            alt={featuredImage.name}
                            className="h-24 w-full rounded-lg object-cover"
                            height={96}
                            src={featuredImage.previewUrl}
                            width={160}
                          />
                        ) : (
                          <div className="flex h-24 items-center justify-center rounded-lg bg-[#F3F4F6] text-xs text-[#6B7280]">
                            No image
                          </div>
                        )}
                      </button>
                      {featuredImage ? (
                        <>
                          <p className="mt-2 truncate text-xs text-[#111827]">
                            {featuredImage.name}
                          </p>
                          <p className="text-[11px] text-[#9CA3AF]">
                            {featuredImage.sizeLabel}
                          </p>
                        </>
                      ) : null}
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          isIconOnly
                          radius="full"
                          size="sm"
                          variant="flat"
                          onPress={() => {
                            featuredImageInputRef.current?.click();
                          }}
                        >
                          <ImageIcon size={14} />
                        </Button>
                        <Button
                          isIconOnly
                          isDisabled={!featuredImage}
                          radius="full"
                          size="sm"
                          variant="flat"
                          onPress={handleRemoveFeaturedImage}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <input
                        ref={featuredImageInputRef}
                        accept="image/*"
                        className="hidden"
                        id="edit-content-featured-image"
                        type="file"
                        onChange={(event) => {
                          handleFeaturedImageUpload(event.target.files);
                          event.target.value = "";
                        }}
                      />
                    </div>
                    <Controller
                      control={editContentControl}
                      name="altTitle"
                      render={({ field }) => (
                        <div className="space-y-1">
                          <label
                            className="text-xs font-medium text-[#374151]"
                            htmlFor="edit-content-alt-title"
                          >
                            Alt Title
                          </label>
                          <Input
                            {...field}
                            id="edit-content-alt-title"
                            size="sm"
                            variant="bordered"
                          />
                        </div>
                      )}
                    />
                    <Controller
                      control={editContentControl}
                      name="altDescription"
                      render={({ field }) => (
                        <div className="space-y-1">
                          <label
                            className="text-xs font-medium text-[#374151]"
                            htmlFor="edit-content-alt-description"
                          >
                            Alt Description
                          </label>
                          <Input
                            {...field}
                            id="edit-content-alt-description"
                            size="sm"
                            variant="bordered"
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>

                <div className="flex min-h-[200px] max-h-[800px] flex-col rounded-xl">
                  <div className="border-b border-default-200 pb-3">
                    <h4 className="text-sm font-semibold text-[#111827]">
                      Comments
                    </h4>
                  </div>
                  <div className="flex-1 space-y-4 overflow-y-auto py-3 text-sm text-[#4B5563]">
                    {modalComments.length === 0 ? (
                      <div className="rounded-lg bg-[#F9FAFB] p-3">
                        No comments yet for this content.
                      </div>
                    ) : (
                      modalComments.map((comment) => {
                        const parsedComment = parseCommentAttachments(
                          comment.comment,
                        );
                        const authorName = formatCommentAuthor(comment);
                        const mappedAttachments = parsedComment.attachments.map(
                          (attachment, index) => {
                            const mapped = attachment.id
                              ? (commentAttachmentLibrary[attachment.id] ??
                                null)
                              : null;

                            return {
                              dataUrl: attachment.dataUrl,
                              id: attachment.id ?? `${comment.id}-${index}`,
                              isImage:
                                mapped?.isImage ?? attachment.isImage ?? false,
                              name: attachment.name,
                              previewUrl:
                                attachment.dataUrl ?? mapped?.previewUrl,
                            };
                          },
                        );

                        return (
                          <div
                            key={comment.id}
                            className="border-b border-default-200 p-3"
                          >
                            {parsedComment.richHtml ? (
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeCommentHtml(
                                    parsedComment.richHtml,
                                  ),
                                }}
                                className="prose prose-sm max-w-none text-sm text-[#111827]"
                              />
                            ) : (
                              <p className="whitespace-pre-wrap text-sm text-[#111827]">
                                {parsedComment.body || "Attachment"}
                              </p>
                            )}

                            {mappedAttachments.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {mappedAttachments.map((attachment) => (
                                  <button
                                    key={attachment.id}
                                    className="inline-flex items-center gap-1 rounded-full border border-default-200 bg-[#F9FAFB] px-3 py-1 text-xs text-[#374151]"
                                    type="button"
                                    onClick={() => {
                                      if (
                                        attachment.isImage &&
                                        attachment.previewUrl
                                      ) {
                                        setPreviewAttachment({
                                          name: attachment.name,
                                          url: attachment.previewUrl,
                                        });

                                        return;
                                      }

                                      if (attachment.previewUrl) {
                                        window.open(
                                          attachment.previewUrl,
                                          "_blank",
                                          "noopener,noreferrer",
                                        );

                                        return;
                                      }

                                      toast.warning(
                                        "Attachment is unavailable.",
                                      );
                                    }}
                                  >
                                    <Paperclip size={12} />
                                    <span>{attachment.name}</span>
                                  </button>
                                ))}
                              </div>
                            ) : null}

                            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#6B7280]">
                              <div className="inline-flex items-center gap-2">
                                <Avatar
                                  classNames={{
                                    base: "h-5 w-5 bg-[#F3F4F6] text-[#6B7280] text-[10px]",
                                  }}
                                  name={authorName}
                                  size="sm"
                                  src={resolveServerAssetUrl(
                                    comment.author?.avatarUrl,
                                  )}
                                />
                                <span>{authorName}</span>
                                <span>&bull;</span>
                                <span>
                                  {formatCommentTime(comment.createdAt)}
                                </span>
                              </div>
                              {String(comment.author?.id ?? "") ===
                              String(session?.user?.id ?? "") ? (
                                <Button
                                  isIconOnly
                                  className="text-danger"
                                  isDisabled={
                                    isDeletingCommentId === comment.id
                                  }
                                  radius="full"
                                  size="sm"
                                  variant="light"
                                  onPress={() => {
                                    void handleDeleteComment(comment.id);
                                  }}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="">
                    {pendingAttachments.length > 0 ? (
                      <div className="flex flex-wrap gap-2 px-3 pt-3">
                        {pendingAttachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="inline-flex items-center gap-2 rounded-full border border-default-200 bg-[#F9FAFB] px-3 py-1 text-xs text-[#374151]"
                          >
                            <Paperclip size={12} />
                            <button
                              className="cursor-pointer"
                              type="button"
                              onClick={() => {
                                if (
                                  attachment.isImage &&
                                  attachment.previewUrl
                                ) {
                                  setPreviewAttachment({
                                    name: attachment.name,
                                    url: attachment.previewUrl,
                                  });
                                }
                              }}
                            >
                              {attachment.name}
                            </button>
                            <button
                              className="text-[#9CA3AF] hover:text-[#111827]"
                              type="button"
                              onClick={() => {
                                setPendingAttachments((current) =>
                                  current.filter(
                                    (item) => item.id !== attachment.id,
                                  ),
                                );
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div
                      ref={commentEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="mx-0 mt-3 min-h-[72px] rounded-md border border-default-200 px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#022279]"
                      role="textbox"
                      onInput={(event) => {
                        setCommentInput(event.currentTarget.innerText || "");
                      }}
                    />
                    <div className="mt-3 flex items-center justify-between border-t border-default-200 px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => applyEditorCommand("bold")}
                        >
                          <Bold size={14} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => applyEditorCommand("italic")}
                        >
                          <Italic size={14} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => applyEditorCommand("underline")}
                        >
                          <Underline size={14} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => applyEditorCommand("strikeThrough")}
                        >
                          <Strikethrough size={14} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() =>
                            applyEditorCommand("insertUnorderedList")
                          }
                        >
                          <List size={14} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => {
                            attachmentInputRef.current?.click();
                          }}
                        >
                          <Paperclip size={14} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => {
                            imageInputRef.current?.click();
                          }}
                        >
                          <ImageIcon size={14} />
                        </Button>
                        <input
                          ref={attachmentInputRef}
                          multiple
                          className="hidden"
                          type="file"
                          onChange={(event) => {
                            void handleAttachmentSelection(event.target.files);
                            event.target.value = "";
                          }}
                        />
                        <input
                          ref={imageInputRef}
                          multiple
                          accept="image/*"
                          className="hidden"
                          type="file"
                          onChange={(event) => {
                            void handleAttachmentSelection(event.target.files, {
                              forceImage: true,
                            });
                            event.target.value = "";
                          }}
                        />
                      </div>
                      <Button
                        className="bg-[#022279] text-white"
                        endContent={<SendHorizontal size={14} />}
                        isDisabled={
                          isSendingComment ||
                          (!commentInput.trim() &&
                            pendingAttachments.length === 0)
                        }
                        isLoading={isSendingComment}
                        size="sm"
                        onPress={() => {
                          void handleAddComment();
                        }}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            {!generationModal.isGenerating && !generationModal.error ? (
              <Button
                className="bg-[#022279] text-white"
                isLoading={isSavingEditContent}
                onPress={() => {
                  void handleEditContentSubmit(async (values) => {
                    try {
                      await handleSaveEditedContent(values);
                    } catch (error) {
                      const message =
                        error instanceof Error
                          ? error.message
                          : "Failed to save content.";

                      toast.danger(message);
                    }
                  })();
                }}
              >
                Save
              </Button>
            ) : null}
            <Button
              variant="bordered"
              onPress={() => {
                setGenerationModal((current) => ({
                  ...current,
                  isOpen: false,
                }));
              }}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        hideCloseButton
        isOpen={Boolean(previewAttachment)}
        size="3xl"
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPreviewAttachment(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#111827]">
              {previewAttachment?.name ?? "Image preview"}
            </h3>
            <Button
              isIconOnly
              radius="full"
              size="sm"
              variant="light"
              onPress={() => {
                setPreviewAttachment(null);
              }}
            >
              <X size={18} />
            </Button>
          </ModalHeader>
          <ModalBody>
            {previewAttachment?.url ? (
              <Image
                unoptimized
                alt={previewAttachment.name}
                className="h-auto max-h-[70vh] w-full rounded-lg object-contain"
                height={900}
                src={previewAttachment.url}
                width={1400}
              />
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>

      <AddWebsiteContentKeywordsModal
        isOpen={isAddKeywordsModalOpen}
        onNext={async (payload) => {
          if (!session?.accessToken) {
            throw new Error("Session expired. Please login again.");
          }

          const response = await keywordResearchApi.getKeywordOverview(
            session.accessToken,
            {
              clientId,
              countryIsoCode: payload.countryIsoCode,
              forceRefresh: true,
              keywords: payload.keywords,
              languageCode: payload.languageCode,
              languageName: payload.language,
              locationCode: payload.locationCode,
            },
          );
          const keywordDetails: KeywordResearchItem[] = response.keywords;

          const detailMap = new Map(
            keywordDetails.map((item) => [item.keyword.toLowerCase(), item]),
          );
          const mappedKeywords: WebsiteContentKeywordItem[] =
            payload.keywords.map((keyword, index) => {
              const matched = detailMap.get(keyword.toLowerCase());

              return {
                cpc: matched?.cpc ?? null,
                id: matched?.id ?? `${Date.now()}-${index}`,
                intent: matched?.intent ?? null,
                kd: matched?.kd ?? null,
                keyword,
                searchVolume: matched?.searchVolume ?? null,
              };
            });

          setDraftKeywordPayload(payload);
          setWebsiteContentKeywords(mappedKeywords);
          setIsAddKeywordsModalOpen(false);
          setIsWebsiteContentKeywordsModalOpen(true);
        }}
        onOpenChange={setIsAddKeywordsModalOpen}
      />

      <WebsiteContentKeywordsModal
        isOpen={isWebsiteContentKeywordsModalOpen}
        keywords={websiteContentKeywords}
        selectedClientId={clientId}
        selectedLocation={draftKeywordPayload?.country}
        onOpenChange={setIsWebsiteContentKeywordsModalOpen}
        onPrevStep={() => {
          setIsWebsiteContentKeywordsModalOpen(false);
          setIsAddKeywordsModalOpen(true);
        }}
        onSubmit={handleSaveWebsiteContentKeywords}
      />
    </div>
  );
};
