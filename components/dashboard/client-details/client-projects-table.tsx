"use client";

import { useCallback, useEffect, useState } from "react";
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
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { clientsApi } from "@/apis/clients";
import { projectTemplatesApi } from "@/apis/project-templates";
import { usersApi } from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";
import {
  AddProjectFormValues,
  AddProjectModal,
} from "@/components/dashboard/client-details/add-project-modal";
import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { ViewTaskListsPanelContent } from "@/components/dashboard/client-details/view-task-lists-panel-content";
import { useAppToast } from "@/hooks/use-app-toast";

type ClientProjectsRow = {
  accountManagerId: string;
  dueDate: string | null;
  id: string;
  project: string;
  templateDescription: string;
  tasks: Array<{
    assigneeAvatar?: string;
    assigneeName: string;
    description?: string | null;
    dueDate: string;
    id: string;
    name: string;
    parentTaskId?: string | null;
    startDate?: string | null;
    status: string;
  }>;
  csmId: string;
  progressPercent: number;
  clientSuccessManager: {
    avatar?: string;
    name: string;
  };
  accountManager: {
    avatar?: string;
    name: string;
  };
  status: string;
  phase: string;
  progress: string;
  startDate: string | null;
};

const thClassName = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";

const buildColumns = ({
  onRemoveProject,
  onViewTaskLists,
}: {
  onRemoveProject: (projectId: string) => void;
  onViewTaskLists: (projectId: string) => void;
}): DashboardDataTableColumn<ClientProjectsRow>[] => [
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
        <div className="w-8 h-8">
          <Avatar
            name={item.clientSuccessManager.name}
            size="sm"
            src={item.clientSuccessManager.avatar}
          />
        </div>

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
        <div className="w-8 h-8">
          <Avatar
            className="!w-8 h-8"
            name={item.accountManager.name}
            size="sm"
            src={item.accountManager.avatar}
          />
        </div>
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
              onViewTaskLists(item.id);
            }}
          >
            Vew Task Lists
          </DropdownItem>
          <DropdownItem
            key="remove"
            className="text-danger"
            color="danger"
            startContent={<Trash2 size={16} />}
            onPress={() => {
              onRemoveProject(item.id);
            }}
          >
            Remove
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    ),
  },
];

const getFullName = (firstName?: string | null, lastName?: string | null) => {
  const parts = [firstName, lastName]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);

  return parts.join(" ");
};

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

const normalizeProjectTaskStatus = (value?: string | null) => {
  const normalized = (value ?? "").trim().toUpperCase();

  if (normalized === "DONE" || normalized === "COMPLETED") {
    return "Completed";
  }

  if (normalized === "INTERNAL REVIEW") {
    return "Internal Review";
  }

  if (normalized === "CLIENT REVIEW") {
    return "Client Review";
  }

  if (normalized === "IN PROGRESS") {
    return "In Progress";
  }

  if (normalized === "ON HOLD") {
    return "On Hold";
  }

  return "To Do";
};

