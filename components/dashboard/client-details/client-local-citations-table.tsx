"use client";

import type { Selection } from "@react-types/shared";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
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
import { useAppToast } from "@/hooks/use-app-toast";

type CitationStatus =
  | "Complete"
  | "Pending"
  | "Incomplete"
  | "Missing"
  | "Error";

const citationStatuses = [
  "Complete",
  "Pending",
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
  const [activeCitation, setActiveCitation] = useState<LocalCitationRow | null>(
    null,
  );
  const [searchValue, setSearchValue] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
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
    const citationMap = new Map(
      citations
        .filter((citation) => citation.citationDatabaseEntryId)
        .map((citation) => [
          citation.citationDatabaseEntryId as string,
          citation,
        ]),
    );
    const templateRows = citationTemplates.map((template, index) => {
      const matchedCitation = citationMap.get(template.id);

      return {
        address: clientContext.address,
        citationId: matchedCitation ? String(matchedCitation.id) : null,
        citationDatabaseEntryId: template.id,
        dateAdded: matchedCitation?.createdAt?.slice(0, 10) ?? "-",
        directory: template.name,
        id: `template-${template.id}-${index}`,
        name: clientContext.name,
        notes: matchedCitation?.notes ?? "",
        password: matchedCitation?.password ?? "",
        phone: clientContext.phone,
        profileUrl: matchedCitation?.profileUrl ?? "",
        source: "Database",
        status: (matchedCitation?.status as CitationStatus | null) ?? "Pending",
        type: template.type || "-",
        username: matchedCitation?.username ?? "",
        validationLink: template.validationLink,
        verificationStatus:
          matchedCitation?.verificationStatus ?? defaultVerificationStatus,
        zipCode: clientContext.zipCode,
      } satisfies LocalCitationRow;
    });
    const templateIds = new Set(
      citationTemplates.map((template) => template.id),
    );
    const extraSavedRows = citations
      .filter(
        (citation) =>
          !citation.citationDatabaseEntryId ||
          !templateIds.has(citation.citationDatabaseEntryId),
      )
      .map(
        (citation, index) =>
          ({
            address: clientContext.address,
            citationId: String(citation.id),
            citationDatabaseEntryId: citation.citationDatabaseEntryId ?? null,
            dateAdded: citation.createdAt?.slice(0, 10) ?? "-",
            directory: citation.directoryName,
            id: `saved-${citation.id}-${index}`,
            name: clientContext.name,
            notes: citation.notes ?? "",
            password: citation.password ?? "",
            phone: clientContext.phone,
            profileUrl: citation.profileUrl ?? "",
            source: "Custom",
            status: (citation.status as CitationStatus | null) ?? "Pending",
            type: citation.type ?? "-",
            username: citation.username ?? "",
            validationLink: "",
            verificationStatus:
              citation.verificationStatus ?? defaultVerificationStatus,
            zipCode: clientContext.zipCode,
          }) satisfies LocalCitationRow,
      );
    const hydratedRows = [...templateRows, ...extraSavedRows];

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
      }),
    [],
  );

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
        const filtered = current.filter(
          (citation) => String(citation.id) !== String(savedCitation.id),
        );

        return [...filtered, savedCitation];
      });
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

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
        getRowKey={(item) => item.id}
        headerRight={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              radius="sm"
              startContent={<List size={14} />}
              variant="bordered"
            >
              Show 10
            </Button>
            <Button
              radius="sm"
              startContent={<Columns3 size={14} />}
              variant="bordered"
            >
              Columns
            </Button>
            <Input
              className="w-full min-w-[240px] md:w-72"
              placeholder="Search here"
              radius="sm"
              startContent={<Search className="text-default-400" size={16} />}
              value={searchValue}
              onValueChange={setSearchValue}
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
        rows={filteredRows}
        selectedKeys={selectedKeys}
        title="Local Citations"
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
    </>
  );
};
