"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import {
  ClipboardCheck,
  EllipsisVertical,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";

import {
  type ProjectTemplate,
  projectTemplatesApi,
} from "@/apis/project-templates";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { NewProjectTemplateModal } from "@/components/dashboard/settings/new-project-template-modal";
import { useAppToast } from "@/hooks/use-app-toast";

interface ProjectTemplateRow {
  createdBy: string;
  dateCreated: string;
  description: string;
  id: string;
  projectName: string;
  totalTasks: number;
}

const headerCellClass = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toProjectTemplateRow = (item: ProjectTemplate): ProjectTemplateRow => ({
  createdBy: item.createdBy.name || "-",
  dateCreated: formatDate(item.createdAt),
  description: item.description || "-",
  id: item.id,
  projectName: item.projectName,
  totalTasks: item.totalTasks,
});

export const SettingsProjectTemplatesContent = () => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [editingTemplate, setEditingTemplate] =
    useState<ProjectTemplate | null>(null);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);

  const loadProjectTemplates = useCallback(async () => {
    if (!session?.accessToken) {
      setTemplates([]);

      return;
    }

    try {
      setLoadError("");
      const accessToken = await getValidAccessToken();
      const response =
        await projectTemplatesApi.listProjectTemplates(accessToken);

      setTemplates(response.projectTemplates);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load project templates.",
      );
      setTemplates([]);
    }
  }, [getValidAccessToken, session?.accessToken]);

  useEffect(() => {
    void loadProjectTemplates();
  }, [loadProjectTemplates]);

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const rows = templates.map(toProjectTemplateRow);

    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      [row.projectName, row.description, row.createdBy].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [searchValue, templates]);

  const templateById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates],
  );

  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      if (!session?.accessToken) {
        toast.danger("Session expired", {
          description: "Please login again before deleting a template.",
        });

        return;
      }

      try {
        const accessToken = await getValidAccessToken();

        await projectTemplatesApi.deleteProjectTemplate(
          accessToken,
          templateId,
        );
        setTemplates((current) =>
          current.filter((template) => template.id !== templateId),
        );
        toast.success("Project template deleted successfully.");
      } catch (error) {
        toast.danger("Failed to delete project template", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    },
    [getValidAccessToken, session?.accessToken, toast],
  );

  const columns = useMemo<DashboardDataTableColumn<ProjectTemplateRow>[]>(
    () => [
      {
        className: headerCellClass,
        key: "projectName",
        label: "Project Name",
        renderCell: (item) => (
          <span className="text-sm font-medium text-[#1F2937]">
            {item.projectName}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "description",
        label: "Description",
        renderCell: (item) => (
          <span className="text-sm text-[#1F2937]">{item.description}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "totalTasks",
        label: "Total Tasks",
        renderCell: (item) => (
          <div className="flex items-center gap-3 text-sm text-[#1F2937]">
            <ClipboardCheck className="text-[#111827]" size={18} />
            <span>{item.totalTasks} tasks</span>
          </div>
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
              <DropdownMenu
                aria-label={`Project template ${item.projectName} actions`}
              >
                <DropdownItem
                  key="edit"
                  startContent={<Pencil className="text-[#4F46E5]" size={18} />}
                  onPress={() => {
                    const template = templateById.get(item.id);

                    if (!template) {
                      return;
                    }

                    setEditingTemplate(template);
                    setIsNewTemplateModalOpen(true);
                  }}
                >
                  Edit
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  className="text-danger"
                  color="danger"
                  startContent={<Trash2 className="text-danger" size={18} />}
                  onPress={() => {
                    void handleDeleteTemplate(item.id);
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
    [handleDeleteTemplate, templateById],
  );

  return (
    <>
      <DashboardDataTable
        ariaLabel="Project templates table"
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
              className="bg-[#022279] px-6 text-white"
              radius="md"
              onPress={() => {
                setEditingTemplate(null);
                setIsNewTemplateModalOpen(true);
              }}
            >
              New Project Template
            </Button>
          </div>
        }
        rows={filteredRows}
        title={
          <div className="space-y-1">
            <p>Project Templates</p>
            {loadError ? (
              <p className="text-sm font-normal text-danger">{loadError}</p>
            ) : null}
          </div>
        }
      />

      <NewProjectTemplateModal
        initialTemplate={editingTemplate}
        isOpen={isNewTemplateModalOpen}
        onCreated={loadProjectTemplates}
        onOpenChange={(open) => {
          setIsNewTemplateModalOpen(open);

          if (!open) {
            setEditingTemplate(null);
          }
        }}
      />
    </>
  );
};
