"use client";

import type { Selection } from "@react-types/shared";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
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
import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  Columns3,
  EllipsisVertical,
  Eye,
  EyeOff,
  List,
  Search,
  SquareDashedMousePointer,
  Trash2,
  Upload,
} from "lucide-react";

import {
  type AddClientCitationRequestBody,
  type ClientCitation,
  type ClientCitationVerificationStatus,
  clientsApi,
} from "@/apis/clients";
import {
  citationDatabaseApi,
  type CitationDatabaseItem,
} from "@/apis/citation-database";
import { useAuth } from "@/components/auth/auth-context";
import { AddCitationModal } from "@/components/dashboard/client-details/add-citation-modal";
import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import {
  type ImportedCitationRow,
  ImportBulkCitationsModal,
} from "@/components/dashboard/settings/import-bulk-citations-modal";
import { useAppToast } from "@/hooks/use-app-toast";

type CitationStatus =
  | "Complete"
  | "Pending"
  | "Submitted"
  | "Incomplete"
  | "Missing"
  | "Error";

const citationStatuses = [
  "Complete",
  "Pending",
  "Submitted",
  "Incomplete",
  "Missing",
  "Error",
] as const satisfies readonly CitationStatus[];

type LocalCitationRow = {
  address: string;
  citationId: string | null;
  citationDatabaseEntryId: string | null;
  dateAdded: string;
  directory: string;
  id: string;
  name: string;
  notes: string;
  password: string;
  phone: string;
  profileUrl: string;
  source: "Database" | "Custom";
  status: CitationStatus;
  type: string;
  username: string;
  validationLink: string;
  verificationStatus: ClientCitationVerificationStatus;
  zipCode: string;
};

interface ClientLocalCitationsTableProps {
  clientId: number | string;
}

const thClassName = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";
const pageSizeOptions = [10, 25, 50, 100];
const defaultVerificationStatus: ClientCitationVerificationStatus = {
  address: "Not Synced",
  businessName: "Not Synced",
  phone: "Not Synced",
  zipCode: "Not Synced",
};

type CitationTemplate = {
  id: string;
  name: string;
  type: string;
  validationLink: string;
};

const statusSummaryConfig = {
  Complete: {
    icon: CheckCircle2,
    iconClassName: "bg-[#D1FAE5] text-[#10B981]",
  },
  Pending: {
    icon: SquareDashedMousePointer,
    iconClassName: "bg-[#FEF3C7] text-[#F59E0B]",
  },
  Submitted: {
    icon: CheckCircle2,
    iconClassName: "bg-[#DBEAFE] text-[#2563EB]",
  },
  Incomplete: {
    icon: AlertTriangle,
    iconClassName: "bg-[#CFFAFE] text-[#06B6D4]",
  },
  Missing: {
    icon: EyeOff,
    iconClassName: "bg-[#E0E7FF] text-[#6366F1]",
  },
  Error: {
    icon: CircleX,
    iconClassName: "bg-[#FCE7F3] text-[#EC4899]",
  },
} satisfies Record<
  CitationStatus,
  {
    icon: typeof CheckCircle2;
    iconClassName: string;
  }
>;

const buildClientAddress = ({
  addressLine1,
  addressLine2,
  cityState,
  country,
}: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  cityState?: string | null;
  country?: string | null;
}) =>
  [addressLine1, addressLine2, cityState, country]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(", ");

const extractZipCode = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const match = value.match(/\b[A-Z0-9]{2,4}\s?[A-Z0-9]{2,4}\b$/i);

  return match?.[0] ?? null;
};

const getStatusChipClassName = (status: CitationStatus) => {
  if (status === "Complete") {
    return "bg-[#DCFCE7] text-[#059669]";
  }

  if (status === "Incomplete") {
    return "bg-[#FFEDD5] text-[#EA580C]";
  }

  if (status === "Submitted") {
    return "bg-[#DBEAFE] text-[#2563EB]";
  }

  if (status === "Error") {
    return "bg-[#FEE2E2] text-[#DC2626]";
  }

  if (status === "Missing") {
    return "bg-[#F3F4F6] text-[#4B5563]";
  }

  return "bg-[#FEF3C7] text-[#D97706]";
};

const getDirectoryTone = (directory: string) => {
  if (directory === "Apple") {
    return "bg-[#111827] text-white";
  }

  if (directory === "GBP") {
    return "bg-[#F3F4F6] text-[#6B7280]";
  }

  return "bg-[#F8FAFC] text-[#4B5563]";
};

