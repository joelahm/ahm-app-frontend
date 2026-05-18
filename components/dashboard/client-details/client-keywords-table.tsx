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
  Loader2,
  Plus,
  RefreshCw,
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

const lockedColumnKeys = new Set(["keyword", "action"]);
const formatNumber = (value: number | null) =>
  value === null ? "-" : new Intl.NumberFormat("en-US").format(value);
const formatCurrency = (value: number | null) =>
  value === null ? "-" : `$${value.toFixed(2)}`;
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
  const [statusFilter, setStatusFilter] = useState<KeywordStatus | "all">(
    "all",
  );
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
        "keyword",
        "useIn",
        "contentType",
        "generatedTitle",
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
    [clientId, getValidAccessToken, session?.accessToken, toast],
  );

  const columns = useMemo<DashboardDataTableColumn<ClientKeywordRow>[]>(
    () => [
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
        key: "generatedTitle",
        label: "Title",
        renderCell: (item) => {
          if (item.titleStatus === "GENERATING") {
            return (
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <Loader2 className="animate-spin" size={14} />
                <span>Generating...</span>
              </div>
            );
          }

          if (item.titleStatus === "FAILED") {
            return (
              <div className="flex items-center gap-2 text-xs text-danger">
                <span title={item.titleError || ""}>Failed</span>
                <Button
                  isIconOnly
                  aria-label={`Retry title generation for ${item.keyword}`}
                  className="text-default-500"
                  radius="full"
                  size="sm"
                  variant="light"
                  onPress={() => void handleGenerateTitles([item.id])}
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
            );
          }

          if (item.generatedTitle) {
            return (
              <div className="flex items-center gap-2">
                <span className="line-clamp-2 text-sm text-[#111827]">
                  {item.generatedTitle}
                </span>
                <Button
                  isIconOnly
                  aria-label={`Regenerate title for ${item.keyword}`}
                  className="text-default-500"
                  radius="full"
                  size="sm"
                  variant="light"
                  onPress={() => void handleGenerateTitles([item.id])}
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
            );
          }

          return (
            <Button
              radius="sm"
              size="sm"
              startContent={<Sparkles size={14} />}
              variant="bordered"
              onPress={() => void handleGenerateTitles([item.id])}
            >
              Generate
            </Button>
          );
        },
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
    [handleGenerateTitles, saveKeywordPatch, updateRow],
  );

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleColumnKeys.has(column.key)),
    [columns, visibleColumnKeys],
  );

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;
      const haystack = [
        row.keyword,
        row.useIn.join(" "),
        row.searchIntent,
        row.serp,
        row.status,
        row.note,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [rows, searchValue, statusFilter]);

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
        enableSelection
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
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button
                  color={statusFilter !== "all" ? "primary" : "default"}
                  radius="sm"
                  startContent={<Filter size={14} />}
                  variant={statusFilter !== "all" ? "flat" : "bordered"}
                >
                  Filter
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Keyword status filter"
                items={statusFilterOptions}
                selectedKeys={[statusFilter]}
                selectionMode="single"
                onSelectionChange={(keys) => {
                  const selectedKey =
                    keys === "all" ? "all" : String(keys.currentKey ?? "all");

                  setStatusFilter(selectedKey as KeywordStatus | "all");
                  setCurrentPage(1);
                }}
              >
                {(item) => (
                  <DropdownItem key={item.key}>{item.label}</DropdownItem>
                )}
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
        selectedKeys={selectedKeys}
        title="Keywords"
        onPageChange={setCurrentPage}
        onSelectionChange={setSelectedKeys}
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
