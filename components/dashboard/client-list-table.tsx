"use client";

import { useMemo } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Columns3,
  EllipsisVertical,
  Eye,
  List,
  Plus,
  SlidersHorizontal,
} from "lucide-react";

import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { DashboardTableAction } from "@/components/dashboard/dashboard-table-shell";
import Link from "next/link";

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
}

interface ClientListTableProps {
  title?: string;
  headerActions?: DashboardTableAction[];
  rows?: ClientRecord[];
  columns?: DashboardDataTableColumn<ClientRecord>[];
}

const baseRows: ClientRecord[] = [
  {
    id: "1",
    clientName: "RCG Health",
    address: "123 ABC Rd, 90987, UK",
    projects: ["Website", "Accelerator", "+2"],
    niche: "General Surgeon",
    manager: "Harsh P",
    managerAvatar: "https://i.pravatar.cc/100?img=11",
    status: "Active",
    dateJoined: "30 Dec, 2024 10:00AM",
    lastActivity: "30 Dec, 2024 10:00AM",
  },
  {
    id: "2",
    clientName: "Mr Vikas Acharya",
    address: "123 ABC Rd, 90987, UK",
    projects: ["Accelerator"],
    niche: "ENT Surgeon",
    manager: "Harsh P",
    managerAvatar: "https://i.pravatar.cc/100?img=11",
    status: "Active",
    dateJoined: "30 Dec, 2024 10:00AM",
    lastActivity: "30 Dec, 2024 10:00AM",
  },
  {
    id: "3",
    clientName: "Midlands Colorectal",
    address: "123 ABC Rd, 90987, UK",
    projects: ["Accelerator"],
    niche: "General Surgeon",
    manager: "Harsh P",
    managerAvatar: "https://i.pravatar.cc/100?img=11",
    status: "Active",
    dateJoined: "30 Dec, 2024 10:00AM",
    lastActivity: "30 Dec, 2024 10:00AM",
  },
  {
    id: "4",
    clientName: "Dr Vinita Singh",
    address: "123 ABC Rd, 90987, UK",
    projects: ["Accelerator"],
    niche: "General Surgeon",
    manager: "Harsh P",
    managerAvatar: "https://i.pravatar.cc/100?img=11",
    status: "Active",
    dateJoined: "30 Dec, 2024 10:00AM",
    lastActivity: "30 Dec, 2024 10:00AM",
  },
];

const generatedRows: ClientRecord[] = Array.from({ length: 96 }, (_, index) => {
  const id = String(index + 5);

  return {
    id,
    clientName: `Client ${id}`,
    address: `${100 + index} ABC Rd, 90987, UK`,
    projects: index % 3 === 0 ? ["Website", "Accelerator"] : ["Accelerator"],
    niche: index % 2 === 0 ? "General Surgeon" : "ENT Surgeon",
    manager: "Harsh P",
    managerAvatar: "https://i.pravatar.cc/100?img=11",
    status: "Active",
    dateJoined: "30 Dec, 2024 10:00AM",
    lastActivity: "30 Dec, 2024 10:00AM",
  };
});

const defaultRows: ClientRecord[] = [...baseRows, ...generatedRows];

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

export const ClientListTable = ({
  title = "Client List",
  headerActions = defaultHeaderActions,
  rows = defaultRows,
  columns,
}: ClientListTableProps) => {
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
            <Avatar name={item.manager} size="sm" src={item.managerAvatar} />
            <span className="text-sm">{item.manager}</span>
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        className: "text-xs font-medium text-[#111827] bg-[#F9FAFB]",
        renderCell: (item) => (
          <Chip color="success" size="sm" variant="flat">
            {item.status}
          </Chip>
        ),
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
            <Button isIconOnly radius="sm" size="sm" variant="bordered">
              <EllipsisVertical size={14} />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
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
  );
};
