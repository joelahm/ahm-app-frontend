"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import { Copy, EllipsisVertical, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";

import {
  generatedSchemasApi,
  type GeneratedSchemaListItem,
} from "@/apis/generated-schemas";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";

interface GeneratedSchemaRow {
  clientName: string;
  createdBy: string;
  id: string;
  previewJson: string;
  schemaType: string;
  updatedAt: string;
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

const schemaTypeLabelMap: Record<string, string> = {
  homepage: "Homepage",
  "location-page": "Location Page",
  "treatment-page": "Treatment Page",
};

const mapGeneratedSchemaToRow = (
  item: GeneratedSchemaListItem,
): GeneratedSchemaRow => ({
  clientName: item.clientName || "-",
  createdBy: item.createdBy?.name || "-",
  id: item.id,
  previewJson: item.previewJson,
  schemaType: schemaTypeLabelMap[item.schemaType] ?? item.schemaType,
  updatedAt: formatDisplayDate(item.updatedAt),
});

export const GeneratedSchemaListScreen = () => {
  const { getValidAccessToken, session } = useAuth();
  const [rows, setRows] = useState<GeneratedSchemaRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    let isMounted = true;

    const loadGeneratedSchemas = async () => {
      try {
        setLoadError("");
        const accessToken = await getValidAccessToken();
        const response =
          await generatedSchemasApi.getGeneratedSchemas(accessToken);

        if (!isMounted) {
          return;
        }

        setRows(response.generatedSchemas.map(mapGeneratedSchemaToRow));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load generated schemas.",
        );
        setRows([]);
      }
    };

    void loadGeneratedSchemas();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, session?.accessToken]);

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      [row.clientName, row.schemaType, row.createdBy].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [rows, searchValue]);

  const handleCopySchema = async (item: GeneratedSchemaRow) => {
    try {
      await navigator.clipboard.writeText(item.previewJson);
      setActionMessage("Schema copied.");
    } catch {
      setActionMessage("Failed to copy schema.");
    }
  };

  const handleDeleteSchema = async (item: GeneratedSchemaRow) => {
    if (!session?.accessToken) {
      return;
    }

    try {
      const accessToken = await getValidAccessToken();

      await generatedSchemasApi.deleteGeneratedSchema(accessToken, item.id);
      setRows((current) => current.filter((row) => row.id !== item.id));
      setActionMessage("Schema deleted.");
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "Failed to delete schema.",
      );
    }
  };

  const columns = useMemo<DashboardDataTableColumn<GeneratedSchemaRow>[]>(
    () => [
      {
        className: headerCellClass,
        key: "clientName",
        label: "Client Name",
        renderCell: (item) => (
          <span className="text-sm font-medium text-[#1F2937]">
            {item.clientName}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "schemaType",
        label: "Schema Type",
        renderCell: (item) => (
          <span className="text-sm text-[#1F2937]">{item.schemaType}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "updatedAt",
        label: "Last Updated",
        renderCell: (item) => (
          <span className="text-sm text-[#1F2937]">{item.updatedAt}</span>
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
              <DropdownMenu
                aria-label={`Generated schema ${item.clientName} actions`}
              >
                <DropdownItem
                  key="edit"
                  as={Link}
                  href={`/dashboard/schema-generator/${item.id}/edit`}
                  startContent={<Pencil className="text-[#4F46E5]" size={18} />}
                >
                  Edit
                </DropdownItem>
                <DropdownItem
                  key="copy-schema"
                  startContent={<Copy className="text-[#4F46E5]" size={18} />}
                  onPress={() => void handleCopySchema(item)}
                >
                  Copy Schema
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  className="text-danger"
                  color="danger"
                  startContent={<Trash2 className="text-danger" size={18} />}
                  onPress={() => void handleDeleteSchema(item)}
                >
                  Delete
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        ),
      },
    ],
    [session?.accessToken],
  );

  return (
    <DashboardDataTable
      ariaLabel="Generated schemas table"
      columns={columns}
      getRowKey={(item) => item.id}
      headerRight={
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Input
            className="w-full sm:w-[220px]"
            placeholder="Search here"
            radius="md"
            startContent={<Search className="text-default-400" size={20} />}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <Button
            as={Link}
            className="bg-[#022279] px-6 text-white"
            href="/dashboard/schema-generator/new"
            radius="md"
          >
            Create Schema
          </Button>
        </div>
      }
      rows={filteredRows}
      title="Generated Schemas"
      topContent={
        loadError || actionMessage ? (
          <div className="space-y-1">
            {loadError ? (
              <p className="text-sm text-danger">{loadError}</p>
            ) : null}
            {actionMessage ? (
              <p className="text-sm text-[#6B7280]">{actionMessage}</p>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
};
