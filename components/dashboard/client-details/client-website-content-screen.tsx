"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { Progress } from "@heroui/progress";
import { Select, SelectItem } from "@heroui/select";
import {
  Columns3,
  EllipsisVertical,
  ListOrdered,
  Minus,
  Pencil,
  Plus,
  Settings,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

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

type WebsiteContentRow = {
  contentLength: string;
  id: string;
  isSelected: boolean;
  intent: string;
  keyword: string;
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
const CONTENT_LENGTH_OPTIONS = ["Short", "Standard", "Comprehensive"] as const;

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

const mapKeywordsToRows = (
  keywords: Array<{
    contentType?: string | null;
    id?: string | null;
    intent?: string | null;
    keyword?: string | null;
    searchVolume?: number | null;
    title?: string | null;
  }>,
) =>
  keywords
    .filter((item) => item && item.keyword)
    .map((item, index) => ({
      contentLength: "Short",
      id:
        (typeof item.id === "string" && item.id.trim()) ||
        `${Date.now()}-${index}`,
      isSelected: false,
      intent: item.intent || "-",
      keyword: item.keyword || "",
      status: "Not started",
      sv:
        typeof item.searchVolume === "number" ? String(item.searchVolume) : "-",
      title: item.title || "",
      type: item.contentType || "-",
    }));

export const ClientWebsiteContentScreen = ({
  clientId,
}: {
  clientId?: string;
}) => {
  const { session } = useAuth();
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

  const loadSavedKeywords = useCallback(async () => {
    if (!session?.accessToken || !clientId) {
      setRows([]);

      return;
    }

    const response = await keywordContentListsApi.listKeywordContentLists(
      session.accessToken,
      { clientId },
    );
    const mergedKeywords = response.keywordContentLists.flatMap(
      (record) => record.keywords ?? [],
    );

    setRows(mapKeywordsToRows(mergedKeywords));
  }, [clientId, session?.accessToken]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        await loadSavedKeywords();
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
  }, [loadSavedKeywords]);

  const totalAllocated = breakdown.reduce(
    (sum, item) => sum + item.allocated,
    0,
  );
  const totalUsed = breakdown.reduce((sum, item) => sum + item.used, 0);

  const modalRows = useMemo(
    () =>
      MODAL_ROW_ORDER.map((key) =>
        draftBreakdown.find((item) => item.key === key),
      ).filter((item): item is BreakdownItem => Boolean(item)),
    [draftBreakdown],
  );

  const modalAllocated = draftBreakdown.reduce(
    (sum, item) => sum + item.allocated,
    0,
  );
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
          }}
        >
          {CONTENT_LENGTH_OPTIONS.map((option) => (
            <SelectItem key={option}>{option}</SelectItem>
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
      renderCell: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Button radius="md" size="sm" variant="bordered">
            Write
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
                if (actionKey === "delete") {
                  setRows((current) =>
                    current.filter((row) => row.id !== item.id),
                  );
                }
              }}
            >
              <DropdownItem
                key="edit-content"
                startContent={<Pencil size={16} />}
              >
                Edit Content
              </DropdownItem>
              <DropdownItem
                key="settings"
                startContent={<Settings size={16} />}
              >
                Settings
              </DropdownItem>
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                startContent={<Trash2 size={16} />}
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      ),
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

    await keywordContentListsApi.createKeywordContentList(session.accessToken, {
      audience: values.audience || "",
      clientId,
      enableContentClustering: Boolean(values.enableContentClustering),
      keywords: values.keywords.map((item) => ({
        contentType: item.contentType || "",
        cpc: item.cpc,
        id: item.id,
        intent: item.intent,
        kd: item.kd,
        keyword: item.keyword,
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
                setDraftBreakdown(breakdown);
                setIsBreakdownModalOpen(true);
              }}
            >
              Edit
            </Button>
          </CardHeader>
          <CardBody className="space-y-4 px-4 pb-5 pt-2">
            {breakdown.map((item) => (
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
          <DashboardDataTable
            showPagination
            ariaLabel="Website content table"
            columns={tableColumns}
            getRowKey={(item) => item.id}
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
                <Button
                  className="bg-[#022279] text-white"
                  startContent={<Search size={16} />}
                >
                  Start Keyword Research
                </Button>
                <span className="text-sm text-[#6B7280]">Or</span>
                <Button
                  className="bg-[#022279] text-white"
                  startContent={<Plus size={16} />}
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
                    Allocated {modalAllocated}
                  </span>
                  <span className="text-base font-semibold">
                    Remaining {modalUnallocated}
                  </span>
                </div>
              </div>
              <Progress
                aria-label="Allocated content progress"
                classNames={{
                  indicator: "bg-[#022279]",
                  track: "bg-[#E5E7EB]",
                }}
                value={(modalAllocated / TOTAL_CREDITS) * 100}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                className="bg-[#022279] text-white"
                onPress={() => {
                  setBreakdown(draftBreakdown);
                  setIsBreakdownModalOpen(false);
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
