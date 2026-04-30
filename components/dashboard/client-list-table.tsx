"use client";

import type { ClientDiscordStatus } from "@/apis/clients";

import { useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
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
import { Spinner } from "@heroui/spinner";
import {
  CirclePause,
  CirclePlay,
  Columns3,
  EllipsisVertical,
  Eye,
  List,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { DashboardTableAction } from "@/components/dashboard/dashboard-table-shell";

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
  isDiscordStatusLoading?: boolean;
}

interface ClientListTableProps {
  title?: string;
  headerActions?: DashboardTableAction[];
  rows?: ClientRecord[];
  columns?: DashboardDataTableColumn<ClientRecord>[];
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
  onRemove,
  onSetStatus,
}: ClientListTableProps) => {
  const [pendingRemoveClient, setPendingRemoveClient] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const defaultColumns = useMemo<DashboardDataTableColumn<ClientRecord>[]>(
    () => [
      {
        key: "clientName",
        label: "Client Name",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => (
          <div>
            <p className="text-sm text-[#111827]">{item.clientName}</p>
            <p className="text-xs text-[#9CA3AF]">{item.address}</p>
          </div>
        ),
      },
      {
        key: "projects",
        label: "Projects",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => (
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
        ),
      },
      {
        key: "niche",
        label: "Niche",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => <span className="text-xs">{item.niche}</span>,
      },
      {
        key: "manager",
        label: "Client Success Manager",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => (
          <div className="flex items-center gap-2">
            <Avatar
              className="shrink-0 w-8 h-8"
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
          const normalizedStatus = item.status.trim().toLowerCase();
          const isActive = normalizedStatus === "active";

          return (
            <Chip
              color={isActive ? "success" : "default"}
              size="sm"
              variant="flat"
            >
              {item.status}
            </Chip>
          );
        },
      },
      {
        key: "discordStatus",
        label: "Discord Status",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => {
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
          <span className="text-xs">{item.dateJoined}</span>
        ),
      },
      {
        key: "lastActivity",
        label: "Last Activity",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => (
          <span className="text-xs">{item.lastActivity}</span>
        ),
      },
      {
        key: "action",
        label: "Action",
        className:
          "text-xs font-medium text-[#111827] bg-[#F9FAFB] !rounded-none",
        renderCell: (item) => (
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
                <DropdownItem
                  key="remove"
                  className="text-danger"
                  color="danger"
                  startContent={<Trash2 className="text-danger" size={16} />}
                >
                  Remove
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        ),
      },
    ],
    [onRemove, onSetStatus],
  );

  return (
    <>
      <DashboardDataTable
        enableSelection
        showPagination
        ariaLabel="Client list"
        columns={columns ?? defaultColumns}
        getRowKey={(item) => item.id}
        headerActions={headerActions}
        pageSize={8}
        rows={rows}
        title={title}
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
