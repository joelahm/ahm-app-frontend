"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Select, SelectItem } from "@heroui/select";
import { Eye, ListOrdered, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  clientsApi,
  type ClientApiItem,
  type ClientGbpPosting,
} from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { useAppToast } from "@/hooks/use-app-toast";

type GooglePostRow = {
  assigneeAvatar: string | undefined;
  assigneeName: string;
  clientId: string;
  clientName: string;
  datePublished: string;
  description: string;
  id: string;
  images: string[];
  keyword: string;
  lastDateUpdated: string;
  liveLink: string;
  status: string;
  type: string;
};

const headerCellClass = "bg-[#F9FAFB] text-xs font-medium text-[#111827]";
const typeChipClass = "bg-[#B9EFFF] text-[#0284C7]";
const statusChipClass = "bg-[#B9EFFF] text-[#0284C7]";

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const resolveServerAssetUrl = (value?: string | null) => {
  if (!value) return undefined;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  const normalizedPath = value.replace(/^\/+/, "");

  return baseUrl ? `${baseUrl}/${normalizedPath}` : value;
};

const getClientLabel = (client: ClientApiItem) =>
  client.clientName?.trim() ||
  client.businessName?.trim() ||
  `Client ${String(client.id)}`;

const mapPostingToRow = (
  posting: ClientGbpPosting,
  client: ClientApiItem,
): GooglePostRow => ({
  assigneeAvatar: resolveServerAssetUrl(posting.assignee?.avatar),
  assigneeName: posting.assignee?.name ?? "-",
  clientId: String(posting.clientId || client.id),
  clientName: getClientLabel(client),
  datePublished: formatDateTime(posting.publishedAt),
  description: posting.description ?? posting.postContent ?? "-",
  id: String(posting.id),
  images: posting.images,
  keyword: posting.keyword,
  lastDateUpdated: formatDateTime(posting.updatedAt),
  liveLink: posting.liveLink ?? "",
  status: posting.status,
  type: posting.contentType,
});

