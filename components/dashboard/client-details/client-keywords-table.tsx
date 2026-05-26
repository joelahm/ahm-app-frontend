"use client";

import type { Selection } from "@react-types/shared";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
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
import { Select, SelectItem } from "@heroui/select";
import {
  Columns3,
  Download,
  Filter,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import {
  ImportKeywordsModal,
  type ImportedKeywordRow,
} from "@/components/dashboard/client-details/import-keywords-modal";
import { AddClientKeywordModal } from "@/components/dashboard/client-details/add-client-keyword-modal";
import {
  clientsApi,
  type ClientKeyword,
  type ClientKeywordProvider,
  type ClientKeywordTitleStatus,
} from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { useAppToast } from "@/hooks/use-app-toast";
import { WEB_CONTENT_TYPE_OPTIONS } from "@/lib/web-content-types";
import {
  getClientKeywordsSocketClient,
  type ClientKeywordTitleProgressEvent,
} from "@/lib/client-keywords-socket-client";

type KeywordStatus = "" | "Approve" | "Rejected" | "Archived";
type KeywordUseIn = "Local Ranking" | "Web content";

type ClientKeywordRow = {
  contentType: string;
  cpcUsd: number | null;
  generatedTitle: string;
  id: string;
  keyword: string;
  keywordDifficulty: number | null;
  note: string;
  provider: ClientKeywordProvider | null;
  searchIntent: string;
  searchVolume: number | null;
  serp: string;
  status: KeywordStatus;
  titleError: string;
  titleStatus: ClientKeywordTitleStatus;
  useIn: KeywordUseIn[];
};

interface ClientKeywordsTableProps {
  clientId: number | string;
}

const statusOptions: Exclude<KeywordStatus, "">[] = [
  "Approve",
  "Rejected",
  "Archived",
];
const useInOptions: KeywordUseIn[] = ["Local Ranking", "Web content"];
const statusRowClassNames: Record<Exclude<KeywordStatus, "">, string> = {
  Approve: "bg-[#ECFDF3] [&>td]:bg-[#ECFDF3] hover:[&>td]:bg-[#D1FADF]",
  Archived: "bg-[#F3F4F6] [&>td]:bg-[#F3F4F6] hover:[&>td]:bg-[#E5E7EB]",
  Rejected: "bg-[#FEF3F2] [&>td]:bg-[#FEF3F2] hover:[&>td]:bg-[#FEE4E2]",
};
const statusFilterOptions: Array<{
  key: KeywordStatus | "all";
  label: string;
}> = [
  { key: "all", label: "All statuses" },
  { key: "", label: "No status" },
  ...statusOptions.map((status) => ({ key: status, label: status })),
];
const providerFilterOptions: Array<{
  key: ClientKeywordProvider | "all" | "none";
  label: string;
}> = [
  { key: "all", label: "All sources" },
  { key: "DATAFORSEO", label: "DataForSEO" },
  { key: "SE_RANKING", label: "SE Ranking" },
  { key: "none", label: "No source" },
];
const searchVolumeFilterOptions = [
  { key: "all", label: "All search volumes" },
  { key: "100001:", label: "100,001+" },
  { key: "10001:100000", label: "10,001-100,000" },
  { key: "1001:10000", label: "1,001-10,000" },
  { key: "101:1000", label: "101-1,000" },
  { key: "11:100", label: "11-100" },
  { key: "1:10", label: "1-10" },
  { key: "custom", label: "Custom" },
];
const keywordDifficultyFilterOptions = [
  { key: "all", label: "All difficulties" },
  { key: "85:100", label: "Very hard (85-100%)" },
  { key: "70:84", label: "Hard (70-84%)" },
  { key: "50:69", label: "Difficult (50-69%)" },
  { key: "30:49", label: "Possible (30-49%)" },
  { key: "15:29", label: "Easy (15-29%)" },
  { key: "0:14", label: "Very easy (0-14%)" },
  { key: "custom", label: "Custom" },
];
const cpcFilterOptions = [
  { key: "all", label: "All CPC" },
  { key: "10:", label: "$10+" },
  { key: "5:9.99", label: "$5-$9.99" },
  { key: "1:4.99", label: "$1-$4.99" },
  { key: ":0.99", label: "Up to $0.99" },
  { key: "custom", label: "Custom" },
];

const lockedColumnKeys = new Set(["selection", "keyword", "action"]);
const formatNumber = (value: number | null) =>
  value === null ? "-" : new Intl.NumberFormat("en-US").format(value);
const formatCurrency = (value: number | null) =>
  value === null ? "-" : `$${value.toFixed(2)}`;
const getAppliedNumericFilterValue = (
  selectedValue: string,
  customFrom: string,
  customTo: string,
) => {
  if (selectedValue === "custom") {
    const from = customFrom.trim();
    const to = customTo.trim();

    return from || to ? `${from}:${to}` : "";
  }

  return selectedValue === "all" ? "" : selectedValue;
};
const parseNumericRange = (value: string) => {
  if (!value) {
    return { max: null, min: null };
  }

  const [minValue = "", maxValue = ""] = value.split(":");
  const min = minValue ? Number(minValue) : null;
  const max = maxValue ? Number(maxValue) : null;

  return {
    max: Number.isFinite(max) ? max : null,
    min: Number.isFinite(min) ? min : null,
  };
};
const matchesNumericRange = (
  value: number | null,
  range: { max: number | null; min: number | null },
) =>
  range.min === null && range.max === null
    ? true
    : value !== null &&
      (range.min === null || value >= range.min) &&
      (range.max === null || value <= range.max);
const escapeCsvValue = (value: unknown) => {
  const stringValue = String(value ?? "");

  return /[",\n]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue;
};

const normalizeKeywordUseIn = (value?: string[] | null): KeywordUseIn[] =>
  Array.isArray(value)
    ? value.filter((item): item is KeywordUseIn =>
        useInOptions.includes(item as KeywordUseIn),
      )
    : [];

const normalizeKeywordStatus = (value?: string | null): KeywordStatus => {
  const matchedStatus = statusOptions.find(
    (status) => status.toLowerCase() === String(value ?? "").toLowerCase(),
  );

  return matchedStatus ?? "";
};

const mapApiKeyword = (keyword: ClientKeyword): ClientKeywordRow => ({
  contentType: keyword.contentType ?? "",
  cpcUsd: keyword.cpcUsd,
  generatedTitle: keyword.generatedTitle ?? "",
  id: keyword.id,
  keyword: keyword.keyword,
  keywordDifficulty: keyword.keywordDifficulty,
  note: keyword.note,
  provider: keyword.provider ?? null,
  searchIntent: keyword.searchIntent,
  searchVolume: keyword.searchVolume,
  serp: keyword.serp,
  status: normalizeKeywordStatus(keyword.status),
  titleError: keyword.titleError ?? "",
  titleStatus: keyword.titleStatus ?? "IDLE",
  useIn: normalizeKeywordUseIn(keyword.useIn),
});

export const ClientKeywordsTable = ({ clientId }: ClientKeywordsTableProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [rows, setRows] = useState<ClientKeywordRow[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [cpcFilter, setCpcFilter] = useState("all");
  const [customCpcFrom, setCustomCpcFrom] = useState("");
  const [customCpcTo, setCustomCpcTo] = useState("");
  const [customKeywordDifficultyFrom, setCustomKeywordDifficultyFrom] =
    useState("");
  const [customKeywordDifficultyTo, setCustomKeywordDifficultyTo] =
    useState("");
  const [customSearchVolumeFrom, setCustomSearchVolumeFrom] = useState("");
  const [customSearchVolumeTo, setCustomSearchVolumeTo] = useState("");
  const [keywordDifficultyFilter, setKeywordDifficultyFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState<
    ClientKeywordProvider | "all" | "none"
  >("all");
  const [searchVolumeFilter, setSearchVolumeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<KeywordStatus | "all">(
    "all",
  );
  const [useInFilter, setUseInFilter] = useState<KeywordUseIn | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteCandidate, setDeleteCandidate] =
    useState<ClientKeywordRow | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(
    () =>
      new Set([
        "selection",
        "keyword",
        "useIn",
        "contentType",
        "searchVolume",
        "keywordDifficulty",
        "searchIntent",
        "serp",
        "cpcUsd",
        "provider",
        "status",
        "note",
        "action",
      ]),
  );

  useEffect(() => {
    if (!session?.accessToken || !clientId) {
      setRows([]);

      return;
    }

    let isMounted = true;

    const loadKeywords = async () => {
      try {
        setIsLoading(true);
        const accessToken = await getValidAccessToken();
        const response = await clientsApi.getClientKeywords(
          accessToken,
          clientId,
        );

        if (!isMounted) {
          return;
        }

        setRows(response.keywords.map(mapApiKeyword));
        setSelectedKeys(new Set([]));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        toast.danger("Failed to load keywords.", {
          description:
            error instanceof Error
              ? error.message
              : "Please refresh and try again.",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadKeywords();

    return () => {
      isMounted = false;
    };
  }, [clientId, getValidAccessToken, session?.accessToken, toast]);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    const socket = getClientKeywordsSocketClient();

    if (!socket) {
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("client-keywords:subscribe", { clientId });

    const handleProgress = (event: ClientKeywordTitleProgressEvent) => {
      setRows((current) =>
        current.map((row) =>
          row.id === event.keywordId
            ? {
                ...row,
                titleStatus: event.titleStatus,
                generatedTitle:
                  event.titleStatus === "COMPLETED"
                    ? event.generatedTitle
                    : row.generatedTitle,
                titleError:
                  event.titleStatus === "FAILED" ? event.titleError : "",
              }
            : row,
        ),
      );
    };

    socket.on("client-keyword:title-progress", handleProgress);

    return () => {
      socket.off("client-keyword:title-progress", handleProgress);
      socket.emit("client-keywords:unsubscribe", { clientId });
    };
  }, [clientId]);

  const updateRow = useCallback(
    (keywordId: string, patch: Partial<ClientKeywordRow>) => {
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === keywordId ? { ...row, ...patch } : row,
        ),
      );
    },
    [],
  );

  const saveKeywordPatch = useCallback(
    async (keywordId: string, patch: Partial<ClientKeyword>) => {
      if (!session?.accessToken) {
        toast.danger("Your session has expired.", {
          description: "Please sign in again.",
        });

        return;
      }

      try {
        const accessToken = await getValidAccessToken();
        const response = await clientsApi.updateClientKeyword(
          accessToken,
          clientId,
          keywordId,
          patch,
        );

        setRows(response.keywords.map(mapApiKeyword));
      } catch (error) {
        toast.danger("Failed to update keyword.", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    },
    [clientId, getValidAccessToken, session?.accessToken, toast],
  );

  const handleBulkUpdate = useCallback(
    async (patch: {
      contentType?: string;
      useIn?: string[];
      status?: string;
    }) => {
      const selectedIds =
        selectedKeys === "all"
          ? rows.map((row) => row.id)
          : Array.from(selectedKeys).map(String);

      if (!selectedIds.length) {
        return;
      }

      if (!session?.accessToken) {
        toast.danger("Your session has expired.", {
          description: "Please sign in again.",
        });

        return;
      }

      setIsBulkUpdating(true);

      try {
        const accessToken = await getValidAccessToken();
        const response = await clientsApi.bulkUpdateClientKeywords(
          accessToken,
          clientId,
          selectedIds,
          patch,
        );

        setRows(response.keywords.map(mapApiKeyword));
        toast.success(
          `Updated ${response.updatedCount} keyword${
            response.updatedCount === 1 ? "" : "s"
          }.`,
        );
      } catch (error) {
        toast.danger("Failed to update keywords.", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setIsBulkUpdating(false);
      }
    },
    [
      clientId,
      getValidAccessToken,
      rows,
      selectedKeys,
      session?.accessToken,
      toast,
    ],
  );

  const handleGenerateTitles = useCallback(
    async (keywordIds: string[]) => {
      if (!keywordIds.length) {
        return;
      }

      const targetRows = rows.filter((row) => keywordIds.includes(row.id));
      const missingContentType = targetRows.find(
        (row) => !row.contentType.trim(),
      );

      if (missingContentType) {
        toast.danger("Content type is required before generating a title.", {
          description: `Select a content type for "${missingContentType.keyword}" first.`,
        });

        return;
      }

      if (!session?.accessToken) {
        toast.danger("Your session has expired.", {
          description: "Please sign in again.",
        });

        return;
      }

      setIsGeneratingTitles(true);

      try {
        const accessToken = await getValidAccessToken();
        const response = await clientsApi.generateClientKeywordTitles(
          accessToken,
          clientId,
          keywordIds,
        );

        setRows(response.keywords.map(mapApiKeyword));
        toast.success(
          `Generating ${response.queuedCount} title${
            response.queuedCount === 1 ? "" : "s"
          }...`,
        );
      } catch (error) {
        toast.danger("Failed to start title generation.", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setIsGeneratingTitles(false);
      }
    },
    [clientId, getValidAccessToken, rows, session?.accessToken, toast],
  );

  const toggleKeywordSelection = useCallback(
    (keywordId: string, isSelected: boolean) => {
      setSelectedKeys((current) => {
        const next =
          current === "all"
            ? new Set(rows.map((row) => row.id))
            : new Set(Array.from(current).map(String));

        if (isSelected) {
          next.add(keywordId);
        } else {
          next.delete(keywordId);
        }

        return next;
      });
    },
    [rows],
  );

  const columns = useMemo<DashboardDataTableColumn<ClientKeywordRow>[]>(
    () => [
      {
        className: "w-12",
        key: "selection",
        label: "Select",
        renderCell: (item) => (
          <Checkbox
            aria-label={`Select ${item.keyword}`}
            isSelected={
              selectedKeys === "all" ||
              Array.from(selectedKeys).map(String).includes(item.id)
            }
            onValueChange={(isSelected) =>
              toggleKeywordSelection(item.id, isSelected)
            }
          />
        ),
      },
      {
        key: "keyword",
        label: "Keyword",
        renderCell: (item) => (
          <span className="font-semibold text-[#111827]">{item.keyword}</span>
        ),
      },
      {
        key: "useIn",
        label: "Use In",
        renderCell: (item) => (
          <Select
            aria-label={`Use in for ${item.keyword}`}
            className="min-w-[180px]"
            classNames={{
              innerWrapper: "items-start",
              trigger: "h-auto min-h-9 py-1.5",
              value: "whitespace-normal",
            }}
            placeholder="Select"
            radius="sm"
            renderValue={(items) => (
              <div className="flex flex-wrap gap-1">
                {items.map((selectedItem) => (
                  <Chip
                    key={selectedItem.key}
                    classNames={{ content: "text-[11px]" }}
                    radius="full"
                    size="sm"
                  >
                    {selectedItem.key}
                  </Chip>
                ))}
              </div>
            )}
            selectedKeys={new Set(item.useIn)}
            selectionMode="multiple"
            size="sm"
            onSelectionChange={(keys) => {
              const nextUseIn =
                keys === "all"
                  ? useInOptions
                  : Array.from(keys)
                      .map(String)
                      .filter((value): value is KeywordUseIn =>
                        useInOptions.includes(value as KeywordUseIn),
                      );

              updateRow(item.id, { useIn: nextUseIn });
              void saveKeywordPatch(item.id, { useIn: nextUseIn });
            }}
          >
            {useInOptions.map((option) => (
              <SelectItem key={option}>{option}</SelectItem>
            ))}
          </Select>
        ),
      },
      {
        key: "contentType",
        label: "Content Type",
        renderCell: (item) => (
          <Select
            aria-label={`Content type for ${item.keyword}`}
            className="min-w-[200px]"
            placeholder="Select content type"
            radius="sm"
            selectedKeys={item.contentType ? [item.contentType] : []}
            size="sm"
            onSelectionChange={(keys) => {
              const nextContentType =
                keys === "all"
                  ? item.contentType
                  : String(keys.currentKey ?? "");

              updateRow(item.id, { contentType: nextContentType });
              void saveKeywordPatch(item.id, {
                contentType: nextContentType,
              });
            }}
          >
            {WEB_CONTENT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option}>{option}</SelectItem>
            ))}
          </Select>
        ),
      },
      {
        key: "searchVolume",
        label: "Search volume",
        renderCell: (item) => formatNumber(item.searchVolume),
      },
      {
        key: "keywordDifficulty",
        label: "Keyword Difficulty",
        renderCell: (item) => formatNumber(item.keywordDifficulty),
      },
      {
        key: "searchIntent",
        label: "Search Intent",
        renderCell: (item) => item.searchIntent || "-",
      },
      {
        key: "serp",
        label: "SERP",
        renderCell: (item) => item.serp || "-",
      },
      {
        key: "cpcUsd",
        label: "CPC(USD)",
        renderCell: (item) => formatCurrency(item.cpcUsd),
      },
      {
        key: "provider",
        label: "Source",
        renderCell: (item) => {
          if (!item.provider) {
            return <span className="text-xs text-default-400">-</span>;
          }

          const isDataForSeo = item.provider === "DATAFORSEO";

          return (
            <Chip
              classNames={{
                base: isDataForSeo
                  ? "bg-[#DBEAFE] text-[#1D4ED8]"
                  : "bg-[#EDE9FE] text-[#6D28D9]",
                content: "text-[10px] font-medium",
              }}
              radius="full"
              size="sm"
            >
              {isDataForSeo ? "DFS" : "SER"}
            </Chip>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        renderCell: (item) => (
          <Select
            aria-label={`Status for ${item.keyword}`}
            className="min-w-[150px]"
            disallowEmptySelection={false}
            placeholder="Select status"
            radius="sm"
            selectedKeys={item.status ? [item.status] : []}
            size="sm"
            onSelectionChange={(keys) => {
              const selectedStatus = normalizeKeywordStatus(
                keys === "all" ? item.status : String(keys.currentKey ?? ""),
              );

              updateRow(item.id, { status: selectedStatus });
              void saveKeywordPatch(item.id, { status: selectedStatus });
            }}
          >
            {statusOptions.map((status) => (
              <SelectItem key={status}>{status}</SelectItem>
            ))}
          </Select>
        ),
      },
      {
        key: "note",
        label: "Note",
        renderCell: (item) => (
          <Input
            aria-label={`Note for ${item.keyword}`}
            className="min-w-[220px]"
            placeholder="Add note"
            radius="sm"
            size="sm"
            value={item.note}
            variant="bordered"
            onBlur={(event) => {
              void saveKeywordPatch(item.id, {
                note: event.currentTarget.value,
              });
            }}
            onValueChange={(value) => updateRow(item.id, { note: value })}
          />
        ),
      },
      {
        key: "action",
        label: "Action",
        renderCell: (item) => (
          <Button
            isIconOnly
            aria-label={`Delete ${item.keyword}`}
            className="text-danger"
            radius="full"
            size="sm"
            variant="light"
            onPress={() => setDeleteCandidate(item)}
          >
            <Trash2 size={16} />
          </Button>
        ),
      },
    ],
    [saveKeywordPatch, selectedKeys, toggleKeywordSelection, updateRow],
  );

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleColumnKeys.has(column.key)),
    [columns, visibleColumnKeys],
  );

  const contentTypeFilterOptions = useMemo(
    () =>
      Array.from(
        rows.reduce<Map<string, string>>((acc, row) => {
          const contentType = row.contentType.trim();

          if (contentType) {
            acc.set(contentType, contentType);
          }

          return acc;
        }, new Map()),
      )
        .map(([key, label]) => ({ key, label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [rows],
  );
  const appliedCpcFilter = getAppliedNumericFilterValue(
    cpcFilter,
    customCpcFrom,
    customCpcTo,
  );
  const appliedKeywordDifficultyFilter = getAppliedNumericFilterValue(
    keywordDifficultyFilter,
    customKeywordDifficultyFrom,
    customKeywordDifficultyTo,
  );
  const appliedSearchVolumeFilter = getAppliedNumericFilterValue(
    searchVolumeFilter,
    customSearchVolumeFrom,
    customSearchVolumeTo,
  );
  const hasActiveFilters =
    Boolean(appliedCpcFilter) ||
    Boolean(appliedKeywordDifficultyFilter) ||
    Boolean(appliedSearchVolumeFilter) ||
    contentTypeFilter !== "all" ||
    providerFilter !== "all" ||
    statusFilter !== "all" ||
    useInFilter !== "all";

  const resetFilters = () => {
    setContentTypeFilter("all");
    setCpcFilter("all");
    setCustomCpcFrom("");
    setCustomCpcTo("");
    setCustomKeywordDifficultyFrom("");
    setCustomKeywordDifficultyTo("");
    setCustomSearchVolumeFrom("");
    setCustomSearchVolumeTo("");
    setKeywordDifficultyFilter("all");
    setProviderFilter("all");
    setSearchVolumeFilter("all");
    setStatusFilter("all");
    setUseInFilter("all");
    setCurrentPage(1);
  };

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const cpcRange = parseNumericRange(appliedCpcFilter);
    const keywordDifficultyRange = parseNumericRange(
      appliedKeywordDifficultyFilter,
    );
    const searchVolumeRange = parseNumericRange(appliedSearchVolumeFilter);

    return rows.filter((row) => {
      const matchesContentType =
        contentTypeFilter === "all" ||
        (contentTypeFilter === "none" && !row.contentType) ||
        row.contentType === contentTypeFilter;
      const matchesProvider =
        providerFilter === "all" ||
        (providerFilter === "none" && !row.provider) ||
        row.provider === providerFilter;
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;
      const matchesUseIn =
        useInFilter === "all" || row.useIn.includes(useInFilter);
      const matchesCpc = matchesNumericRange(row.cpcUsd, cpcRange);
      const matchesKeywordDifficulty = matchesNumericRange(
        row.keywordDifficulty,
        keywordDifficultyRange,
      );
      const matchesSearchVolume = matchesNumericRange(
        row.searchVolume,
        searchVolumeRange,
      );
      const haystack = [
        row.keyword,
        row.useIn.join(" "),
        row.contentType,
        row.searchIntent,
        row.serp,
        row.provider ?? "",
        row.status,
        row.note,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesContentType &&
        matchesCpc &&
        matchesKeywordDifficulty &&
        matchesProvider &&
        matchesSearchVolume &&
        matchesStatus &&
        matchesUseIn &&
        (!query || haystack.includes(query))
      );
    });
  }, [
    appliedCpcFilter,
    appliedKeywordDifficultyFilter,
    appliedSearchVolumeFilter,
    contentTypeFilter,
    providerFilter,
    rows,
    searchValue,
    statusFilter,
    useInFilter,
  ]);

  const selectedKeywordRows = useMemo(() => {
    const selectedRowIds =
      selectedKeys === "all"
        ? new Set(filteredRows.map((row) => row.id))
        : new Set(Array.from(selectedKeys).map(String));

    return filteredRows.filter((row) => selectedRowIds.has(row.id));
  }, [filteredRows, selectedKeys]);
  const selectedKeywordCount = selectedKeywordRows.length;

  const handleExportCsv = useCallback(() => {
    const headers = [
      "Keyword",
      "Use In",
      "Search volume",
      "Keyword Difficulty",
      "Search Intent",
      "SERP",
      "CPC(USD)",
      "Status",
      "Note",
    ];
    const csvRows = [
      headers.join(","),
      ...filteredRows.map((row) =>
        [
          escapeCsvValue(row.keyword),
          escapeCsvValue(row.useIn.join(", ")),
          row.searchVolume ?? "",
          row.keywordDifficulty ?? "",
          escapeCsvValue(row.searchIntent),
          escapeCsvValue(row.serp),
          row.cpcUsd ?? "",
          escapeCsvValue(row.status),
          escapeCsvValue(row.note),
        ].join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF", csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `client-keywords-${clientId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  }, [clientId, filteredRows, toast]);

  const handleImportKeywords = async (importedRows: ImportedKeywordRow[]) => {
    if (!session?.accessToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const nextRows: ClientKeyword[] = importedRows.map((row, index) => {
      const normalizedStatus =
        statusOptions.find(
          (status) => status.toLowerCase() === row.status.toLowerCase(),
        ) ?? "";

      return {
        ...row,
        contentType: "",
        generatedTitle: "",
        id: `${Date.now()}-${index}`,
        provider: null,
        status: normalizedStatus,
        titleError: "",
        titleStatus: "IDLE",
        useIn: normalizeKeywordUseIn(row.useIn),
      };
    });

    setIsImporting(true);

    try {
      const accessToken = await getValidAccessToken();
      const response = await clientsApi.importClientKeywords(
        accessToken,
        clientId,
        nextRows,
      );

      setRows(response.keywords.map(mapApiKeyword));
      setSelectedKeys(new Set([]));
      setCurrentPage(1);
      toast.success("Keywords imported.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteKeyword = async () => {
    if (!deleteCandidate) {
      return;
    }

    if (!session?.accessToken) {
      toast.danger("Your session has expired.", {
        description: "Please sign in again.",
      });

      return;
    }

    setIsDeleting(true);

    try {
      const accessToken = await getValidAccessToken();
      const response = await clientsApi.deleteClientKeyword(
        accessToken,
        clientId,
        deleteCandidate.id,
      );

      setRows(response.keywords.map(mapApiKeyword));
      setSelectedKeys(new Set([]));
      setDeleteCandidate(null);
      toast.success("Keyword deleted.");
    } catch (error) {
      toast.danger("Failed to delete keyword.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteKeywords = async () => {
    const selectedIds = selectedKeywordRows.map((row) => row.id);

    if (!selectedIds.length) {
      return;
    }

    if (!session?.accessToken) {
      toast.danger("Your session has expired.", {
        description: "Please sign in again.",
      });

      return;
    }

    setIsDeleting(true);

    try {
      const accessToken = await getValidAccessToken();
      const response = await clientsApi.deleteClientKeywords(
        accessToken,
        clientId,
        selectedIds,
      );

      setRows(response.keywords.map(mapApiKeyword));
      setSelectedKeys(new Set([]));
      setIsBulkDeleteConfirmOpen(false);
      toast.success("Keywords deleted.");
    } catch (error) {
      toast.danger("Failed to delete keywords.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DashboardDataTable
        disableZebraRows
        showPagination
        ariaLabel={`Client ${clientId} keywords`}
        columns={visibleColumns}
        currentPage={currentPage}
        emptyContent="No keywords found."
        getRowKey={(item) => item.id}
        getRowProps={(item) => ({
          className: item.status ? statusRowClassNames[item.status] : "",
        })}
        headerRight={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            {selectedKeywordCount > 0 ? (
              <>
                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <Button
                      isDisabled={isBulkUpdating}
                      isLoading={isBulkUpdating}
                      radius="sm"
                      variant="bordered"
                    >
                      Set Content Type ({selectedKeywordCount})
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Bulk set content type"
                    items={WEB_CONTENT_TYPE_OPTIONS.map((option) => ({
                      key: option,
                      label: option,
                    }))}
                    onAction={(key) => {
                      void handleBulkUpdate({ contentType: String(key) });
                    }}
                  >
                    {(item) => (
                      <DropdownItem key={item.key}>{item.label}</DropdownItem>
                    )}
                  </DropdownMenu>
                </Dropdown>
                <Button
                  isDisabled={isGeneratingTitles}
                  isLoading={isGeneratingTitles}
                  radius="sm"
                  startContent={<Sparkles size={14} />}
                  variant="bordered"
                  onPress={() =>
                    void handleGenerateTitles(
                      selectedKeywordRows.map((row) => row.id),
                    )
                  }
                >
                  Generate Titles ({selectedKeywordCount})
                </Button>
              </>
            ) : null}
            <Button
              className="border-danger-200 text-danger"
              isDisabled={!selectedKeywordCount || isDeleting}
              radius="sm"
              startContent={<Trash2 size={14} />}
              variant="bordered"
              onPress={() => setIsBulkDeleteConfirmOpen(true)}
            >
              Delete
            </Button>
            <Button
              isDisabled={!filteredRows.length}
              radius="sm"
              startContent={<Download size={14} />}
              variant="bordered"
              onPress={handleExportCsv}
            >
              Export
            </Button>
            <Dropdown closeOnSelect={false} placement="bottom-end">
              <DropdownTrigger>
                <Button
                  color={hasActiveFilters ? "primary" : "default"}
                  radius="sm"
                  startContent={<Filter size={14} />}
                  variant={hasActiveFilters ? "flat" : "bordered"}
                >
                  Filter
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Keyword filters"
                className="w-72 min-w-72"
              >
                <DropdownItem key="use-in-filter" textValue="Use In filter">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#4B5563]">
                      Use In
                    </p>
                    <select
                      className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                      value={useInFilter}
                      onChange={(event) => {
                        setUseInFilter(
                          event.target.value as KeywordUseIn | "all",
                        );
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">All uses</option>
                      {useInOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </DropdownItem>
                <DropdownItem
                  key="content-type-filter"
                  textValue="Content Type filter"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#4B5563]">
                      Content Type
                    </p>
                    <select
                      className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                      value={contentTypeFilter}
                      onChange={(event) => {
                        setContentTypeFilter(event.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">All content types</option>
                      <option value="none">No content type</option>
                      {contentTypeFilterOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </DropdownItem>
                <DropdownItem
                  key="search-volume-filter"
                  textValue="Search Volume filter"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#4B5563]">
                      Search Volume
                    </p>
                    <select
                      className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                      value={searchVolumeFilter}
                      onChange={(event) => {
                        setSearchVolumeFilter(event.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      {searchVolumeFilterOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {searchVolumeFilter === "custom" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          min={0}
                          placeholder="From"
                          radius="sm"
                          size="sm"
                          type="number"
                          value={customSearchVolumeFrom}
                          variant="bordered"
                          onValueChange={(value) => {
                            setCustomSearchVolumeFrom(value);
                            setCurrentPage(1);
                          }}
                        />
                        <Input
                          min={0}
                          placeholder="To"
                          radius="sm"
                          size="sm"
                          type="number"
                          value={customSearchVolumeTo}
                          variant="bordered"
                          onValueChange={(value) => {
                            setCustomSearchVolumeTo(value);
                            setCurrentPage(1);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </DropdownItem>
                <DropdownItem
                  key="keyword-difficulty-filter"
                  textValue="Keyword Difficulty filter"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#4B5563]">
                      Keyword Difficulty
                    </p>
                    <select
                      className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                      value={keywordDifficultyFilter}
                      onChange={(event) => {
                        setKeywordDifficultyFilter(event.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      {keywordDifficultyFilterOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {keywordDifficultyFilter === "custom" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          max={100}
                          min={0}
                          placeholder="From"
                          radius="sm"
                          size="sm"
                          type="number"
                          value={customKeywordDifficultyFrom}
                          variant="bordered"
                          onValueChange={(value) => {
                            setCustomKeywordDifficultyFrom(value);
                            setCurrentPage(1);
                          }}
                        />
                        <Input
                          max={100}
                          min={0}
                          placeholder="To"
                          radius="sm"
                          size="sm"
                          type="number"
                          value={customKeywordDifficultyTo}
                          variant="bordered"
                          onValueChange={(value) => {
                            setCustomKeywordDifficultyTo(value);
                            setCurrentPage(1);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </DropdownItem>
                <DropdownItem key="cpc-filter" textValue="CPC filter">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#4B5563]">CPC</p>
                    <select
                      className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                      value={cpcFilter}
                      onChange={(event) => {
                        setCpcFilter(event.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      {cpcFilterOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {cpcFilter === "custom" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          min={0}
                          placeholder="From"
                          radius="sm"
                          size="sm"
                          step="0.01"
                          type="number"
                          value={customCpcFrom}
                          variant="bordered"
                          onValueChange={(value) => {
                            setCustomCpcFrom(value);
                            setCurrentPage(1);
                          }}
                        />
                        <Input
                          min={0}
                          placeholder="To"
                          radius="sm"
                          size="sm"
                          step="0.01"
                          type="number"
                          value={customCpcTo}
                          variant="bordered"
                          onValueChange={(value) => {
                            setCustomCpcTo(value);
                            setCurrentPage(1);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </DropdownItem>
                <DropdownItem key="source-filter" textValue="Source filter">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#4B5563]">
                      Source
                    </p>
                    <select
                      className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                      value={providerFilter}
                      onChange={(event) => {
                        setProviderFilter(
                          event.target.value as
                            | ClientKeywordProvider
                            | "all"
                            | "none",
                        );
                        setCurrentPage(1);
                      }}
                    >
                      {providerFilterOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </DropdownItem>
                <DropdownItem key="status-filter" textValue="Status filter">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#4B5563]">
                      Status
                    </p>
                    <select
                      className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(
                          event.target.value as KeywordStatus | "all",
                        );
                        setCurrentPage(1);
                      }}
                    >
                      {statusFilterOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </DropdownItem>
                <DropdownItem key="reset-filters" textValue="Reset filters">
                  <Button
                    fullWidth
                    isDisabled={!hasActiveFilters}
                    radius="sm"
                    variant="bordered"
                    onPress={resetFilters}
                  >
                    Reset
                  </Button>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
            <Button
              className="bg-[#022279] text-white"
              radius="sm"
              startContent={<Plus size={14} />}
              onPress={() => setIsAddModalOpen(true)}
            >
              Add keyword
            </Button>
            <Button
              isLoading={isImporting}
              radius="sm"
              startContent={<Upload size={14} />}
              variant="bordered"
              onPress={() => setIsImportModalOpen(true)}
            >
              Import
            </Button>
            <Dropdown closeOnSelect={false} placement="bottom-end">
              <DropdownTrigger>
                <Button
                  radius="sm"
                  startContent={<Columns3 size={14} />}
                  variant="bordered"
                >
                  Columns
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Visible keyword columns"
                closeOnSelect={false}
              >
                {columns.map((column) => (
                  <DropdownItem key={column.key} textValue={column.label}>
                    <Checkbox
                      isDisabled={lockedColumnKeys.has(column.key)}
                      isSelected={visibleColumnKeys.has(column.key)}
                      onValueChange={() => {
                        setVisibleColumnKeys((current) => {
                          const next = new Set(current);

                          if (next.has(column.key)) {
                            next.delete(column.key);
                          } else {
                            next.add(column.key);
                          }

                          lockedColumnKeys.forEach((key) => next.add(key));

                          return next;
                        });
                      }}
                    >
                      {column.label}
                    </Checkbox>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
            <Input
              className="w-full min-w-[220px] md:w-72"
              placeholder="Search keywords"
              radius="sm"
              startContent={<Search className="text-default-400" size={16} />}
              value={searchValue}
              onValueChange={(value) => {
                setSearchValue(value);
                setCurrentPage(1);
              }}
            />
          </div>
        }
        isLoading={isLoading}
        pageSize={10}
        rows={filteredRows}
        title="Keywords"
        onPageChange={setCurrentPage}
      />
      <ImportKeywordsModal
        isOpen={isImportModalOpen}
        onImport={handleImportKeywords}
        onOpenChange={setIsImportModalOpen}
      />
      <AddClientKeywordModal
        isOpen={isAddModalOpen}
        onAdded={async (keyword) => {
          if (!session?.accessToken) {
            throw new Error("Your session has expired.");
          }

          const accessToken = await getValidAccessToken();
          const response = await clientsApi.importClientKeywords(
            accessToken,
            clientId,
            [keyword],
          );

          setRows(response.keywords.map(mapApiKeyword));
          setSelectedKeys(new Set([]));
          setCurrentPage(1);
        }}
        onOpenChange={setIsAddModalOpen}
      />
      <Modal
        isOpen={Boolean(deleteCandidate)}
        placement="center"
        scrollBehavior="inside"
        size="sm"
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeleteCandidate(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader>Delete keyword</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Delete {deleteCandidate?.keyword}? This cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setDeleteCandidate(null)}>
              Cancel
            </Button>
            <Button
              color="danger"
              isLoading={isDeleting}
              onPress={handleDeleteKeyword}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={isBulkDeleteConfirmOpen}
        placement="center"
        scrollBehavior="inside"
        size="sm"
        onOpenChange={(isOpen) => {
          setIsBulkDeleteConfirmOpen(isOpen);
        }}
      >
        <ModalContent>
          <ModalHeader>Delete keywords</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Delete {selectedKeywordCount} selected keyword
              {selectedKeywordCount === 1 ? "" : "s"}? This cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsBulkDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              isDisabled={!selectedKeywordCount || isDeleting}
              isLoading={isDeleting}
              onPress={handleBulkDeleteKeywords}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
