"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import {
  Columns3,
  EllipsisVertical,
  List,
  ListTodo,
  ListFilter,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { clientsApi } from "@/apis/clients";
import { projectsApi, type ProjectsListGroupBy } from "@/apis/projects";
import { usersApi } from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";
import {
  AddProjectFormValues,
  AddProjectModal,
} from "@/components/dashboard/client-details/add-project-modal";
import { useAppToast } from "@/hooks/use-app-toast";

type GroupByKey = ProjectsListGroupBy;

type ProjectListRow = {
  clientAddress: string;
  clientId: string;
  clientName: string;
  csmAvatar?: string;
  csmName: string;
  dueDateLabel: string;
  id: string;
  overdueCount: number;
  phase: string;
  progress: string;
  progressPercent: number;
  project: string;
  startDateLabel: string;
  status: string;
};

const GROUP_BY_LABELS: Record<GroupByKey, string> = {
  client: "Client",
  phase: "Phase",
  progress: "Progress",
  projects: "Projects",
  status: "Status",
};

type ClientFilterOption = {
  key: string;
  label: string;
};

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

export const ProjectsListScreen = () => {
  const router = useRouter();
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [groups, setGroups] = useState<
    Array<{ label: string; items: ProjectListRow[] }>
  >([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [clients, setClients] = useState<
    Array<{ address?: string | null; id: string; name: string }>
  >([]);
  const [users, setUsers] = useState<
    Array<{ avatar?: string | null; id: string; name: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [groupBy, setGroupBy] = useState<GroupByKey>("projects");
  const [clientFilter, setClientFilter] = useState("all");

  useEffect(() => {
    if (!session) {
      setGroups([]);

      return;
    }

    let isActive = true;

    const loadProjects = async () => {
      setIsLoading(true);

      try {
        const accessToken = await getValidAccessToken();
        const response = await projectsApi.getProjectsList(accessToken, {
          clientId: clientFilter === "all" ? undefined : clientFilter,
          groupBy,
          limit: 200,
          page: 1,
          search: searchValue.trim() || undefined,
        });

        if (!isActive) {
          return;
        }

        const mappedGroups = response.groups.map((group) => ({
          items: group.items.map((item) => ({
            clientAddress: item.clientAddress || "-",
            clientId: String(item.clientId),
            clientName: item.clientName || "-",
            csmAvatar: resolveServerAssetUrl(item.csm.avatar ?? undefined),
            csmName: item.csm.name || "-",
            dueDateLabel: item.dueDateLabel || "-",
            id: String(item.id),
            overdueCount: item.overdueCount ?? 0,
            phase: item.phase || "-",
            progress: item.progress || "-",
            progressPercent: item.progressPercent ?? 0,
            project: item.project || "-",
            startDateLabel: item.startDateLabel || "-",
            status: item.status || "Active",
          })),
          label: group.label,
        }));

        setGroups(mappedGroups);
      } catch {
        if (!isActive) {
          return;
        }

        setGroups([]);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      isActive = false;
    };
  }, [
    clientFilter,
    getValidAccessToken,
    groupBy,
    refreshKey,
    searchValue,
    session,
  ]);

  useEffect(() => {
    if (!session) {
      setClients([]);
      setUsers([]);

      return;
    }

    let isMounted = true;

    const hydrateOptions = async () => {
      const accessToken = await getValidAccessToken();
      const [clientsResult, usersResult] = await Promise.allSettled([
        clientsApi.getClients(accessToken),
        usersApi.getUsers(accessToken, { limit: 500, page: 1 }),
      ]);

      if (!isMounted) {
        return;
      }

      if (clientsResult.status === "fulfilled") {
        setClients(
          clientsResult.value.map((client) => ({
            address: client.address ?? null,
            id: String(client.id),
            name:
              client.clientName || client.businessName || `Client ${client.id}`,
          })),
        );
      } else {
        setClients([]);
      }

      if (usersResult.status === "fulfilled") {
        setUsers(
          usersResult.value.users.map((user) => ({
            avatar: user.avatarUrl ?? null,
            id: String(user.id),
            name:
              [user.firstName, user.lastName]
                .map((value) => value?.trim() ?? "")
                .filter(Boolean)
                .join(" ") || user.email,
          })),
        );
      } else {
        setUsers([]);
      }
    };

    void hydrateOptions();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, session]);

  const handleAddProject = async (payload: AddProjectFormValues) => {
    if (!session) {
      throw new Error("Your session has expired. Please login again.");
    }
    if (!payload.clientId) {
      throw new Error("Please select a client.");
    }

    const accessToken = await getValidAccessToken();
    const createdProject = await clientsApi.createClientProject(
      accessToken,
      payload.clientId,
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

    setRefreshKey((value) => value + 1);
    toast.success("Project created successfully.");
  };

  const clientOptions = useMemo(() => {
    const entries = [...clients]
      .map((client) => [client.id, client.name] as const)
      .sort((left, right) => left[1].localeCompare(right[1]));

    return [
      { key: "all", label: "All Clients" },
      ...entries.map(([id, name]) => ({ key: id, label: name })),
    ] satisfies ClientFilterOption[];
  }, [clients]);

  const selectedClientFilterLabel = useMemo(() => {
    if (clientFilter === "all") {
      return "Filter";
    }

    return (
      clientOptions.find((option) => option.key === clientFilter)?.label ??
      "Filter"
    );
  }, [clientFilter, clientOptions]);

  const groupedRows = groups;
  const flattenedRows = useMemo(
    () =>
      groupedRows.flatMap((group) => [
        {
          key: `group-${group.label}`,
          label: group.label,
          type: "group" as const,
        },
        ...group.items.map((item) => ({
          item,
          key: `project-${item.id}`,
          type: "project" as const,
        })),
      ]),
    [groupedRows],
  );

  return (
    <Card className="border border-default-200 shadow-none">
      <CardHeader className="flex flex-col items-start gap-3 border-b border-default-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold text-[#111827]">Projects</h2>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
          <Dropdown placement="bottom-start">
            <DropdownTrigger>
              <Button
                startContent={<ListFilter size={14} />}
                variant="bordered"
              >
                {selectedClientFilterLabel}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Client filter"
              items={clientOptions}
              selectedKeys={new Set([clientFilter])}
              selectionMode="single"
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];

                setClientFilter(
                  typeof selected === "string" ? selected : "all",
                );
              }}
            >
              {(item) => (
                <DropdownItem key={item.key}>{item.label}</DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>
          <Dropdown placement="bottom-start">
            <DropdownTrigger>
              <Button
                startContent={<SlidersHorizontal size={14} />}
                variant="bordered"
              >
                {`Group by: ${GROUP_BY_LABELS[groupBy]}`}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Group by"
              selectedKeys={new Set([groupBy])}
              selectionMode="single"
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];

                if (
                  selected === "projects" ||
                  selected === "client" ||
                  selected === "status" ||
                  selected === "phase" ||
                  selected === "progress"
                ) {
                  setGroupBy(selected);
                }
              }}
            >
              <DropdownItem key="projects">Projects</DropdownItem>
              <DropdownItem key="client">Client</DropdownItem>
              <DropdownItem key="status">Status</DropdownItem>
              <DropdownItem key="phase">Phase</DropdownItem>
              <DropdownItem key="progress">Progress</DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <Button startContent={<List size={14} />} variant="bordered">
            Show 10
          </Button>
          <Button startContent={<Columns3 size={14} />} variant="bordered">
            Columns
          </Button>
          <Input
            className="w-full md:w-[220px]"
            placeholder="Search here"
            radius="sm"
            startContent={<Search className="text-default-400" size={16} />}
            value={searchValue}
            onValueChange={setSearchValue}
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
      </CardHeader>
      <CardBody className="p-0">
        <Table
          removeWrapper
          aria-label="Projects list table"
          classNames={{
            table: "border-collapse border-spacing-0",
            tbody:
              "[&_tr]:border-b [&_tr]:border-default-200 [&_tr:nth-child(even)]:bg-[#FCFCFD]",
            td: "px-3 py-3 text-sm text-[#111827]",
            th: "px-3 py-3 text-xs font-medium text-[#111827]",
          }}
        >
          <TableHeader>
            <TableColumn>Client Name</TableColumn>
            <TableColumn>Projects</TableColumn>
            <TableColumn>Progress</TableColumn>
            <TableColumn>Start Date</TableColumn>
            <TableColumn>Due Date</TableColumn>
            <TableColumn>Overdue</TableColumn>
            <TableColumn>CSM</TableColumn>
            <TableColumn>Status</TableColumn>
            <TableColumn>Phase</TableColumn>
            <TableColumn>Progress</TableColumn>
            <TableColumn>Action</TableColumn>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <div className="py-3 text-sm text-[#6B7280]">
                    Loading projects...
                  </div>
                </TableCell>
              </TableRow>
            ) : groupedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <div className="py-3 text-sm text-[#6B7280]">
                    No projects found.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              flattenedRows.map((row) =>
                row.type === "group" ? (
                  <TableRow key={row.key}>
                    <TableCell className="bg-white px-3 py-2" colSpan={11}>
                      <Chip
                        className="bg-[#EEF2FF] text-[#4F46E5]"
                        radius="full"
                        size="sm"
                      >
                        {row.label}
                      </Chip>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={row.key}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[#111827]">
                          {row.item.clientName}
                        </span>
                        <span className="text-[#9CA3AF]">
                          {row.item.clientAddress}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{row.item.project}</TableCell>
                    <TableCell>
                      <div className="min-w-20">
                        <p className="text-sm font-semibold text-[#111827]">
                          {row.item.progressPercent}%
                        </p>
                        <div className="mt-1 h-2 rounded-full bg-default-200">
                          <div
                            className="h-2 rounded-full bg-[#4F46E5]"
                            style={{
                              width: `${row.item.progressPercent}%`,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{row.item.startDateLabel}</TableCell>
                    <TableCell>{row.item.dueDateLabel}</TableCell>
                    <TableCell>{row.item.overdueCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar
                          className="h-8 w-8"
                          name={row.item.csmName}
                          src={row.item.csmAvatar}
                        />
                        <span>{row.item.csmName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        className="bg-[#DCFCE7] text-[#059669]"
                        radius="full"
                        size="sm"
                        variant="flat"
                      >
                        {row.item.status}
                      </Chip>
                    </TableCell>
                    <TableCell>{row.item.phase}</TableCell>
                    <TableCell>{row.item.progress}</TableCell>
                    <TableCell>
                      <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                          <Button
                            isIconOnly
                            radius="sm"
                            size="sm"
                            variant="bordered"
                          >
                            <EllipsisVertical size={14} />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                          aria-label={`Project actions ${row.item.id}`}
                        >
                          <DropdownItem
                            key="view-task"
                            startContent={<ListTodo size={16} />}
                            onPress={() => {
                              router.push(
                                `/dashboard/clients/${row.item.clientId}/projects?openProjectId=${row.item.id}`,
                              );
                            }}
                          >
                            View Task
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </TableCell>
                  </TableRow>
                ),
              )
            )}
          </TableBody>
        </Table>
      </CardBody>
      <AddProjectModal
        clientName="Select client"
        clientOptions={clients}
        isOpen={isAddProjectOpen}
        users={users}
        onOpenChange={setIsAddProjectOpen}
        onSubmit={handleAddProject}
      />
    </Card>
  );
};
