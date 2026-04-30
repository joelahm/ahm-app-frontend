"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Card, CardBody, CardHeader } from "@heroui/card";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import {
  Columns3,
  EllipsisVertical,
  List,
  ListChecks,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { clientsApi, ProjectTask } from "@/apis/clients";
import { usersApi } from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";
import {
  AddTaskFormValues,
  AddTaskModal,
} from "@/components/dashboard/client-details/add-task-modal";
import { ViewTaskModal } from "@/components/dashboard/client-details/view-task-modal";
import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { formatCommentPreview } from "@/lib/comment-preview";
import { normalizeTaskStatus, TASK_STATUS_OPTIONS } from "@/lib/task-statuses";

type TaskListRow = {
  id: string;
  assignee: {
    avatar?: string;
    name: string;
  };
  assigneeId?: string;
  comment: string;
  description: string;
  dueDate: string;
  parentTaskId?: string;
  projectId?: string;
  projectType: string;
  startDate: string;
  status: string;
  taskName: string;
};

type TaskListGroup = {
  key: string;
  label: string;
  rows: TaskListRow[];
};

const thClassName = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";

const getStatusChipClassName = (status: string) => {
  const normalizedStatus = normalizeTaskStatus(status);

  if (normalizedStatus === "Completed") {
    return "bg-[#DCFCE7] text-[#059669]";
  }

  if (normalizedStatus === "On Hold") {
    return "bg-[#FEF3C7] text-[#B45309]";
  }

  if (normalizedStatus === "In Progress") {
    return "bg-[#DBEAFE] text-[#1D4ED8]";
  }

  if (normalizedStatus === "Internal Review") {
    return "bg-[#E9D5FF] text-[#7E22CE]";
  }

  if (normalizedStatus === "Client Review") {
    return "bg-[#FCE7F3] text-[#BE185D]";
  }

  return "bg-[#E5E7EB] text-[#374151]";
};

const buildColumns = ({
  onDeleteTask,
  onViewTask,
}: {
  onDeleteTask: (taskId: string) => void;
  onViewTask: (taskId: string) => void;
}): DashboardDataTableColumn<TaskListRow>[] => [
  {
    key: "taskName",
    label: "Task Name",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.taskName}</span>
    ),
  },
  {
    key: "projectType",
    label: "Project Type",
    className: thClassName,
    renderCell: (item) => (
      <Chip
        className="bg-[#DCFCE7] text-[#059669]"
        radius="full"
        size="sm"
        variant="flat"
      >
        {item.projectType}
      </Chip>
    ),
  },
  {
    key: "assignee",
    label: "Assignee",
    className: thClassName,
    renderCell: (item) => (
      <div className="flex items-center gap-2">
        <Avatar
          className="flex-none w-8 h-8"
          name={item.assignee.name}
          size="sm"
          src={item.assignee.avatar}
        />
        <span>{item.assignee.name}</span>
      </div>
    ),
  },
  {
    key: "comment",
    label: "Latest comment",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.comment}</span>
    ),
  },
  {
    key: "startDate",
    label: "Start date",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">
        {formatDateForDisplay(item.startDate)}
      </span>
    ),
  },
  {
    key: "dueDate",
    label: "Due Date",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">
        {formatDateForDisplay(item.dueDate)}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    className: thClassName,
    renderCell: (item) => {
      const normalizedStatus = normalizeTaskStatus(item.status);

      return (
        <Chip
          className={getStatusChipClassName(normalizedStatus)}
          radius="full"
          size="sm"
          variant="flat"
        >
          {normalizedStatus}
        </Chip>
      );
    },
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
        <DropdownMenu aria-label={`Task actions ${item.id}`}>
          <DropdownItem
            key="view-task"
            startContent={<ListChecks size={16} />}
            onPress={() => {
              onViewTask(item.id);
            }}
          >
            View Task
          </DropdownItem>
          <DropdownItem
            key="delete-task"
            className="text-danger"
            color="danger"
            startContent={<Trash2 size={16} />}
            onPress={() => {
              onDeleteTask(item.id);
            }}
          >
            Delete
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    ),
  },
];