const toCitationStatus = (value?: string | null): CitationStatus => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  const matchedStatus = citationStatuses.find(
    (status) => status.toLowerCase() === normalized,
  );

  return matchedStatus ?? "Pending";
};

const columns: DashboardDataTableColumn<LocalCitationRow>[] = [
  {
    key: "directory",
    label: "Directory / Site",
    className: thClassName,
    renderCell: (item) => (
      <div className="flex items-center gap-3">
        <Avatar
          className={`flex-none h-10 w-10 text-sm font-semibold ${getDirectoryTone(item.directory)}`}
          name={item.directory}
        />
        <span className="text-sm text-[#111827]">{item.directory}</span>
      </div>
    ),
  },
  {
    key: "name",
    label: "Name",
    className: thClassName,
    renderCell: (item) => (
      <button
        className="truncate text-left text-sm font-medium text-[#022279] underline underline-offset-2"
        type="button"
      >
        {item.name}
      </button>
    ),
  },
  {
    key: "address",
    label: "Address",
    className: thClassName,
    renderCell: (item) => (
      <span className="block max-w-[260px] truncate text-sm text-[#111827]">
        {item.address}
      </span>
    ),
  },
  {
    key: "zipCode",
    label: "Zip Code",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.zipCode}</span>
    ),
  },
  {
    key: "phone",
    label: "Phone",
    className: thClassName,
    renderCell: (item) => (
      <span className="whitespace-nowrap text-sm text-[#111827]">
        {item.phone}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    className: thClassName,
    renderCell: (item) => (
      <Chip
        className={getStatusChipClassName(item.status)}
        radius="full"
        size="sm"
        variant="flat"
      >
        {item.status}
      </Chip>
    ),
  },
  {
    key: "type",
    label: "Type",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.type}</span>
    ),
  },
  {
    key: "phoneSecondary",
    label: "Phone",
    className: thClassName,
    renderCell: (item) => (
      <span className="whitespace-nowrap text-sm text-[#111827]">
        {item.phone}
      </span>
    ),
  },
  {
    key: "action",
    label: "Action",
    className: thClassName,
    renderCell: (item) => (
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Button isIconOnly radius="sm" size="sm" variant="bordered">
            <EllipsisVertical size={16} />
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label={`Citation actions ${item.id}`}>
          <DropdownItem
            key="view"
            startContent={<Eye size={16} />}
            onPress={() => {
              // handled in buildColumns wrapper
            }}
          >
            View
          </DropdownItem>
          {/*  <DropdownItem
            key="delete"
            className="text-danger"
            color="danger"
            isDisabled={!item.citationId}
            startContent={<Trash2 size={16} />}
          >
            Delete
          </DropdownItem> */}
        </DropdownMenu>
      </Dropdown>
    ),
  },
];

const lockedColumnKeys = new Set(["action"]);

const buildColumns = ({
  onView,
}: {
  onView: (row: LocalCitationRow) => void;
}): DashboardDataTableColumn<LocalCitationRow>[] =>
  columns.map((column) => {
    if (column.key !== "action") {
      return column;
    }

    return {
      ...column,
      renderCell: (item) => (
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button isIconOnly radius="sm" size="sm" variant="bordered">
              <EllipsisVertical size={16} />
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label={`Citation actions ${item.id}`}>
            <DropdownItem
              key="view"
              startContent={<Eye size={16} />}
              onPress={() => onView(item)}
            >
              View
            </DropdownItem>
            {/* <DropdownItem
              key="delete"
              className="text-danger"
              color="danger"
              isDisabled={!item.citationId}
              startContent={<Trash2 size={16} />}
              onPress={() => onDelete(item)}
            >
              Delete
            </DropdownItem> */}
          </DropdownMenu>
        </Dropdown>
      ),
    };
  });