export const ClientProjectsTable = ({
  clientId,
  openProjectId,
}: {
  clientId: string;
  openProjectId?: string | null;
}) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isTaskListPanelOpen, setIsTaskListPanelOpen] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<ClientProjectsRow | null>(null);
  const [clientAddress, setClientAddress] = useState("-");
  const [clientName, setClientName] = useState(clientId);
  const [rows, setRows] = useState<ClientProjectsRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [users, setUsers] = useState<
    Array<{ avatar?: string | null; id: string; name: string }>
  >([]);
  const [templateDescriptionByProject, setTemplateDescriptionByProject] =
    useState<Record<string, string>>({});
  const [projectDescriptionById, setProjectDescriptionById] = useState<
    Record<string, string>
  >({});
  const [hasHandledOpenProjectId, setHasHandledOpenProjectId] = useState(false);

  useEffect(() => {
    setHasHandledOpenProjectId(false);
  }, [openProjectId]);

  useEffect(() => {
    if (!session) {
      setClientName(clientId);
      setClientAddress("-");

      return;
    }

    let isMounted = true;

    const hydrateClient = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const client = await clientsApi.getClientById(accessToken, clientId);

        if (!isMounted) {
          return;
        }

        const composedAddress = [
          client.addressLine1,
          client.addressLine2,
          client.cityState,
          client.postCode,
          client.country,
        ]
          .map((part) => part?.trim() ?? "")
          .filter(Boolean)
          .join(", ");

        setClientName(client.clientName ?? client.businessName ?? clientId);
        setClientAddress(composedAddress || "-");
      } catch {
        if (!isMounted) {
          return;
        }

        setClientName(clientId);
        setClientAddress("-");
      }
    };

    void hydrateClient();

    return () => {
      isMounted = false;
    };
  }, [clientId, getValidAccessToken, session]);

  useEffect(() => {
    if (!session) {
      setUsers([]);

      return;
    }

    let isMounted = true;

    const hydrateUsers = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const allUsers: Array<{
          avatarUrl?: string | null;
          email: string;
          firstName: string | null;
          id: number;
          lastName: string | null;
        }> = [];
        let page = 1;
        let hasNext = true;

        while (hasNext) {
          const response = await usersApi.getUsers(accessToken, {
            limit: 100,
            page,
          });

          allUsers.push(...response.users);
          hasNext = Boolean(response.pagination?.hasNext);
          page += 1;
        }

        if (!isMounted) {
          return;
        }

        setUsers(
          allUsers.map((user) => {
            const fullName = [user.firstName, user.lastName]
              .map((value) => value?.trim() ?? "")
              .filter(Boolean)
              .join(" ");

            return {
              avatar: user.avatarUrl,
              id: String(user.id),
              name: fullName || user.email,
            };
          }),
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setUsers([]);
      }
    };

    void hydrateUsers();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, session]);

  useEffect(() => {
    if (!session) {
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
  }, [getValidAccessToken, session]);

  const loadProjects = useCallback(
    async (page: number, descriptionOverrides: Record<string, string> = {}) => {
      if (!session) {
        setRows([]);
        setTotalPages(1);

        return;
      }
      const accessToken = await getValidAccessToken();

      const [response, tasksResponse] = await Promise.all([
        clientsApi.getClientProjects(accessToken, clientId, {
          limit: 10,
          page,
        }),
        clientsApi.getProjectTasks(accessToken, clientId),
      ]);

      setRows(
        response.projects.map((project) => {
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
            accountManagerId: String(project.accountManagerId ?? ""),
            csmId: String(project.clientSuccessManagerId ?? ""),
            dueDate: project.dueDate ?? null,
            id: String(project.id),
            project: project.project ?? "-",
            templateDescription:
              descriptionOverrides[String(project.id)] ??
              projectDescriptionById[String(project.id)] ??
              templateDescriptionByProject[
                normalizeTemplateProjectName(project.project)
              ] ??
              "",
            tasks: tasksResponse.tasks
              .filter((task) => String(task.projectId) === String(project.id))
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
                parentTaskId: task.parentTaskId
                  ? String(task.parentTaskId)
                  : null,
                startDate: task.startDate,
                status: task.status ?? "Todo",
              })),
            progress: project.progress ?? "-",
            progressPercent: calculateProjectProgressPercent(
              String(project.id),
              tasksResponse.tasks,
            ),
            phase: project.phase ?? "-",
            startDate: project.startDate ?? null,
            status: project.progress ?? "Draft",
            accountManager: {
              avatar: resolveServerAssetUrl(project.accountManager.avatar),
              name: accountManagerName,
            },
            clientSuccessManager: {
              avatar: resolveServerAssetUrl(
                project.clientSuccessManager.avatar,
              ),
              name: clientSuccessManagerName,
            },
          };
        }),
      );
      setCurrentPage(response.pagination.page || page);
      setTotalPages(Math.max(1, response.pagination.totalPages || 1));
    },
    [
      clientId,
      getValidAccessToken,
      projectDescriptionById,
      session,
      templateDescriptionByProject,
    ],
  );

  useEffect(() => {
    void loadProjects(currentPage);
  }, [currentPage, loadProjects]);

  useEffect(() => {
    if (hasHandledOpenProjectId || !openProjectId || rows.length === 0) {
      return;
    }

    const targetProject = rows.find(
      (row) => String(row.id) === String(openProjectId),
    );

    if (!targetProject) {
      return;
    }

    setSelectedProject(targetProject);
    setIsTaskListPanelOpen(true);
    setHasHandledOpenProjectId(true);
  }, [hasHandledOpenProjectId, openProjectId, rows]);

  const handleAddProject = async (payload: AddProjectFormValues) => {
    if (!session) {
      throw new Error("Your session has expired. Please login again.");
    }
    const accessToken = await getValidAccessToken();

    const createdProject = await clientsApi.createClientProject(
      accessToken,
      clientId,
      {
        accountManagerId: payload.accountManagerId,
        clientSuccessManagerId: payload.clientSuccessManagerId,
        dueDate: payload.dueDate,
        phase: payload.phase,
        progress: payload.progress,
        project: payload.project,
        startDate: payload.startDate,
      },
    );

    const createdProjectDescription = payload.description?.trim() ?? "";

    if (createdProjectDescription) {
      setProjectDescriptionById((current) => ({
        ...current,
        [String(createdProject.id)]: createdProjectDescription,
      }));
      setTemplateDescriptionByProject((current) => ({
        ...current,
        [normalizeTemplateProjectName(payload.project)]:
          createdProjectDescription,
      }));
    }

    if (payload.tasks?.length) {
      const failedTaskNames: string[] = [];
      const createdTaskIdByLocalId = new Map<string, string>();
      const pendingTasks = [...payload.tasks];
      const deferredTasks: typeof pendingTasks = [];

      while (pendingTasks.length > 0) {
        const task = pendingTasks.shift();

        if (!task) {
          break;
        }

        if (
          task.parentTaskId &&
          !createdTaskIdByLocalId.has(task.parentTaskId) &&
          payload.tasks.some((item) => item.id === task.parentTaskId)
        ) {
          deferredTasks.push(task);
          continue;
        }

        const taskPayload = {
          assigneeId: task.assigneeId ?? payload.clientSuccessManagerId,
          description: task.taskDescription,
          dueDate: payload.dueDate,
          parentTaskId: task.parentTaskId
            ? (createdTaskIdByLocalId.get(task.parentTaskId) ?? undefined)
            : undefined,
          projectId: createdProject.id,
          startDate: payload.startDate,
          status: normalizeProjectTaskStatus(task.status),
          task: task.taskName,
          taskName: task.taskName,
        };

        try {
          const createdTask = await clientsApi.createProjectTask(
            accessToken,
            createdProject.id,
            taskPayload,
          );

          createdTaskIdByLocalId.set(task.id, String(createdTask.id));
        } catch {
          failedTaskNames.push(task.taskName);
        }
      }

      // Retry deferred tasks once parent tasks have been created.
      for (const task of deferredTasks) {
        const taskPayload = {
          assigneeId: task.assigneeId ?? payload.clientSuccessManagerId,
          description: task.taskDescription,
          dueDate: payload.dueDate,
          parentTaskId: task.parentTaskId
            ? (createdTaskIdByLocalId.get(task.parentTaskId) ?? undefined)
            : undefined,
          projectId: createdProject.id,
          startDate: payload.startDate,
          status: normalizeProjectTaskStatus(task.status),
          task: task.taskName,
          taskName: task.taskName,
        };

        try {
          const createdTask = await clientsApi.createProjectTask(
            accessToken,
            createdProject.id,
            taskPayload,
          );

          createdTaskIdByLocalId.set(task.id, String(createdTask.id));
        } catch {
          failedTaskNames.push(task.taskName);
        }
      }

      if (failedTaskNames.length > 0) {
        throw new Error(
          `Project was created, but ${failedTaskNames.length} task(s) failed to save.`,
        );
      }
    }

    void createdProject;
    await loadProjects(
      currentPage,
      createdProjectDescription
        ? { [String(createdProject.id)]: createdProjectDescription }
        : {},
    );
  };

  const handleViewTaskLists = (projectId: string) => {
    setSelectedProject(rows.find((row) => row.id === projectId) ?? null);
    setIsTaskListPanelOpen(true);
  };

  const handleProjectMetaChange = async (payload: {
    accountManagerId?: string;
    csmId?: string;
    dueDate?: string | null;
    startDate?: string | null;
    status?: string;
  }) => {
    if (!selectedProject) {
      return;
    }

    if (!session) {
      throw new Error("Your session has expired. Please login again.");
    }
    const accessToken = await getValidAccessToken();

    const apiPayload = {
      accountManagerId:
        payload.accountManagerId ?? selectedProject.accountManagerId,
      clientSuccessManagerId: payload.csmId ?? selectedProject.csmId,
      dueDate:
        payload.dueDate !== undefined
          ? payload.dueDate
          : selectedProject.dueDate,
      progress: payload.status ?? selectedProject.status,
      startDate:
        payload.startDate !== undefined
          ? payload.startDate
          : selectedProject.startDate,
    };

    const updatedProject = await clientsApi.updateClientProject(
      accessToken,
      clientId,
      selectedProject.id,
      apiPayload,
    );

    const accountManager =
      payload.accountManagerId !== undefined
        ? users.find((user) => user.id === payload.accountManagerId)
        : undefined;
    const csm =
      payload.csmId !== undefined
        ? users.find((user) => user.id === payload.csmId)
        : undefined;

    const nextProject: ClientProjectsRow = {
      ...selectedProject,
      accountManagerId: String(
        updatedProject.accountManagerId ?? apiPayload.accountManagerId ?? "",
      ),
      csmId: String(
        updatedProject.clientSuccessManagerId ??
          apiPayload.clientSuccessManagerId ??
          "",
      ),
      dueDate:
        updatedProject.dueDate ?? apiPayload.dueDate ?? selectedProject.dueDate,
      status:
        updatedProject.progress ??
        apiPayload.progress ??
        selectedProject.status,
      startDate:
        updatedProject.startDate ??
        apiPayload.startDate ??
        selectedProject.startDate,
      accountManager:
        accountManager !== undefined
          ? {
              avatar: accountManager.avatar ?? undefined,
              name: accountManager.name,
            }
          : selectedProject.accountManager,
      clientSuccessManager:
        csm !== undefined
          ? {
              avatar: csm.avatar ?? undefined,
              name: csm.name,
            }
          : selectedProject.clientSuccessManager,
    };

    setSelectedProject(nextProject);
    setRows((previous) =>
      previous.map((row) => (row.id === nextProject.id ? nextProject : row)),
    );
  };

  const handleRemoveProject = async (projectId: string) => {
    if (!session) {
      toast.danger("Session expired", {
        description: "Please login again before removing a project.",
      });

      return;
    }
    const accessToken = await getValidAccessToken();

    try {
      await clientsApi.deleteClientProject(accessToken, clientId, projectId);
      setRows((previous) => previous.filter((row) => row.id !== projectId));

      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
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

  const columns = buildColumns({
    onRemoveProject: handleRemoveProject,
    onViewTaskLists: handleViewTaskLists,
  });

  return (
    <>
      <DashboardDataTable
        serverPagination
        showPagination
        ariaLabel="Client projects"
        columns={columns}
        currentPage={currentPage}
        getRowKey={(item) => item.id}
        headerRight={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              startContent={<SlidersHorizontal size={14} />}
              variant="bordered"
            >
              Filter
            </Button>
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
            />
            <Button
              className="bg-[#022279] text-white"
              startContent={<Plus size={14} />}
              onPress={() => {
                setIsAddProjectOpen(true);
              }}
            >
              Add Project
            </Button>
          </div>
        }
        rows={rows}
        title="Projects"
        totalPages={totalPages}
        onPageChange={(page) => {
          setCurrentPage(page);
        }}
      />
      <AddProjectModal
        clientAddress={clientAddress}
        clientName={clientName}
        fixedClientId={clientId}
        isOpen={isAddProjectOpen}
        users={users}
        onOpenChange={setIsAddProjectOpen}
        onSubmit={handleAddProject}
      />
      <Drawer
        hideCloseButton
        classNames={{
          backdrop: "bg-black/20",
          base: "w-full max-w-4xl",
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
              accountManagerAvatar={selectedProject?.accountManager.avatar}
              accountManagerId={selectedProject?.accountManagerId ?? ""}
              accountManagerName={selectedProject?.accountManager.name ?? "-"}
              address={clientAddress}
              clientName={clientName}
              csmAvatar={selectedProject?.clientSuccessManager.avatar}
              csmId={selectedProject?.csmId ?? ""}
              csmName={selectedProject?.clientSuccessManager.name ?? "-"}
              description={selectedProject?.templateDescription}
              projectDueDate={selectedProject?.dueDate ?? null}
              projectId={selectedProject?.id ?? ""}
              projectName={selectedProject?.project ?? "Local SEO"}
              projectStartDate={selectedProject?.startDate ?? null}
              status={selectedProject?.status ?? "Draft"}
              tasks={selectedProject?.tasks ?? []}
              users={users}
              onClose={() => {
                setIsTaskListPanelOpen(false);
              }}
              onProjectMetaChange={handleProjectMetaChange}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};