const formatDateForDisplay = (isoDate: string) => {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

const toTaskListRow = (task: ProjectTask): TaskListRow => {
  const assigneeName = [task.assignedTo.firstName, task.assignedTo.lastName]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(" ");

  return {
    id: String(task.id),
    assignee: {
      avatar: resolveServerAssetUrl(task.assignedTo.avatar),
      name: assigneeName || "-",
    },
    assigneeId:
      typeof task.assignedToId === "number" ||
      typeof task.assignedToId === "string"
        ? String(task.assignedToId)
        : undefined,
    comment: "-",
    description: task.description ?? "",
    dueDate: task.dueDate ?? "",
    parentTaskId:
      typeof task.parentTaskId === "number" ||
      typeof task.parentTaskId === "string"
        ? String(task.parentTaskId)
        : undefined,
    projectId:
      typeof task.projectId === "number" || typeof task.projectId === "string"
        ? String(task.projectId)
        : undefined,
    projectType: task.projectType ?? "-",
    startDate: task.startDate ?? "",
    status: normalizeTaskStatus(task.status),
    taskName: task.taskName ?? task.task ?? "-",
  };
};

const groupRowsByProjectType = (rows: TaskListRow[]): TaskListGroup[] => {
  const map = new Map<string, TaskListRow[]>();

  rows.forEach((row) => {
    const key =
      row.projectId && row.projectId.trim()
        ? `project-${row.projectId}`
        : row.projectType.trim().toLowerCase();
    const previousRows = map.get(key) ?? [];

    map.set(key, [...previousRows, row]);
  });

  return Array.from(map.entries()).map(([key, groupedRows]) => ({
    key,
    label: groupedRows[0]?.projectType ?? key,
    rows: groupedRows,
  }));
};

const getGroupKeyForRow = (row: TaskListRow) =>
  row.projectId && row.projectId.trim()
    ? `project-${row.projectId}`
    : row.projectType.trim().toLowerCase();

export const ClientTaskListsTable = ({
  clientId,
  initialTaskId,
  projectId,
}: {
  clientId: string;
  initialTaskId?: string;
  projectId?: string;
}) => {
  const { getValidAccessToken, session } = useAuth();
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isViewTaskOpen, setIsViewTaskOpen] = useState(false);
  const [resolvedProjectId, setResolvedProjectId] = useState(projectId ?? "");
  const [projectOptions, setProjectOptions] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [rows, setRows] = useState<TaskListRow[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskListRow | null>(null);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [users, setUsers] = useState<
    Array<{ avatar?: string | null; id: string; name: string }>
  >([]);
  const [clientName, setClientName] = useState("-");
  const [clientAddress, setClientAddress] = useState("-");
  const [statusOptions] = useState<string[]>([...TASK_STATUS_OPTIONS]);
  const [hasProcessedInitialTask, setHasProcessedInitialTask] = useState(false);
  const groups = useMemo(() => groupRowsByProjectType(rows), [rows]);
  const selectedTaskSubtasks = useMemo(() => {
    if (!selectedTask) {
      return [];
    }

    return rows.filter((row) => row.parentTaskId === selectedTask.id);
  }, [rows, selectedTask]);

  useEffect(() => {
    if (!groups.length) {
      setOpenGroupKey(null);

      return;
    }

    setOpenGroupKey((current) => {
      if (current && groups.some((group) => group.key === current)) {
        return current;
      }

      return groups[0].key;
    });
  }, [groups]);

  useEffect(() => {
    if (projectId) {
      setResolvedProjectId(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    setHasProcessedInitialTask(false);
  }, [initialTaskId]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    let isMounted = true;

    const hydrateProjects = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const allProjects: Array<{
          id: number | string;
          project: string | null;
        }> = [];
        let page = 1;
        let hasNext = true;

        while (hasNext) {
          const response = await clientsApi.getClientProjects(
            accessToken,
            clientId,
            {
              limit: 100,
              page,
            },
          );

          allProjects.push(
            ...response.projects.map((project) => ({
              id: project.id,
              project: project.project,
            })),
          );
          hasNext = Boolean(response.pagination?.hasNext);
          page += 1;
        }

        if (!isMounted) {
          return;
        }

        const mappedOptions = allProjects.map((project) => ({
          id: String(project.id),
          label: project.project ?? `Project ${String(project.id)}`,
        }));

        setProjectOptions(mappedOptions);

        if (!resolvedProjectId && mappedOptions[0]) {
          setResolvedProjectId(mappedOptions[0].id);
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setProjectOptions([]);
        setResolvedProjectId("");
      }
    };

    void hydrateProjects();

    return () => {
      isMounted = false;
    };
  }, [clientId, getValidAccessToken, resolvedProjectId, session?.accessToken]);

  const loadTasks = useCallback(async () => {
    if (!session?.accessToken) {
      setRows([]);

      return [] as TaskListRow[];
    }

    try {
      const accessToken = await getValidAccessToken();
      const response = await clientsApi.getProjectTasks(accessToken, clientId);
      const latestCommentByTaskId = new Map<string, string>();

      await Promise.all(
        response.tasks.map(async (task) => {
          try {
            const commentsResponse = await clientsApi.getTaskComments(
              accessToken,
              task.id,
            );
            const latestComment = commentsResponse.comments
              .slice()
              .sort((left, right) => {
                const leftTime = left.createdAt
                  ? new Date(left.createdAt).getTime()
                  : 0;
                const rightTime = right.createdAt
                  ? new Date(right.createdAt).getTime()
                  : 0;

                return rightTime - leftTime;
              })[0]?.comment;

            latestCommentByTaskId.set(
              String(task.id),
              formatCommentPreview(latestComment),
            );
          } catch {
            latestCommentByTaskId.set(String(task.id), "-");
          }
        }),
      );

      const nextRows = response.tasks.map((task) => ({
        ...toTaskListRow(task),
        comment: latestCommentByTaskId.get(String(task.id)) ?? "-",
      }));

      setRows(nextRows);

      return nextRows;
    } catch {
      setRows([]);

      return [] as TaskListRow[];
    }
  }, [clientId, getValidAccessToken, session?.accessToken]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!initialTaskId || hasProcessedInitialTask || rows.length === 0) {
      return;
    }

    const matchedTask = rows.find((row) => row.id === initialTaskId);

    if (!matchedTask) {
      return;
    }

    setOpenGroupKey(getGroupKeyForRow(matchedTask));
    setSelectedTask(matchedTask);
    setIsViewTaskOpen(true);
    setHasProcessedInitialTask(true);
  }, [hasProcessedInitialTask, initialTaskId, rows]);

  useEffect(() => {
    if (!session?.accessToken) {
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
              avatar: resolveServerAssetUrl(user.avatarUrl),
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
  }, [getValidAccessToken, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) {
      setClientName("-");
      setClientAddress("-");

      return;
    }

    let isMounted = true;

    const hydrateClientDetails = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const details = await clientsApi.getClientById(accessToken, clientId);

        if (!isMounted) {
          return;
        }

        const address = [
          details.addressLine1,
          details.addressLine2,
          details.cityState,
          details.postCode,
          details.country,
        ]
          .map((value) => value?.trim() ?? "")
          .filter(Boolean)
          .join(", ");

        setClientName(details.clientName?.trim() || "-");
        setClientAddress(address || "-");
      } catch {
        if (!isMounted) {
          return;
        }

        setClientName("-");
        setClientAddress("-");
      }
    };

    void hydrateClientDetails();

    return () => {
      isMounted = false;
    };
  }, [clientId, getValidAccessToken, session?.accessToken]);

  const handleAddTask = async (payload: AddTaskFormValues) => {
    if (!session?.accessToken) {
      throw new Error("Your session has expired. Please login again.");
    }

    if (!resolvedProjectId) {
      throw new Error("Project selection is required.");
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const defaultAssigneeId = users[0]?.id ?? "";
    const defaultStatus = statusOptions[0] ?? TASK_STATUS_OPTIONS[0];
    const accessToken = await getValidAccessToken();

    await clientsApi.createProjectTask(accessToken, resolvedProjectId, {
      assigneeId: defaultAssigneeId,
      description: payload.description,
      dueDate: todayIso,
      projectId:
        projectOptions.find((project) => project.id === resolvedProjectId)
          ?.id ?? resolvedProjectId,
      startDate: todayIso,
      status: defaultStatus,
      taskName: payload.taskName,
    });

    await loadTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!session?.accessToken || isDeletingTask) {
      return;
    }

    setIsDeletingTask(true);

    try {
      const accessToken = await getValidAccessToken();

      await clientsApi.deleteProjectTask(accessToken, taskId);
      await loadTasks();
    } finally {
      setIsDeletingTask(false);
    }
  };

  const columns = buildColumns({
    onDeleteTask: (taskId) => {
      void handleDeleteTask(taskId);
    },
    onViewTask: (taskId) => {
      const task = rows.find((row) => row.id === taskId) ?? null;

      setSelectedTask(task);
      setIsViewTaskOpen(true);
    },
  });

  return (
    <>
      <Card className="border border-default-200 shadow-none">
        <CardHeader className="flex flex-col items-start justify-between gap-3 border-b-0 sm:flex-row sm:items-center">
          <h2 className="flex-none font-semibold text-[#111827]">Task List</h2>
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
                setIsAddTaskOpen(true);
              }}
            >
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <Accordion
            disallowEmptySelection
            itemClasses={{
              base: "border-0 rounded-none px-0 shadow-none",
              content: "p-0",
              heading: "px-0",
              title: "text-sm font-semibold text-white",
              trigger:
                "min-h-0 h-auto bg-[#0B6BCB] px-3 py-2 data-[hover=true]:bg-[#0B6BCB]",
            }}
            selectedKeys={openGroupKey ? [openGroupKey] : []}
            selectionMode="single"
            variant="splitted"
            onSelectionChange={(keys) => {
              const nextKey = Array.from(keys as Set<string>)[0];

              if (!nextKey) {
                return;
              }

              setOpenGroupKey(nextKey);
            }}
          >
            {groups.map((group) => (
              <AccordionItem
                key={group.key}
                aria-label={group.label}
                title={group.label}
              >
                <DashboardDataTable
                  ariaLabel={`${group.label} task list`}
                  columns={columns}
                  getRowKey={(item) => item.id}
                  rows={group.rows}
                  title=""
                  withShell={false}
                />
              </AccordionItem>
            ))}
          </Accordion>
        </CardBody>
      </Card>

      <AddTaskModal
        isOpen={isAddTaskOpen}
        users={users}
        onOpenChange={setIsAddTaskOpen}
        onSubmit={handleAddTask}
      />

      <ViewTaskModal
        clientAddress={clientAddress}
        clientName={clientName}
        isOpen={isViewTaskOpen}
        projectOptions={projectOptions}
        statusOptions={statusOptions}
        subtasks={selectedTaskSubtasks}
        task={
          selectedTask
            ? {
                assigneeId: selectedTask.assigneeId ?? "",
                assigneeName: selectedTask.assignee.name,
                comment: selectedTask.comment,
                description: selectedTask.description,
                dueDate: selectedTask.dueDate,
                id: selectedTask.id,
                projectId: selectedTask.projectId ?? "",
                startDate: selectedTask.startDate,
                status: selectedTask.status,
                taskName: selectedTask.taskName,
              }
            : null
        }
        users={users.map((user) => ({
          avatar: user.avatar ?? undefined,
          id: user.id,
          name: user.name,
        }))}
        onOpenChange={(open) => {
          setIsViewTaskOpen(open);

          if (!open) {
            setSelectedTask(null);
          }
        }}
        onTaskSaved={async (taskId) => {
          const latestRows = await loadTasks();
          const updatedTask =
            latestRows.find((row) => row.id === taskId) ?? selectedTask;

          setSelectedTask(updatedTask ?? null);
        }}
      />
    </>
  );
};
