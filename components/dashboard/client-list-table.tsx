"use client";

import type { ClientDiscordStatus } from "@/apis/clients";

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
import { Spinner } from "@heroui/spinner";
import {
  CirclePause,
  CirclePlay,
  ChevronRight,
  Columns3,
  EllipsisVertical,
  Eye,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { DashboardTableAction } from "@/components/dashboard/dashboard-table-shell";
import {
  getClientStatusChipClassName,
  getClientStatusDisplay,
} from "@/lib/client-statuses";

export interface ClientRecord {
  id: string;
  clientName: string;
  address: string;
  projects: string[];
  niche: string;
  manager: string;
  managerAvatar: string;
  status: string;
  dateJoined: string;
  lastActivity: string;
  discordStatus?: ClientDiscordStatus | null;
  childCount?: number;
  groupKey?: string;
  groupRows?: ClientRecord[];
  isGroupedChild?: boolean;
  isDiscordStatusLoading?: boolean;
  kind?: "client" | "group";
}

interface ClientListTableProps {
  title?: string;
  headerActions?: DashboardTableAction[];
  rows?: ClientRecord[];
  columns?: DashboardDataTableColumn<ClientRecord>[];
  canRemoveClients?: boolean;
  onSetStatus?: (clientId: string, status: "Active" | "Inactive") => void;
  onRemove?: (clientId: string) => void;
}

const defaultHeaderActions: DashboardTableAction[] = [
  {
    key: "filter",
    label: "Filter",
    startContent: <SlidersHorizontal size={14} />,
  },
  {
    key: "show",
    label: "Show 10",
    startContent: <List size={14} />,
  },
  {
    key: "columns",
    label: "Columns",
    startContent: <Columns3 size={14} />,
  },
  {
    key: "add-client",
    label: "Add Client",
    color: "primary",
    variant: "solid",
    startContent: <Plus size={14} />,
  },
];

const defaultRows: ClientRecord[] = [];
const pageSizeOptions = [5, 10, 15, 20, 25, 50];

interface ClientRecordGroup {
  groupKey: string;
  parentRow: ClientRecord;
  rows: ClientRecord[];
}

const normalizeClientGroupName = (value: string) => {
  const normalizedValue = value.trim().replace(/\s+/g, " ");

  return normalizedValue ? normalizedValue.toLowerCase() : "unnamed-client";
};

const formatDiscordMessageDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: true,
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const ClientListTable = ({
  title = "Client List",
  headerActions = defaultHeaderActions,
  rows = defaultRows,
  columns,
  canRemoveClients = false,
  onRemove,
  onSetStatus,
}: ClientListTableProps) => {
  const [pendingRemoveClient, setPendingRemoveClient] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [discordFilter, setDiscordFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [projectFilter, setProjectFilter] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedClientGroups, setExpandedClientGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const resetFilters = () => {
    setDiscordFilter("all");
    setManagerFilter("all");
    setNicheFilter("all");
    setProjectFilter("all");
    setStatusFilter("all");
  };

  const defaultColumns = useMemo<DashboardDataTableColumn<ClientRecord>[]>(
    () => [
      {
        key: "clientName",
        label: "Client Name",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => {
          if (item.kind === "group" && item.groupKey) {
            const isExpanded = expandedClientGroups.has(item.groupKey);

            return (
              <button
                className="flex w-full items-center gap-3 text-left"
                type="button"
                onClick={() => {
                  setExpandedClientGroups((current) => {
                    const next = new Set(current);

                    if (next.has(item.groupKey ?? "")) {
                      next.delete(item.groupKey ?? "");
                    } else {
                      next.add(item.groupKey ?? "");
                    }

                    return next;
                  });
                }}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded border border-[#BFDBFE] bg-[#EFF6FF] text-[#022279]">
                  <ChevronRight
                    className={[
                      "transition-transform duration-200",
                      isExpanded ? "rotate-90" : "rotate-0",
                    ].join(" ")}
                    size={12}
                  />
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#111827]">
                    {item.clientName}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-[#0568C9]">
                    {item.childCount ?? 0} client records
                  </span>
                </span>
              </button>
            );
          }

          return (
            <div>
              <p className="text-sm text-[#111827]">{item.clientName}</p>
              <p className="text-xs text-[#9CA3AF]">{item.address}</p>
            </div>
          );
        },
      },
      {
        key: "projects",
        label: "Projects",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => {
          if (item.kind === "group") {
            return null;
          }

          return (
            <div className="flex flex-wrap gap-1">
              {item.projects.map((project) => (
                <Chip
                  key={`${item.id}-${project}`}
                  classNames={{
                    base: "bg-[#EEF2FF]",
                    content: "text-[#022279]",
                  }}
                  size="sm"
                  variant="flat"
                >
                  {project}
                </Chip>
              ))}
            </div>
          );
        },
      },
      {
        key: "niche",
        label: "Niche",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) =>
          item.kind === "group" ? null : (
            <span className="text-xs">{item.niche}</span>
          ),
      },
      {
        key: "manager",
        label: "Client Success Manager",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) =>
          item.kind === "group" ? null : (
            <div className="flex items-center gap-2">
              <Avatar
                className="h-8 w-8 shrink-0"
                name={item.manager}
                size="sm"
                src={item.managerAvatar || undefined}
              />
              <span className="text-sm">{item.manager}</span>
            </div>
          ),
      },
      {
        key: "status",
        label: "Status",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => {
          if (item.kind === "group") {
            return null;
          }

          return (
            <Chip
              className={getClientStatusChipClassName(item.status)}
              size="sm"
              variant="flat"
            >
              {getClientStatusDisplay(item.status)}
            </Chip>
          );
        },
      },
      {
        key: "discordStatus",
        label: "Discord Status",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => {
          if (item.kind === "group") {
            return null;
          }

          if (item.isDiscordStatusLoading) {
            return (
              <span className="inline-flex items-center gap-2 text-xs text-[#6B7280]">
                <Spinner size="sm" />
                Checking...
              </span>
            );
          }

          if (!item.discordStatus) {
            return (
              <span className="text-xs text-[#6B7280]">
                Unable to check Discord
              </span>
            );
          }

          if (item.discordStatus.status === "not_configured") {
            return (
              <span className="text-xs text-[#9CA3AF]">
                No Discord channel added
              </span>
            );
          }

          if (item.discordStatus.status === "invalid_channel") {
            return (
              <Chip color="danger" size="sm" variant="flat">
                Invalid channel
              </Chip>
            );
          }

          if (item.discordStatus.status === "empty") {
            return (
              <span className="text-xs text-[#6B7280]">
                Connected, no messages yet
              </span>
            );
          }

          if (
            item.discordStatus.status === "error" ||
            !item.discordStatus.lastMessage
          ) {
            return (
              <Chip color="warning" size="sm" variant="flat">
                Unable to read messages
              </Chip>
            );
          }

          return (
            <div className="min-w-[190px]">
              <p className="text-xs font-medium text-[#111827]">
                {item.discordStatus.lastMessage.authorName || "Unknown user"}
              </p>
              <p className="text-xs text-[#6B7280]">
                {formatDiscordMessageDate(
                  item.discordStatus.lastMessage.createdAt,
                )}
              </p>
            </div>
          );
        },
      },
      {
        key: "dateJoined",
        label: "Date Joined",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => (
          <span className="text-xs">
            {item.kind === "group" ? null : item.dateJoined}
          </span>
        ),
      },
      {
        key: "lastActivity",
        label: "Last Activity",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => (
          <span className="text-xs">
            {item.kind === "group" ? null : item.lastActivity}
          </span>
        ),
      },
      {
        key: "action",
        label: "Action",
        className:
          "text-xs font-medium text-[#111827] bg-[#F9FAFB] !rounded-none",
        renderCell: (item) => {
          if (item.kind === "group") {
            return null;
          }

          return (
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/clients/${item.id}`}>
                <Button isIconOnly radius="sm" size="sm" variant="bordered">
                  <Eye size={14} />
                </Button>
              </Link>
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button isIconOnly radius="sm" size="sm" variant="bordered">
                    <EllipsisVertical size={14} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label={`Client ${item.clientName} actions`}
                  onAction={(actionKey) => {
                    if (actionKey === "set-inactive") {
                      onSetStatus?.(item.id, "Inactive");

                      return;
                    }

                    if (actionKey === "set-active") {
                      onSetStatus?.(item.id, "Active");

                      return;
                    }

                    if (actionKey === "remove") {
                      setPendingRemoveClient({
                        id: item.id,
                        name: item.clientName,
                      });
                    }
                  }}
                >
                  {item.status.trim().toLowerCase() === "active" ? (
                    <DropdownItem
                      key="set-inactive"
                      startContent={
                        <CirclePause className="text-[#0568C9]" size={16} />
                      }
                    >
                      Set Inactive
                    </DropdownItem>
                  ) : (
                    <DropdownItem
                      key="set-active"
                      startContent={
                        <CirclePlay className="text-[#0568C9]" size={16} />
                      }
                    >
                      Set Active
                    </DropdownItem>
                  )}
                  {canRemoveClients ? (
                    <DropdownItem
                      key="remove"
                      className="text-danger"
                      color="danger"
                      startContent={
                        <Trash2 className="text-danger" size={16} />
                      }
                    >
                      Remove
                    </DropdownItem>
                  ) : null}
                </DropdownMenu>
              </Dropdown>
            </div>
          );
        },
      },
    ],
    [canRemoveClients, expandedClientGroups, onSetStatus],
  );
  const baseColumns = columns ?? defaultColumns;
  const toggleableColumns = useMemo(
    () => baseColumns.filter((column) => column.key !== "action"),
    [baseColumns],
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(
    () => new Set(toggleableColumns.map((column) => column.key)),
  );
  const addClientAction = useMemo(
    () => headerActions.find((action) => action.key === "add-client"),
    [headerActions],
  );
  const managerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.manager.trim())
            .filter((value) => value && value !== "-"),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [rows],
  );
  const nicheOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.niche.trim())
            .filter((value) => value && value !== "-"),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [rows],
  );
  const visibleColumns = useMemo(
    () =>
      baseColumns.filter(
        (column) =>
          column.key === "action" || visibleColumnKeys.has(column.key),
      ),
    [baseColumns, visibleColumnKeys],
  );
  const alphabeticalRows = useMemo(
    () =>
      [...rows].sort((left, right) => {
        const nameComparison = left.clientName.localeCompare(
          right.clientName,
          undefined,
          { sensitivity: "base" },
        );

        if (nameComparison !== 0) {
          return nameComparison;
        }

        const addressComparison = left.address.localeCompare(
          right.address,
          undefined,
          { sensitivity: "base" },
        );

        if (addressComparison !== 0) {
          return addressComparison;
        }

        return left.id.localeCompare(right.id, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }),
    [rows],
  );
  const filteredRows = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return alphabeticalRows.filter((row) => {
      const normalizedStatus = row.status.trim().toLowerCase();
      const normalizedDiscordStatus = row.discordStatus?.status ?? "unknown";

      if (statusFilter !== "all" && normalizedStatus !== statusFilter) {
        return false;
      }

      if (managerFilter !== "all" && row.manager !== managerFilter) {
        return false;
      }

      if (nicheFilter !== "all" && row.niche !== nicheFilter) {
        return false;
      }

      if (projectFilter === "has-projects" && row.projects.length === 0) {
        return false;
      }

      if (projectFilter === "no-projects" && row.projects.length > 0) {
        return false;
      }

      if (
        discordFilter !== "all" &&
        normalizedDiscordStatus !== discordFilter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        row.clientName,
        row.address,
        row.niche,
        row.manager,
        row.status,
        row.projects.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [
    discordFilter,
    managerFilter,
    nicheFilter,
    projectFilter,
    alphabeticalRows,
    searchValue,
    statusFilter,
  ]);
  const clientGroups = useMemo<ClientRecordGroup[]>(() => {
    const groups = new Map<string, ClientRecord[]>();
    const groupOrder: string[] = [];

    filteredRows.forEach((row) => {
      const groupKey = normalizeClientGroupName(row.clientName);

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
        groupOrder.push(groupKey);
      }

      groups.get(groupKey)?.push(row);
    });

    return groupOrder.map((groupKey) => {
      const groupRows = groups.get(groupKey) ?? [];
      const firstRow = groupRows[0];
      const parentRow: ClientRecord = {
        ...firstRow,
        address:
          groupRows.length > 1
            ? "Grouped duplicate client name"
            : firstRow.address,
        childCount: groupRows.length,
        groupKey,
        groupRows,
        id: `group:${groupKey}`,
        kind: "group",
        lastActivity: "-",
        status: "Group",
      };

      return {
        groupKey,
        parentRow,
        rows: groupRows,
      };
    });
  }, [filteredRows]);
  const totalGroupPages = Math.max(
    1,
    Math.ceil(clientGroups.length / Math.max(1, pageSize)),
  );
  const safePage = Math.min(Math.max(1, page), totalGroupPages);
  const visibleClientGroups = useMemo(() => {
    const start = (safePage - 1) * pageSize;

    return clientGroups.slice(start, start + pageSize);
  }, [clientGroups, pageSize, safePage]);
  const groupedRows = useMemo<ClientRecord[]>(
    () =>
      visibleClientGroups.flatMap((group) => {
        if (!expandedClientGroups.has(group.groupKey)) {
          return [group.parentRow];
        }

        return [
          group.parentRow,
          ...group.rows.map((row) => ({
            ...row,
            groupKey: group.groupKey,
            isGroupedChild: true,
            kind: "client" as const,
          })),
        ];
      }),
    [expandedClientGroups, visibleClientGroups],
  );

  useEffect(() => {
    setPage(1);
  }, [
    discordFilter,
    managerFilter,
    nicheFilter,
    pageSize,
    projectFilter,
    searchValue,
    statusFilter,
  ]);

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), totalGroupPages));
  }, [totalGroupPages]);

  const headerRight = (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown>
        <DropdownTrigger>
          <Button
            startContent={<SlidersHorizontal size={14} />}
            variant="bordered"
          >
            Filter
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Client filters"
          className="min-w-64"
          closeOnSelect={false}
        >
          <DropdownItem key="status-filter" textValue="Status filter">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#4B5563]">Status</p>
              <select
                className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </DropdownItem>
          <DropdownItem key="manager-filter" textValue="Manager filter">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#4B5563]">
                Client Success Manager
              </p>
              <select
                className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                value={managerFilter}
                onChange={(event) => setManagerFilter(event.target.value)}
              >
                <option value="all">All managers</option>
                {managerOptions.map((manager) => (
                  <option key={manager} value={manager}>
                    {manager}
                  </option>
                ))}
              </select>
            </div>
          </DropdownItem>
          <DropdownItem key="niche-filter" textValue="Niche filter">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#4B5563]">Niche</p>
              <select
                className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                value={nicheFilter}
                onChange={(event) => setNicheFilter(event.target.value)}
              >
                <option value="all">All niches</option>
                {nicheOptions.map((niche) => (
                  <option key={niche} value={niche}>
                    {niche}
                  </option>
                ))}
              </select>
            </div>
          </DropdownItem>
          <DropdownItem key="discord-filter" textValue="Discord filter">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#4B5563]">Discord</p>
              <select
                className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                value={discordFilter}
                onChange={(event) => setDiscordFilter(event.target.value)}
              >
                <option value="all">All Discord states</option>
                <option value="ok">Connected</option>
                <option value="not_configured">No channel</option>
                <option value="invalid_channel">Invalid channel</option>
                <option value="error">Error</option>
              </select>
            </div>
          </DropdownItem>
          <DropdownItem key="projects-filter" textValue="Projects filter">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#4B5563]">Projects</p>
              <select
                className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
              >
                <option value="all">All clients</option>
                <option value="has-projects">Has projects</option>
                <option value="no-projects">No projects</option>
              </select>
            </div>
          </DropdownItem>
          <DropdownItem key="reset-filters" textValue="Reset filters">
            <Button
              fullWidth
              radius="sm"
              variant="bordered"
              onPress={resetFilters}
            >
              Reset
            </Button>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
      <Dropdown>
        <DropdownTrigger>
          <Button startContent={<List size={14} />} variant="bordered">
            Show {pageSize}
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Rows per page"
          selectedKeys={new Set([String(pageSize)])}
          selectionMode="single"
          onSelectionChange={(keys) => {
            const selected = Array.from(keys as Set<string>)[0];

            if (selected) {
              setPageSize(Number(selected));
              setPage(1);
            }
          }}
        >
          {pageSizeOptions.map((option) => (
            <DropdownItem key={String(option)}>{option}</DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
      <Dropdown closeOnSelect={false}>
        <DropdownTrigger>
          <Button startContent={<Columns3 size={14} />} variant="bordered">
            Columns
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label="Visible client columns" closeOnSelect={false}>
          {toggleableColumns.map((column) => (
            <DropdownItem
              key={column.key}
              textValue={column.label}
              onPress={() => {
                setVisibleColumnKeys((current) => {
                  const next = new Set(current);

                  if (next.has(column.key)) {
                    next.delete(column.key);
                  } else {
                    next.add(column.key);
                  }

                  return next;
                });
              }}
            >
              <Checkbox
                className="pointer-events-none"
                isSelected={visibleColumnKeys.has(column.key)}
              >
                {column.label}
              </Checkbox>
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
      <Input
        className="w-64"
        placeholder="Search clients"
        startContent={<Search className="text-default-400" size={16} />}
        value={searchValue}
        onValueChange={setSearchValue}
      />
      {addClientAction ? (
        <Button
          className="bg-[#022279] text-white"
          startContent={addClientAction.startContent}
          variant={addClientAction.variant ?? "solid"}
          onPress={addClientAction.onPress}
        >
          {addClientAction.label}
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <DashboardDataTable
        serverPagination
        showPagination
        ariaLabel="Client list"
        columns={visibleColumns}
        currentPage={safePage}
        getCellProps={(item, _column, columnIndex) => {
          if (item.kind !== "group") {
            return undefined;
          }

          if (columnIndex === 0) {
            return {
              colSpan: visibleColumns.length,
            };
          }

          return {
            hidden: true,
          };
        }}
        getRowKey={(item) => item.id}
        getRowProps={(item) => ({
          className:
            item.kind === "group"
              ? "bg-[#F8FBFF]"
              : item.isGroupedChild
                ? "bg-white"
                : undefined,
        })}
        headerRight={headerRight}
        pageSize={pageSize}
        rows={groupedRows}
        title={title}
        totalPages={totalGroupPages}
        onPageChange={setPage}
      />

      <Modal
        isDismissable
        isOpen={Boolean(pendingRemoveClient)}
        placement="center"
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemoveClient(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader className="text-lg font-semibold text-[#111827]">
            Confirm Delete
          </ModalHeader>
          <ModalBody className="pb-2 pt-0 text-sm text-[#4B5563]">
            {pendingRemoveClient ? (
              <p>
                Are you sure you want to remove{" "}
                <span className="font-medium text-[#111827]">
                  {pendingRemoveClient.name}
                </span>
                ? This action cannot be undone.
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              radius="md"
              variant="bordered"
              onPress={() => {
                setPendingRemoveClient(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-danger text-white"
              color="danger"
              radius="md"
              onPress={() => {
                if (pendingRemoveClient) {
                  onRemove?.(pendingRemoveClient.id);
                }

                setPendingRemoveClient(null);
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
