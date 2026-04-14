"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import { EllipsisVertical, List, Search } from "lucide-react";

import {
  citationDatabaseApi,
  type CitationDatabaseItem,
} from "@/apis/citation-database";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import {
  AddSingleCitationModal,
  type AddSingleCitationFormValues,
} from "@/components/dashboard/settings/add-single-citation-modal";
import {
  ImportBulkCitationsModal,
  type ImportedCitationRow,
} from "@/components/dashboard/settings/import-bulk-citations-modal";

interface CitationDatabaseRow {
  da: number;
  directorySite: string;
  id: string;
  niche: string;
  payment: string;
  type: string;
  validationLink: string;
}

const headerCellClass = "bg-[#F9FAFB] text-xs font-medium text-[#111827]";

const buildAvatarLabel = (value: string) => {
  const words = value.split(" ").filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase();
  }

  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
};

const mapCitationToRow = (item: CitationDatabaseItem): CitationDatabaseRow => ({
  da: item.da,
  directorySite: item.name,
  id: item.id,
  niche: item.niche,
  payment: item.payment,
  type: item.type,
  validationLink: item.validationLink,
});

export const SettingsCitationDatabaseContent = () => {
  const { session } = useAuth();
  const [editingCitation, setEditingCitation] =
    useState<CitationDatabaseRow | null>(null);
  const [rows, setRows] = useState<CitationDatabaseRow[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddCitationModalOpen, setIsAddCitationModalOpen] = useState(false);
  const [isImportBulkModalOpen, setIsImportBulkModalOpen] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadCitations = useCallback(async () => {
    if (!session?.accessToken) {
      setRows([]);

      return;
    }

    try {
      setLoadError("");
      const response = await citationDatabaseApi.listCitations(
        session.accessToken,
      );

      setRows(response.citations.map(mapCitationToRow));
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load citation database.",
      );
      setRows([]);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void loadCitations();
  }, [loadCitations]);

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.directorySite,
        row.type,
        row.niche,
        row.validationLink,
        row.payment,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [rows, searchValue]);

  const handleAddCitation = async (payload: AddSingleCitationFormValues) => {
    if (!session?.accessToken) {
      throw new Error("You must be signed in to add a citation.");
    }

    const requestBody = {
      da: Number(payload.da),
      name: payload.name,
      niche: payload.niche,
      payment: payload.payment,
      type: payload.type,
      validationLink: payload.validationLink,
    };

    if (editingCitation) {
      await citationDatabaseApi.updateCitation(
        session.accessToken,
        editingCitation.id,
        requestBody,
      );
    } else {
      await citationDatabaseApi.createCitation(
        session.accessToken,
        requestBody,
      );
    }

    await loadCitations();
    setCurrentPage(1);
    setEditingCitation(null);
  };

  const handleImportBulkCitations = async (
    importedRows: ImportedCitationRow[],
  ) => {
    if (!session?.accessToken) {
      throw new Error("You must be signed in to import citations.");
    }

    await citationDatabaseApi.bulkCreateCitations(session.accessToken, {
      citations: importedRows.map((row) => ({
        da: Number(row.da),
        name: row.directorySite,
        niche: row.niche,
        payment: row.payment,
        type: row.type,
        validationLink: row.validationLink,
      })),
    });

    await loadCitations();
    setCurrentPage(1);
  };

  const handleDeleteCitation = async (citationId: string) => {
    if (!session?.accessToken) {
      throw new Error("You must be signed in to delete a citation.");
    }

    try {
      await citationDatabaseApi.deleteCitation(session.accessToken, citationId);
      await loadCitations();
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to delete citation.",
      );
    }
  };

  const columns = useMemo<DashboardDataTableColumn<CitationDatabaseRow>[]>(
    () => [
      {
        className: headerCellClass,
        key: "directorySite",
        label: "Directory / Site",
        renderCell: (item) => (
          <div className="flex items-center gap-3">
            <Avatar
              className="h-10 w-10 border border-default-200 bg-white text-sm font-semibold text-[#4B5563]"
              name={buildAvatarLabel(item.directorySite)}
              radius="full"
            />
            <span className="text-sm font-medium text-[#1F2937]">
              {item.directorySite}
            </span>
          </div>
        ),
      },
      {
        className: headerCellClass,
        key: "type",
        label: "Type",
        renderCell: (item) => (
          <span className="text-sm text-[#4B5563]">{item.type}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "niche",
        label: "Niche",
        renderCell: (item) => (
          <span className="text-sm text-[#4B5563]">{item.niche}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "validationLink",
        label: "Validation link",
        renderCell: (item) => (
          <span className="text-sm text-[#4B5563]">{item.validationLink}</span>
        ),
      },
      {
        className: `${headerCellClass} text-center`,
        key: "da",
        label: "DA",
        renderCell: (item) => (
          <span className="block text-center text-sm text-[#4B5563]">
            {item.da}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "payment",
        label: "Payment",
        renderCell: (item) => (
          <span className="text-sm text-[#4B5563]">{item.payment}</span>
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
                  <EllipsisVertical size={16} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label={`Citation ${item.directorySite} actions`}
              >
                <DropdownItem
                  key="edit"
                  onPress={() => {
                    setEditingCitation(item);
                    setIsAddCitationModalOpen(true);
                  }}
                >
                  Edit
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  className="text-danger"
                  color="danger"
                  onPress={() => {
                    void handleDeleteCitation(item.id);
                  }}
                >
                  Delete
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        ),
      },
    ],
    [handleDeleteCitation],
  );

  return (
    <>
      <DashboardDataTable
        ariaLabel="Citation database table"
        columns={columns}
        currentPage={currentPage}
        getRowKey={(item) => item.id}
        headerRight={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button startContent={<List size={18} />} variant="bordered">
              Show 10
            </Button>
            <Input
              className="w-full sm:w-[240px]"
              placeholder="Search here"
              radius="md"
              startContent={<Search className="text-default-400" size={18} />}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <Button
              className="bg-primary text-white"
              onPress={() => setIsImportBulkModalOpen(true)}
            >
              Import Bulk Citations
            </Button>
            <Button
              className="bg-primary text-white"
              onPress={() => {
                setEditingCitation(null);
                setIsAddCitationModalOpen(true);
              }}
            >
              Add Citation
            </Button>
          </div>
        }
        pageSize={10}
        rows={filteredRows}
        showPagination={true}
        title={
          <div className="space-y-1">
            <p>Local Citations</p>
            {loadError ? (
              <p className="text-sm font-normal text-danger">{loadError}</p>
            ) : null}
          </div>
        }
        onPageChange={setCurrentPage}
      />
      <AddSingleCitationModal
        initialValues={
          editingCitation
            ? {
                da: String(editingCitation.da),
                name: editingCitation.directorySite,
                niche: editingCitation.niche,
                payment: editingCitation.payment,
                type: editingCitation.type,
                validationLink: editingCitation.validationLink,
              }
            : null
        }
        isOpen={isAddCitationModalOpen}
        submitLabel={editingCitation ? "Update" : "Save"}
        title={
          editingCitation
            ? "Edit Single Citation in Database"
            : "Add Single Citation to Database"
        }
        onOpenChange={(open) => {
          setIsAddCitationModalOpen(open);

          if (!open) {
            setEditingCitation(null);
          }
        }}
        onSubmit={handleAddCitation}
      />
      <ImportBulkCitationsModal
        isOpen={isImportBulkModalOpen}
        onImport={handleImportBulkCitations}
        onOpenChange={setIsImportBulkModalOpen}
      />
    </>
  );
};