export const ClientLocalCitationsTable = ({
  clientId,
}: ClientLocalCitationsTableProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [citations, setCitations] = useState<ClientCitation[]>([]);
  const [citationTemplates, setCitationTemplates] = useState<
    CitationTemplate[]
  >([]);
  const [isAddCitationModalOpen, setIsAddCitationModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isImportingTemplates, setIsImportingTemplates] = useState(false);
  const [activeCitation, setActiveCitation] = useState<LocalCitationRow | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchValue, setSearchValue] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(
    () => new Set(columns.map((column) => column.key)),
  );
  const [clientContext, setClientContext] = useState({
    address: "-",
    name: "-",
    phone: "-",
    zipCode: "-",
  });

  useEffect(() => {
    if (!session || !clientId) {
      return;
    }

    let isMounted = true;

    const loadClientContext = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const [clientDetails, gbpDetails, citationsResponse, citationDatabase] =
          await Promise.all([
            clientsApi.getClientById(accessToken, clientId),
            clientsApi
              .getClientGbpDetails(accessToken, clientId)
              .catch(() => null),
            clientsApi
              .getClientCitations(accessToken, clientId)
              .catch(() => ({ citations: [], total: 0 })),
            citationDatabaseApi
              .listCitations(accessToken)
              .catch(() => ({ citations: [] as CitationDatabaseItem[] })),
          ]);

        if (!isMounted) {
          return;
        }

        const clientAddress = buildClientAddress(clientDetails);
        const gbpAddress = gbpDetails?.businessLocation?.trim() ?? "";
        const zipCode =
          clientDetails.postCode?.trim() ||
          extractZipCode(gbpAddress) ||
          extractZipCode(clientAddress) ||
          "-";

        setClientContext({
          address: gbpAddress || clientAddress || "-",
          name:
            gbpDetails?.businessName?.trim() ||
            clientDetails.businessName?.trim() ||
            clientDetails.clientName?.trim() ||
            "-",
          phone:
            gbpDetails?.phone?.trim() ||
            clientDetails.businessPhone?.trim() ||
            "-",
          zipCode,
        });
        setCitations(citationsResponse.citations);
        setCitationTemplates(
          citationDatabase.citations
            .filter((citation) => citation.status === "Published")
            .map((citation) => ({
              id: String(citation.id),
              name: citation.name,
              type: citation.type,
              validationLink: citation.validationLink,
            })),
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setClientContext({
          address: "-",
          name: "-",
          phone: "-",
          zipCode: "-",
        });
        setCitations([]);
        setCitationTemplates([]);
      }
    };

    void loadClientContext();

    return () => {
      isMounted = false;
    };
  }, [clientId, getValidAccessToken, session]);

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const templatesById = new Map(
      citationTemplates.map((template) => [template.id, template]),
    );
    const hydratedRows = citations.map((citation) => {
      const template = citation.citationDatabaseEntryId
        ? templatesById.get(citation.citationDatabaseEntryId)
        : null;

      return {
        address: clientContext.address,
        citationId: String(citation.id),
        citationDatabaseEntryId: citation.citationDatabaseEntryId ?? null,
        dateAdded: citation.createdAt?.slice(0, 10) ?? "-",
        directory: citation.directoryName,
        id: `saved-${citation.id}`,
        name: clientContext.name,
        notes: citation.notes ?? "",
        password: citation.password ?? "",
        phone: clientContext.phone,
        profileUrl: citation.profileUrl ?? "",
        source: citation.citationDatabaseEntryId ? "Database" : "Custom",
        status: toCitationStatus(citation.status),
        type: citation.type ?? template?.type ?? "-",
        username: citation.username ?? "",
        validationLink: template?.validationLink ?? "",
        verificationStatus:
          citation.verificationStatus ?? defaultVerificationStatus,
        zipCode: clientContext.zipCode,
      } satisfies LocalCitationRow;
    });

    if (!query) {
      return hydratedRows;
    }

    return hydratedRows.filter((row) =>
      [
        row.directory,
        row.name,
        row.address,
        row.zipCode,
        row.phone,
        row.status,
        row.source,
        row.type,
        row.dateAdded,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [citations, citationTemplates, clientContext, searchValue]);

  const statusSummaryItems = useMemo(() => {
    const counts = citationStatuses.reduce(
      (result, status) => ({
        ...result,
        [status]: 0,
      }),
      {} as Record<CitationStatus, number>,
    );

    filteredRows.forEach((row) => {
      counts[row.status] += 1;
    });

    return citationStatuses.map((status) => ({
      count: counts[status],
      status,
      ...statusSummaryConfig[status],
    }));
  }, [filteredRows]);

  const tableColumns = useMemo(
    () =>
      buildColumns({
        onView: (row) => {
          setActiveCitation(row);
          setIsAddCitationModalOpen(true);
        },
      }).filter((column) => visibleColumnKeys.has(column.key)),
    [visibleColumnKeys],
  );

  const toggleableColumns = useMemo(
    () => columns.filter((column) => !lockedColumnKeys.has(column.key)),
    [],
  );

  const selectedCitationRows = useMemo(() => {
    const selectedRowIds =
      selectedKeys === "all"
        ? new Set(filteredRows.map((row) => row.id))
        : new Set(Array.from(selectedKeys).map(String));

    return filteredRows.filter(
      (row) => row.citationId && selectedRowIds.has(row.id),
    );
  }, [filteredRows, selectedKeys]);

  const selectedCitationCount = selectedCitationRows.length;

  const handleSaveCitation = async (payload: {
    notes?: string;
    password?: string;
    profileUrl?: string;
    status?: string;
    username?: string;
    verificationStatus: ClientCitationVerificationStatus;
  }) => {
    if (!session) {
      throw new Error("Missing access token.");
    }

    const directoryName =
      activeCitation?.directory ?? "Google Business Profile";
    const requestPayload: AddClientCitationRequestBody = {
      citationDatabaseEntryId: activeCitation?.citationDatabaseEntryId ?? null,
      directoryName,
      notes: payload.notes,
      password: payload.password,
      profileUrl: payload.profileUrl,
      status: payload.status,
      username: payload.username,
      verificationStatus: payload.verificationStatus,
    };

    try {
      const accessToken = await getValidAccessToken();
      const savedCitation = activeCitation?.citationId
        ? await clientsApi.updateClientCitation(
            accessToken,
            clientId,
            activeCitation.citationId,
            requestPayload,
          )
        : await clientsApi.createClientCitation(
            accessToken,
            clientId,
            requestPayload,
          );

      setCitations((current) => {
        const existingIndex = current.findIndex(
          (citation) => String(citation.id) === String(savedCitation.id),
        );

        if (existingIndex === -1) {
          return [...current, savedCitation];
        }

        const next = [...current];

        next[existingIndex] = savedCitation;

        return next;
      });
      setActiveCitation((current) =>
        current
          ? {
              ...current,
              citationId: String(savedCitation.id),
              citationDatabaseEntryId:
                savedCitation.citationDatabaseEntryId ?? null,
              dateAdded: savedCitation.createdAt?.slice(0, 10) ?? "-",
              directory: savedCitation.directoryName,
              notes: savedCitation.notes ?? "",
              password: savedCitation.password ?? "",
              profileUrl: savedCitation.profileUrl ?? "",
              source: savedCitation.citationDatabaseEntryId
                ? "Database"
                : "Custom",
              status: toCitationStatus(savedCitation.status),
              type: savedCitation.type ?? current.type,
              username: savedCitation.username ?? "",
              verificationStatus:
                savedCitation.verificationStatus ?? defaultVerificationStatus,
            }
          : current,
      );
      toast.success("Citation saved successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save citation.";

      toast.danger("Failed to save citation.", {
        description: message,
      });
      throw error;
    }
  };

  const handleImportTemplates = async () => {
    if (!session) {
      return;
    }

    const existingTemplateIds = new Set(
      citations
        .map((citation) => citation.citationDatabaseEntryId)
        .filter(Boolean)
        .map(String),
    );
    const missingTemplates = citationTemplates.filter(
      (template) => !existingTemplateIds.has(template.id),
    );

    if (!missingTemplates.length) {
      toast.warning("All citation templates are already imported.");

      return;
    }

    setIsImportingTemplates(true);

    try {
      const accessToken = await getValidAccessToken();
      const results = await Promise.allSettled(
        missingTemplates.map((template) =>
          clientsApi.createClientCitation(accessToken, clientId, {
            citationDatabaseEntryId: template.id,
            directoryName: template.name,
            status: "Pending",
            verificationStatus: defaultVerificationStatus,
          }),
        ),
      );
      const importedCitations = results
        .filter(
          (result): result is PromiseFulfilledResult<ClientCitation> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);

      if (!importedCitations.length) {
        toast.danger("Failed to import citation templates.");

        return;
      }

      setCitations((current) => {
        const importedIds = new Set(
          importedCitations.map((citation) => String(citation.id)),
        );
        const filtered = current.filter(
          (citation) => !importedIds.has(String(citation.id)),
        );

        return [...filtered, ...importedCitations];
      });

      if (importedCitations.length < missingTemplates.length) {
        toast.warning("Some citation templates were not imported.", {
          description: `${importedCitations.length} of ${missingTemplates.length} templates were imported.`,
        });

        return;
      }

      toast.success("Citation templates imported.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to import citation templates.";

      toast.danger("Failed to import citation templates.", {
        description: message,
      });
    } finally {
      setIsImportingTemplates(false);
    }
  };

  const handleBulkUploadRows = async (importedRows: ImportedCitationRow[]) => {
    if (!session) {
      throw new Error("You must be signed in to upload citations.");
    }

    const accessToken = await getValidAccessToken();
    const results = await Promise.allSettled(
      importedRows.map((row) =>
        clientsApi.createClientCitation(accessToken, clientId, {
          directoryName: row.directorySite,
          profileUrl: row.validationLink,
          status: "Pending",
          verificationStatus: defaultVerificationStatus,
        }),
      ),
    );
    const uploadedCitations = results
      .filter(
        (result): result is PromiseFulfilledResult<ClientCitation> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value);

    if (!uploadedCitations.length) {
      throw new Error("Failed to upload citations.");
    }

    setCitations((current) => [...current, ...uploadedCitations]);

    if (uploadedCitations.length < importedRows.length) {
      toast.warning("Some citations were not uploaded.", {
        description: `${uploadedCitations.length} of ${importedRows.length} rows were imported.`,
      });

      return;
    }

    toast.success("Citations uploaded.");
  };

  const handleBulkDelete = async () => {
    if (!session || !selectedCitationRows.length) {
      return;
    }

    setIsBulkDeleting(true);

    try {
      const accessToken = await getValidAccessToken();
      const results = await Promise.allSettled(
        selectedCitationRows.map((row) =>
          clientsApi.deleteClientCitation(
            accessToken,
            clientId,
            row.citationId as string,
          ),
        ),
      );
      const deletedIds = new Set(
        selectedCitationRows
          .filter((_, index) => results[index]?.status === "fulfilled")
          .map((row) => row.citationId)
          .filter(Boolean)
          .map(String),
      );

      if (!deletedIds.size) {
        toast.danger("Failed to delete selected citations.");

        return;
      }

      setCitations((current) =>
        current.filter((citation) => !deletedIds.has(String(citation.id))),
      );
      setSelectedKeys(new Set([]));
      setIsBulkDeleteConfirmOpen(false);

      if (deletedIds.size < selectedCitationRows.length) {
        toast.warning("Some citations were not deleted.", {
          description: `${deletedIds.size} of ${selectedCitationRows.length} citations were deleted.`,
        });

        return;
      }

      toast.success("Selected citations deleted.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete selected citations.";

      toast.danger("Failed to delete selected citations.", {
        description: message,
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statusSummaryItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.status}
              className="min-h-[132px] rounded-xl border border-default-200 bg-white px-4 py-3 shadow-sm"
            >
              <div
                className={`mb-3 grid h-12 w-12 place-items-center rounded-xl ${item.iconClassName}`}
              >
                <Icon size={24} strokeWidth={2} />
              </div>
              <p className="text-base font-medium text-[#111827]">
                {item.status}
              </p>
              <p className="mt-3 text-3xl font-semibold leading-none text-[#111827]">
                {item.count}
              </p>
            </div>
          );
        })}
      </div>
      <DashboardDataTable
        enableSelection
        showPagination
        ariaLabel="Client local citations"
        columns={tableColumns}
        currentPage={currentPage}
        getRowKey={(item) => item.id}
        headerRight={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              className="border-danger-200 text-danger"
              isDisabled={!selectedCitationCount || isBulkDeleting}
              isLoading={isBulkDeleting}
              radius="sm"
              startContent={!isBulkDeleting ? <Trash2 size={14} /> : null}
              variant="bordered"
              onPress={() => setIsBulkDeleteConfirmOpen(true)}
            >
              Delete
            </Button>
            <Button
              radius="sm"
              startContent={<Upload size={14} />}
              variant="bordered"
              onPress={() => setIsBulkUploadModalOpen(true)}
            >
              Bulk Upload
            </Button>
            <Button
              className="bg-[#022279] text-white"
              isDisabled={!citationTemplates.length}
              isLoading={isImportingTemplates}
              radius="sm"
              startContent={!isImportingTemplates ? <List size={14} /> : null}
              onPress={() => {
                void handleImportTemplates();
              }}
            >
              Import Template
            </Button>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button
                  radius="sm"
                  startContent={<List size={14} />}
                  variant="bordered"
                >
                  Show {pageSize}
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Rows per page"
                selectedKeys={[String(pageSize)]}
                selectionMode="single"
                onSelectionChange={(keys) => {
                  const selectedKey =
                    keys === "all" ? String(pageSize) : keys.currentKey;
                  const selectedPageSize = Number(selectedKey);

                  if (Number.isFinite(selectedPageSize)) {
                    setPageSize(selectedPageSize);
                    setCurrentPage(1);
                  }
                }}
              >
                {pageSizeOptions.map((option) => (
                  <DropdownItem key={String(option)}>
                    Show {option}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
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
                aria-label="Visible local citation columns"
                closeOnSelect={false}
              >
                {toggleableColumns.map((column) => (
                  <DropdownItem key={column.key} textValue={column.label}>
                    <Checkbox
                      isSelected={visibleColumnKeys.has(column.key)}
                      onValueChange={() => {
                        setVisibleColumnKeys((current) => {
                          const next = new Set(current);

                          if (next.has(column.key)) {
                            next.delete(column.key);
                          } else {
                            next.add(column.key);
                          }

                          return next.size > lockedColumnKeys.size
                            ? next
                            : new Set(columns.map((item) => item.key));
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
              className="w-full min-w-[240px] md:w-72"
              placeholder="Search here"
              radius="sm"
              startContent={<Search className="text-default-400" size={16} />}
              value={searchValue}
              onValueChange={(value) => {
                setSearchValue(value);
                setCurrentPage(1);
              }}
            />
            {/* <Button
              className="bg-[#022279] text-white"
              startContent={<Plus size={14} />}
              onPress={openAddCitationModal}
            >
              Add Citation
            </Button> */}
          </div>
        }
        pageSize={pageSize}
        rows={filteredRows}
        selectedKeys={selectedKeys}
        title="Local Citations"
        onPageChange={setCurrentPage}
        onSelectionChange={setSelectedKeys}
      />
      <AddCitationModal
        citationDetails={{
          address: activeCitation?.address ?? clientContext.address,
          businessName: activeCitation?.name ?? clientContext.name,
          phone: activeCitation?.phone ?? clientContext.phone,
          validationLink: activeCitation?.validationLink ?? "",
          zipCode: activeCitation?.zipCode ?? clientContext.zipCode,
        }}
        citationId={activeCitation?.citationId ?? null}
        clientId={clientId}
        initialValues={
          activeCitation
            ? {
                notes: activeCitation.notes,
                password: activeCitation.password,
                profileUrl: activeCitation.profileUrl,
                status: activeCitation.status,
                username: activeCitation.username,
                verificationStatus: activeCitation.verificationStatus,
              }
            : {
                notes: "",
                password: "",
                profileUrl: "",
                status: "Pending",
                username: "",
                verificationStatus: defaultVerificationStatus,
              }
        }
        isOpen={isAddCitationModalOpen}
        onOpenChange={(isOpen) => {
          setIsAddCitationModalOpen(isOpen);

          if (!isOpen) {
            setActiveCitation(null);
          }
        }}
        onSubmit={handleSaveCitation}
      />
      <ImportBulkCitationsModal
        isOpen={isBulkUploadModalOpen}
        onImport={handleBulkUploadRows}
        onOpenChange={setIsBulkUploadModalOpen}
      />
      <Modal
        isOpen={isBulkDeleteConfirmOpen}
        onOpenChange={(isOpen) => {
          if (!isBulkDeleting) {
            setIsBulkDeleteConfirmOpen(isOpen);
          }
        }}
      >
        <ModalContent>
          <ModalHeader>Delete selected citations?</ModalHeader>
          <ModalBody>
            <p className="text-sm text-[#4B5563]">
              This will delete {selectedCitationCount} selected citation
              {selectedCitationCount === 1 ? "" : "s"} from this client.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              isDisabled={isBulkDeleting}
              variant="light"
              onPress={() => setIsBulkDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-danger text-white"
              isLoading={isBulkDeleting}
              startContent={!isBulkDeleting ? <Trash2 size={16} /> : null}
              onPress={() => {
                void handleBulkDelete();
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
