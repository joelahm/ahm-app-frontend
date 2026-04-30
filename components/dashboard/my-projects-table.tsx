"use client";

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
import { Drawer, DrawerBody, DrawerContent } from "@heroui/drawer";
import { Input } from "@heroui/input";
import {
  Columns3,
  EllipsisVertical,
  List,
  ListTodo,
  Search,
  Trash2,
} from "lucide-react";

import { clientsApi } from "@/apis/clients";
import { projectTemplatesApi } from "@/apis/project-templates";
import { useAuth } from "@/components/auth/auth-context";
import { ViewTaskListsPanelContent } from "@/components/dashboard/client-details/view-task-lists-panel-content";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { useAppToast } from "@/hooks/use-app-toast";

type MyProjectRow = {
  accountManager: {
    avatar?: string;
    name: string;
  };
  clientId: string;
  clientName: string;
  clientSuccessManager: {
    avatar?: string;
    name: string;
  };
  id: string;
  phase: string;
  progress: string;
  progressPercent: number;
  project: string;
  status: string;
  templateDescription: string;
  tasks: Array<{
    assigneeAvatar?: string;
    assigneeName: string;
    description?: string | null;
    dueDate: string;
    id: string;
    name: string;
    startDate?: string | null;
    status: string;
  }>;
};

const thClassName = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";

const getFullName = (firstName?: string | null, lastName?: string | null) => {
  const parts = [firstName, lastName]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);

  return parts.join(" ");
};

const resolveServerAssetUrl = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  const normalizedPath = value.replace(/^\/+/, "");

  return baseUrl ? `${baseUrl}/${normalizedPath}` : value;
};

const normalizeTemplateProjectName = (value?: string | null) =>
  (value ?? "").trim().toLowerCase();

const calculateProjectProgressPercent = (
  projectId: string,
  tasks: Awaited<ReturnType<typeof clientsApi.getProjectTasks>>["tasks"],
) => {
  const projectTasks = tasks.filter(
    (task) => String(task.projectId) === projectId,
  );

  if (!projectTasks.length) {
    return 0;
  }

  const completedTasks = projectTasks.filter((task) => {
    const normalized = (task.status ?? "").trim().toUpperCase();

    return normalized === "DONE" || normalized === "COMPLETED";
  });

  return Math.round((completedTasks.length / projectTasks.length) * 100);
};

const columns = ({
  onRemoveProject,
  onViewTaskLists,
}: {
  onRemoveProject: (clientId: string, projectId: string) => void;
  onViewTaskLists: (clientId: string, projectId: string) => void;
}): DashboardDataTableColumn<MyProjectRow>[] => [
  {
    key: "clientName",
    label: "Client Name",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.clientName}</span>
    ),
  },
  {
    key: "project",
    label: "Projects",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.project}</span>
    ),
  },
  {
    key: "progressPercent",
    label: "Progress",
    className: thClassName,
    renderCell: (item) => (
      <div className="min-w-20">
        <p className="text-2sm font-semibold text-[#111827]">
          {item.progressPercent}%
        </p>
        <div className="mt-1 h-2 rounded-full bg-default-200">
          <div
            className="h-2 rounded-full bg-[#4F46E5]"
            style={{ width: `${item.progressPercent}%` }}
          />
        </div>
      </div>
    ),
  },
  {
    key: "clientSuccessManager",
    label: "Client Success Mana",
    className: thClassName,
    renderCell: (item) => (
      <div className="flex items-center gap-2">
        <Avatar
          name={item.clientSuccessManager.name}
          size="sm"
          src={item.clientSuccessManager.avatar}
        />
        <span className="text-sm text-[#374151]">
          {item.clientSuccessManager.name}
        </span>
      </div>
    ),
  },
  {
    key: "accountManager",
    label: "Account Manager",
    className: thClassName,
    renderCell: (item) => (
      <div className="flex items-center gap-2">
        <Avatar
          name={item.accountManager.name}
          size="sm"
          src={item.accountManager.avatar}
        />
        <span className="text-sm text-[#374151]">
          {item.accountManager.name}
        </span>
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    className: thClassName,
    renderCell: (item) => (
      <Chip
        className="bg-[#DCFCE7] text-[#059669]"
        radius="full"
        size="sm"
        variant="flat"
      >
        {item.status}
      </Chip>
    ),
  },
  {
    key: "phase",
    label: "Phase",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#374151]">{item.phase}</span>
    ),
  },
  {
    key: "progress",
    label: "Progress",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#374151]">{item.progress}</span>
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
            <EllipsisVertical size={14} />
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label={`Project actions ${item.id}`}>
          <DropdownItem
            key="view-task-lists"
            startContent={<ListTodo size={16} />}
            onPress={() => {
              onViewTaskLists(item.clientId, item.id);
            }}
          >
            View Task Lists
          </DropdownItem>
          <DropdownItem
            key="remove"
            className="text-danger"
            color="danger"
            startContent={<Trash2 size={16} />}
            onPress={() => {
              onRemoveProject(item.clientId, item.id);
            }}
          >
            Remove
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    ),
  },
];

