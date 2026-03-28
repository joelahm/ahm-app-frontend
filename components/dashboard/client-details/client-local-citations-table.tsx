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
  Columns3,
  EllipsisVertical,
  Eye,
  List,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  type AddClientCitationRequestBody,
  type ClientCitation,
  clientsApi,
} from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { AddCitationModal } from "@/components/dashboard/client-details/add-citation-modal";
import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";

type CitationStatus = "Pending" | "Rejected" | "Completed" | "Not Synced";

type LocalCitationRow = {
  address: string;
  citationId: string | null;
  dateAdded: string;
  directory: string;
  id: string;
  name: string;
  notes: string;
  password: string;
  phone: string;
  profileUrl: string;
  status: CitationStatus;
  type: string;
  username: string;
  zipCode: string;
};

interface ClientLocalCitationsTableProps {
  clientId: number | string;
}

const thClassName = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";

const citationDirectories = [
  "Google Business Profile",
  "Apple Business Connect",
  "LinkedIn",
  "Facebook",
  "Instagram",
  "WebMD",
  "YELP (Country Variants)",
  "Yelp (Country Variants)",
  "ZoomInfo",
  "Psychology Today",
  "Trustpilot",
  "Evening Standard",
  "TripAdvisor",
  "LII (Legal Information Institute)",
  "Foursquare",
  "Crunchbase",
  "White Pages",
  "MapQuest",
  "Waze",
  "Better Business Bureau",
  "Yellow Pages",
  "BBB",
  "Superpages",
  "Chamber of Commerce",
  "BBB (Better Business Bureaus)",
  "Manta",
  "Yellowbook",
  "google.com.au",
  "MerchantCircle",
  "DexKnows",
  "Citysearch",
  "Local.com",
  "OpenTable",
  "Trip.com",
  "Healthgrades",
  "Houzz",
  "Angi (formerly Angie's List)",
  "Travelocity",
  "Manchester Evening News Directory",
  "EZlocal",
  "Expedia",
  "HotFrog",
  "Booking.com",
  "Priceline",
  "Hotels.com",
  "HomeAdvisor",
  "Justia",
  "Lawyers.com",
  "Thumbtack",
  "Zocdoc",
  "Avvo",
  "FindLaw",
  "Zomato",
  "Insider Pages",
  "Kudzu",
  "OpenStreetMap",
  "Yell.com",
  "Martindale-Hubbell",
  "Nolo",
  "Houzz (Country Variants)",
  "Liverpool Echo Directory",
  "Whitepages",
  "FindLaw.com",
  "Chronicle Live Directory",
  "HappyCow",
  "Hotfrog",
  "Here",
  "Find us here",
  "Nextdoor Canada",
  "Hostelworld",
  "Nextdoor Australia",
  "Nextdoor (Country Variants)",
  "Tuugo",
  "AAO",
  "Hull Daily Mail Directory",
  "Lacartes",
  "TomTom",
  "Bristol Post Directory",
  "Nottingham Post Directory",
  "eLocal",
  "Gazette Live Directory",
  "Where To Go",
  "True Local",
  "Bizcommunity",
  "Care.com",
  "SaleSpider",
  "My Local Services",
  "ThomasNet",
  "Local Yahoo",
  "LocalDatabase",
  "USCity.net",
  "All-Biz",
  "Stoke Sentinel Directory",
  "GoLocal247",
  "GoodTherapy",
  "Awwwards",
  "RateBeer",
  "Fyple",
  "Angi",
] as const;

const rowsSeed: LocalCitationRow[] = citationDirectories.map(
  (directory, index) => ({
    id: String(index + 1),
    citationId: null,
    directory,
    name: "-",
    notes: "",
    password: "",
    address: "-",
    zipCode: "-",
    phone: "-",
    profileUrl: "",
    status: "Not Synced",
    type: "-",
    username: "",
    dateAdded: "-",
  }),
);

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
  if (status === "Completed") {
    return "bg-[#DCFCE7] text-[#059669]";
  }

  if (status === "Rejected") {
    return "bg-[#FEE2E2] text-[#DC2626]";
  }

  if (status === "Not Synced") {
    return "bg-[#EEF2FF] text-[#4338CA]";
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
          className={`h-10 w-10 text-sm font-semibold ${getDirectoryTone(item.directory)}`}
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
    key: "phone",
    label: "Phone",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.phone}</span>
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
          <DropdownItem
            key="delete"
            className="text-danger"
            color="danger"
            isDisabled={!item.citationId}
            startContent={<Trash2 size={16} />}
          >
            Delete
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    ),
  },
];