export const GooglePostsScreen = () => {
  const { getValidAccessToken, session } = useAuth();
  const router = useRouter();
  const toast = useAppToast();
  const toastRef = useRef(toast);
  const [clients, setClients] = useState<ClientApiItem[]>([]);
  const [rows, setRows] = useState<GooglePostRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const clientFilterOptions = useMemo(
    () => [
      { id: "all", label: "All Clients" },
      ...clients.map((client) => ({
        id: String(client.id),
        label: getClientLabel(client),
      })),
    ],
    [clients],
  );

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const loadData = useCallback(async () => {
    if (!session) {
      setClients([]);
      setRows([]);
      return;
    }

    setIsLoading(true);

    try {
      const accessToken = await getValidAccessToken();
      const loadedClients = await clientsApi.getClients(accessToken);
      const targetClients =
        selectedClientId === "all"
          ? loadedClients
          : loadedClients.filter(
              (client) => String(client.id) === selectedClientId,
            );
      const postingResults = await Promise.allSettled(
        targetClients.map(async (client) => {
          const response = await clientsApi.listClientGbpPostings(
            accessToken,
            client.id,
          );

          return response.postings.map((posting) =>
            mapPostingToRow(posting, client),
          );
        }),
      );

      setClients(loadedClients);
      setRows(
        postingResults.flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        ),
      );
    } catch (error) {
      setRows([]);
      toastRef.current.danger("Failed to load Google posts.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getValidAccessToken, selectedClientId, session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const columns = useMemo<DashboardDataTableColumn<GooglePostRow>[]>(
    () => [
      {
        className: headerCellClass,
        key: "client",
        label: "Client",
        renderCell: (item) => (
          <span className="text-sm font-medium text-[#111827]">
            {item.clientName}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "keyword",
        label: "Keyword",
        renderCell: (item) => (
          <Chip className="bg-[#E5ECFD] text-[#0E3DA8]" radius="full" size="sm">
            {item.keyword}
          </Chip>
        ),
      },
      {
        className: headerCellClass,
        key: "assignee",
        label: "Assignee",
        renderCell: (item) => (
          <div className="flex items-center gap-2">
            <Avatar
              className="h-8 w-8 flex-none"
              name={item.assigneeName}
              src={item.assigneeAvatar}
            />
            <span className="text-sm text-[#111827]">{item.assigneeName}</span>
          </div>
        ),
      },
      {
        className: headerCellClass,
        key: "description",
        label: "Description",
        renderCell: (item) => (
          <span className="line-clamp-2 max-w-[220px] text-sm text-[#111827]">
            {item.description}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "images",
        label: "Images",
        renderCell: (item) => (
          <div className="flex items-center">
            {item.images.slice(0, 2).map((image, index) => (
              <Avatar
                key={`${item.id}-image-${image}-${index}`}
                className={`h-8 w-8 border border-white grayscale ${index > 0 ? "-ml-2" : ""}`}
                src={image}
              />
            ))}
          </div>
        ),
      },
      {
        className: headerCellClass,
        key: "type",
        label: "Type",
        renderCell: (item) => (
          <Chip className={typeChipClass} radius="full" size="sm">
            {item.type}
          </Chip>
        ),
      },
      {
        className: headerCellClass,
        key: "status",
        label: "Status",
        renderCell: (item) => (
          <Chip className={statusChipClass} radius="full" size="sm">
            {item.status}
          </Chip>
        ),
      },
      {
        className: headerCellClass,
        key: "live-link",
        label: "Link to live link",
        renderCell: (item) =>
          item.liveLink ? (
            <a
              className="text-sm text-[#0E3DA8] underline"
              href={item.liveLink}
              rel="noreferrer"
              target="_blank"
            >
              {item.liveLink}
            </a>
          ) : (
            <span className="text-sm text-[#6B7280]">-</span>
          ),
      },
      {
        className: headerCellClass,
        key: "last-updated",
        label: "Last Date Updated",
        renderCell: (item) => (
          <span className="text-sm text-[#111827]">{item.lastDateUpdated}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "date-published",
        label: "Date Published",
        renderCell: (item) => (
          <span className="text-sm text-[#111827]">{item.datePublished}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "action",
        label: "Action",
        renderCell: (item) => (
          <Button
            size="sm"
            startContent={<Eye size={14} />}
            variant="bordered"
            onPress={() => {
              router.push(
                `/dashboard/clients/${item.clientId}/gbp-postings?postId=${item.id}`,
              );
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [router],
  );

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Google Posts</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Review draft and published GBP posts across all clients.
        </p>
      </div>

      <DashboardDataTable
        showPagination
        ariaLabel="Google posts table"
        columns={columns}
        getRowKey={(item) => `${item.clientId}-${item.id}`}
        headerRight={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Select
              aria-label="Filter by client"
              className="w-64"
              selectedKeys={[selectedClientId]}
              size="sm"
              onSelectionChange={(keys) => {
                const key = keys === "all" ? "all" : keys.currentKey || "all";
                setSelectedClientId(String(key));
              }}
            >
              {clientFilterOptions.map((client) => (
                <SelectItem key={client.id}>{client.label}</SelectItem>
              ))}
            </Select>
            <Button
              startContent={<SlidersHorizontal size={16} />}
              variant="bordered"
            >
              Filter
            </Button>
            <Button
              isLoading={isLoading}
              startContent={!isLoading ? <RefreshCw size={16} /> : null}
              variant="bordered"
              onPress={() => void loadData()}
            >
              Refresh
            </Button>
          </div>
        }
        pageSize={10}
        rows={rows}
        title={isLoading ? "All Google Posts (Loading...)" : "All Google Posts"}
        headerActions={[
          {
            key: "show-10",
            label: "Show 10",
            startContent: <ListOrdered size={14} />,
            variant: "bordered",
          },
        ]}
      />
    </section>
  );
};
