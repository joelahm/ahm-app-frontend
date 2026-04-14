"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import { EllipsisVertical, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";

import { aiPromptsApi, type AiPromptListItem } from "@/apis/ai-prompts";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";

interface AiPromptRow {
  createdBy: string;
  dateCreated: string;
  id: string;
  name: string;
  purpose: string;
  status: "Active" | "Draft";
}

const headerCellClass = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";

const formatDisplayDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const mapPromptToRow = (item: AiPromptListItem): AiPromptRow => ({
  createdBy: item.createdBy?.name || "-",
  dateCreated: formatDisplayDate(item.createdAt),
  id: item.id,
  name: item.name || item.typeOfPost || "-",
  purpose: item.purpose || "-",
  status: item.status === "Active" ? "Active" : "Draft",
});

export const SettingsAIHubContent = () => {
  const { session } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [rows, setRows] = useState<AiPromptRow[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    let isMounted = true;

    const loadPrompts = async () => {
      try {
        setLoadError("");
        const response = await aiPromptsApi.getPrompts(session.accessToken);

        if (!isMounted) {
          return;
        }

        setRows(response.aiPrompts.map(mapPromptToRow));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          error instanceof Error ? error.message : "Failed to load AI prompts.",
        );
        setRows([]);
      }
    };

    void loadPrompts();

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      [row.name, row.purpose, row.createdBy, row.status].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [rows, searchValue]);

  const columns = useMemo<DashboardDataTableColumn<AiPromptRow>[]>(
    () => [
      {
        className: headerCellClass,
        key: "name",
        label: "Name",
        renderCell: (item) => (
          <span className="text-sm font-medium text-[#1F2937]">
            {item.name}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "purpose",
        label: "Purpose",
        renderCell: (item) => (
          <span
            className="block max-w-[260px] truncate text-sm text-[#1F2937]"
            title={item.purpose}
          >
            {item.purpose}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "status",
        label: "Status",
        renderCell: (item) => (
          <Chip
            className="bg-[#D9F3FF] text-[#0284C7]"
            size="sm"
            variant="flat"
          >
            {item.status}
          </Chip>
        ),
      },
      {
        className: headerCellClass,
        key: "dateCreated",
        label: "Date Created",
        renderCell: (item) => (
          <span className="text-sm text-[#1F2937]">{item.dateCreated}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "createdBy",
        label: "Created by",
        renderCell: (item) => (
          <span className="text-sm text-[#1F2937]">{item.createdBy}</span>
        ),
      },
      {
        className: `${headerCellClass} text-right`,
        key: "action",
        label: "Action",
        renderCell: (item) => (
          <div className="flex justify-end">
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button isIconOnly radius="md" variant="bordered">
                  <EllipsisVertical size={18} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label={`AI prompt ${item.name} actions`}>
                <DropdownItem
                  key="edit"
                  as={Link}
                  href={`/dashboard/settings/ai-hub/${item.id}/edit`}
                  startContent={<Pencil className="text-[#4F46E5]" size={18} />}
                >
                  Edit
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  className="text-danger"
                  color="danger"
                  startContent={<Trash2 className="text-danger" size={18} />}
                >
                  Delete
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DashboardDataTable
      ariaLabel="AI prompts table"
      columns={columns}
      getRowKey={(item) => item.id}
      headerRight={
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Input
            className="w-full sm:w-[200px]"
            placeholder="Search here"
            radius="md"
            startContent={<Search className="text-default-400" size={20} />}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <Button
            as={Link}
            className="bg-[#022279] px-6 text-white"
            href="/dashboard/settings/ai-hub/new"
            radius="md"
          >
            New Prompt
          </Button>
        </div>
      }
      rows={filteredRows}
      title="AI Prompts"
      topContent={
        loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : undefined
      }
    />
  );
};