export const MyProjectsTable = () => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [activeProject, setActiveProject] = useState<MyProjectRow | null>(null);
  const [isTaskListPanelOpen, setIsTaskListPanelOpen] = useState(false);
  const [rows, setRows] = useState<MyProjectRow[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [templateDescriptionByProject, setTemplateDescriptionByProject] =
    useState<Record<string, string>>({});

  useEffect(() => {
    if (!session?.accessToken) {
      setTemplateDescriptionByProject({});

      return;
    }

    let isMounted = true;

    const hydrateTemplates = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const response =
          await projectTemplatesApi.listProjectTemplates(accessToken);

        if (!isMounted) {
          return;
        }

        const map = response.projectTemplates.reduce<Record<string, string>>(
          (accumulator, template) => {
            const key = normalizeTemplateProjectName(template.projectName);

            if (!key) {
              return accumulator;
            }

            accumulator[key] = template.description?.trim() || "";

            return accumulator;
          },
          {},
        );

        setTemplateDescriptionByProject(map);
      } catch {
        if (!isMounted) {
          return;
        }

        setTemplateDescriptionByProject({});
      }
    };

    void hydrateTemplates();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) {
      setRows([]);

      return;
    }

    let isMounted = true;

    const loadProjects = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const clientsResponse = await clientsApi.getClients(accessToken);
        const allClients = clientsResponse ?? [];
        const mappedProjects = await Promise.all(
          allClients.map(async (client) => {
            const currentClientId = client.id;

            if (currentClientId === undefined || currentClientId === null) {
              return [];
            }

            const [projectsResponse, tasksResponse] = await Promise.all([
              clientsApi.getClientProjects(accessToken, currentClientId, {
                limit: 100,
                page: 1,
              }),
              clientsApi.getProjectTasks(accessToken, currentClientId),
            ]);

            return projectsResponse.projects.map((project) => {
              const clientSuccessManagerName =
                getFullName(
                  project.clientSuccessManager.firstName,
                  project.clientSuccessManager.lastName,
                ) || "-";
              const accountManagerName =
                getFullName(
                  project.accountManager.firstName,
                  project.accountManager.lastName,
                ) || "-";

              return {
                accountManager: {
                  avatar: resolveServerAssetUrl(project.accountManager.avatar),
                  name: accountManagerName,
                },
                clientId: String(currentClientId),
                clientName:
                  client.clientName ??
                  client.businessName ??
                  `Client ${currentClientId}`,
                clientSuccessManager: {
                  avatar: resolveServerAssetUrl(
                    project.clientSuccessManager.avatar,
                  ),
                  name: clientSuccessManagerName,
                },
                id: String(project.id),
                phase: project.phase ?? "-",
                progress: project.progress ?? "-",
                progressPercent: calculateProjectProgressPercent(
                  String(project.id),
                  tasksResponse.tasks,
                ),
                project: project.project ?? "-",
                status: "Active",
                templateDescription:
                  templateDescriptionByProject[
                    normalizeTemplateProjectName(project.project)
                  ] ?? "",
                tasks: tasksResponse.tasks
                  .filter(
                    (task) => String(task.projectId) === String(project.id),
                  )
                  .map((task) => ({
                    assigneeAvatar: resolveServerAssetUrl(
                      task.assignedTo?.avatar ?? undefined,
                    ),
                    assigneeName:
                      getFullName(
                        task.assignedTo?.firstName ?? null,
                        task.assignedTo?.lastName ?? null,
                      ) || "-",
                    description: task.description,
                    dueDate: task.dueDate ?? "-",
                    id: String(task.id),
                    name: task.taskName ?? task.task ?? "-",
                    startDate: task.startDate,
                    status: task.status ?? "Todo",
                  })),
              };
            });
          }),
        );

        if (!isMounted) {
          return;
        }

        setRows(
          mappedProjects
            .flat()
            .sort((left, right) => left.project.localeCompare(right.project)),
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setRows([]);
      }
    };

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, session?.accessToken, templateDescriptionByProject]);

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((item) =>
      [
        item.clientName,
        item.project,
        item.accountManager.name,
        item.clientSuccessManager.name,
        item.phase,
        item.progress,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [rows, searchValue]);

  const handleViewTaskLists = (clientId: string, projectId: string) => {
    const selectedProject =
      rows.find((row) => row.clientId === clientId && row.id === projectId) ??
      null;

    setActiveProject(selectedProject);
    setIsTaskListPanelOpen(true);

    if (!session?.accessToken || !selectedProject) {
      return;
    }

    void getValidAccessToken()
      .then((accessToken) => clientsApi.getProjectTasks(accessToken, clientId))
      .then((tasksResponse) => {
        const projectTasks = tasksResponse.tasks
          .filter((task) => String(task.projectId) === projectId)
          .map((task) => ({
            assigneeAvatar: resolveServerAssetUrl(
              task.assignedTo?.avatar ?? undefined,
            ),
            assigneeName:
              getFullName(
                task.assignedTo?.firstName ?? null,
                task.assignedTo?.lastName ?? null,
              ) || "-",
            description: task.description,
            dueDate: task.dueDate ?? "-",
            id: String(task.id),
            name: task.taskName ?? task.task ?? "-",
            startDate: task.startDate,
            status: task.status ?? "Todo",
          }));

        setActiveProject((current) =>
          current?.clientId === clientId && current.id === projectId
            ? { ...current, tasks: projectTasks }
            : current,
        );
      })
      .catch(() => {
        // Keep the drawer open with whatever task data the table already had.
      });
  };

  const handleRemoveProject = async (clientId: string, projectId: string) => {
    if (!session?.accessToken) {
      toast.danger("Session expired", {
        description: "Please login again before removing a project.",
      });

      return;
    }

    const accessToken = await getValidAccessToken();

    try {
      await clientsApi.deleteClientProject(accessToken, clientId, projectId);
      setRows((previous) =>
        previous.filter(
          (row) => !(row.clientId === clientId && row.id === projectId),
        ),
      );

      if (
        activeProject?.clientId === clientId &&
        activeProject.id === projectId
      ) {
        setActiveProject(null);
        setIsTaskListPanelOpen(false);
      }

      toast.success("Project removed successfully.");
    } catch (error) {
      toast.danger("Failed to remove project", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <>
      <DashboardDataTable
        showPagination
        ariaLabel="All projects"
        columns={columns({
          onRemoveProject: handleRemoveProject,
          onViewTaskLists: handleViewTaskLists,
        })}
        getRowKey={(item) => item.id}
        headerRight={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button startContent={<List size={14} />} variant="bordered">
              Show 10
            </Button>
            <Button startContent={<Columns3 size={14} />} variant="bordered">
              Columns
            </Button>
            <Input
              className="max-w-[220px]"
              placeholder="Search here"
              startContent={<Search className="text-default-400" size={14} />}
              value={searchValue}
              onValueChange={setSearchValue}
            />
          </div>
        }
        rows={filteredRows}
        title="All Projects"
      />
      <Drawer
        hideCloseButton
        classNames={{
          backdrop: "bg-black/20",
          base: "w-full max-w-[768px]",
          wrapper: "justify-end",
        }}
        isDismissable={false}
        isOpen={isTaskListPanelOpen}
        placement="right"
        scrollBehavior="inside"
        onOpenChange={setIsTaskListPanelOpen}
      >
        <DrawerContent className="h-screen max-h-screen rounded-none">
          <DrawerBody className="p-5">
            <ViewTaskListsPanelContent
              accountManagerAvatar={activeProject?.accountManager.avatar}
              accountManagerName={activeProject?.accountManager.name ?? "-"}
              address="-"
              clientName={activeProject?.clientName ?? "-"}
              csmAvatar={activeProject?.clientSuccessManager.avatar}
              csmName={activeProject?.clientSuccessManager.name ?? "-"}
              description={activeProject?.templateDescription}
              projectId={activeProject?.id ?? ""}
              projectName={activeProject?.project ?? "Local SEO"}
              tasks={activeProject?.tasks ?? []}
              onClose={() => {
                setIsTaskListPanelOpen(false);
              }}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};