const buildColumns = ({
  onDelete,
  onView,
}: {
  onDelete: (row: LocalCitationRow) => void;
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
            <DropdownItem
              key="delete"
              className="text-danger"
              color="danger"
              isDisabled={!item.citationId}
              startContent={<Trash2 size={16} />}
              onPress={() => onDelete(item)}
            >
              Delete
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      ),
    };
  });

export const ClientLocalCitationsTable = ({
  clientId,
}: ClientLocalCitationsTableProps) => {
  const { session } = useAuth();
  const [citations, setCitations] = useState<ClientCitation[]>([]);
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

  const openAddCitationModal = () => {
    setActiveCitation({
      address: clientContext.address,
      citationId: null,
      dateAdded: "-",
      directory: "Google Business Profile",
      id: "new-citation",
      name: clientContext.name,
      notes: "",
      password: "",
      phone: clientContext.phone,
      profileUrl: "",
      status: "Not Synced",
      type: "-",
      username: "",
      zipCode: clientContext.zipCode,
    });
    setIsAddCitationModalOpen(true);
  };

  useEffect(() => {
    if (!session?.accessToken || !clientId) {
      return;
    }

    let isMounted = true;

    const loadClientContext = async () => {
      try {
        const [clientDetails, gbpDetails, citationsResponse] =
          await Promise.all([
            clientsApi.getClientById(session.accessToken, clientId),
            clientsApi
              .getClientGbpDetails(session.accessToken, clientId)
              .catch(() => null),
            clientsApi
              .getClientCitations(session.accessToken, clientId)
              .catch(() => ({ citations: [], total: 0 })),
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
      }
    };

    void loadClientContext();

    return () => {
      isMounted = false;
    };
  }, [clientId, session?.accessToken]);

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const citationMap = new Map(
      citations.map((citation) => [citation.directoryName, citation]),
    );
    const hydratedRows = rowsSeed.map((row) => {
      const matchedCitation = citationMap.get(row.directory);

      return {
        ...row,
        address: clientContext.address,
        citationId: matchedCitation ? String(matchedCitation.id) : null,
        name: clientContext.name,
        notes: matchedCitation?.notes ?? "",
        password: matchedCitation?.password ?? "",
        phone: clientContext.phone,
        profileUrl: matchedCitation?.profileUrl ?? "",
        status:
          (matchedCitation?.status as CitationStatus | null) ?? "Not Synced",
        username: matchedCitation?.username ?? "",
        zipCode: clientContext.zipCode,
      };
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
        row.type,
        row.dateAdded,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [citations, clientContext, searchValue]);

  const tableColumns = useMemo(
    () =>
      buildColumns({
        onDelete: (row) => {
          if (!row.citationId || !session?.accessToken) {
            return;
          }

          void clientsApi
            .deleteClientCitation(session.accessToken, clientId, row.citationId)
            .then(() => {
              setCitations((current) =>
                current.filter(
                  (citation) => String(citation.id) !== row.citationId,
                ),
              );
            })
            .catch(() => {});
        },
        onView: (row) => {
          setActiveCitation(row);
          setIsAddCitationModalOpen(true);
        },
      }),
    [clientId, session?.accessToken],
  );

  const handleSaveCitation = async (payload: {
    notes?: string;
    password?: string;
    profileUrl?: string;
    status?: string;
    username?: string;
  }) => {
    if (!session?.accessToken) {
      throw new Error("Missing access token.");
    }

    const directoryName =
      activeCitation?.directory ?? "Google Business Profile";
    const requestPayload: AddClientCitationRequestBody = {
      directoryName,
      notes: payload.notes,
      password: payload.password,
      profileUrl: payload.profileUrl,
      status: payload.status,
      username: payload.username,
    };

    const savedCitation = activeCitation?.citationId
      ? await clientsApi.updateClientCitation(
          session.accessToken,
          clientId,
          activeCitation.citationId,
          requestPayload,
        )
      : await clientsApi.createClientCitation(
          session.accessToken,
          clientId,
          requestPayload,
        );

    setCitations((current) => {
      const filtered = current.filter(
        (citation) => String(citation.id) !== String(savedCitation.id),
      );

      return [...filtered, savedCitation];
    });
  };

  return (
    <>
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
            <Button
              className="bg-[#022279] text-white"
              startContent={<Plus size={14} />}
              onPress={openAddCitationModal}
            >
              Add Citation
            </Button>
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
              }
            : {
                notes: "",
                password: "",
                profileUrl: "",
                status: "Not Synced",
                username: "",
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
