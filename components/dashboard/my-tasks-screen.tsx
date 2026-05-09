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
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Columns3,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { clientsApi, type ProjectTask } from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatCommentPreview } from "@/lib/comment-preview";

type TaskStatusCount = {
  label: string;
  value: number;
};

type TaskRow = {
  assigneeAvatar?: string;
  assigneeName: string;
  children: TaskRow[];
  clientName: string;
  clientId: string;
  depth: number;
  dueDate: string;
  id: string;
  isOrphanChild: boolean;
  latestComment: string;
  parentTaskName?: string;
  projectType: string;
  status: string;
  taskName: string;
};

type TaskGroup = {
  id: string;
  label: string;
  rows: TaskRow[];
  tone?: "danger" | "default";
};

type GroupId = "overdue" | "later" | "completed";
type TaskWithClient = ProjectTask & {
  clientId: string;
  clientName: string;
  latestComment: string;
};

const STATUS_LABELS = [
  "To Do",
  "In Progress",
  "Internal Review",
  "Client Review",
  "On Hold",
  "Completed",
] as const;
const toggleableColumnKeys = [
  "taskName",
  "assignee",
  "status",
  "clientName",
  "projectType",
  "latestComment",
  "dueDate",
];
const columnLabels: Record<string, string> = {
  assignee: "Assignee",
  clientName: "Client Name",
  dueDate: "Due Date",
  latestComment: "Latest comment",
  projectType: "Project Type",
  status: "Status",
  taskName: "Task Name",
};
const dueGroupFilterOptions = [
  { key: "all", label: "All groups" },
  { key: "overdue", label: "Overdue" },
  { key: "later", label: "Later / No Due Date" },
  { key: "completed", label: "Completed" },
];

const getStatusChipClassName = (status: string) => {
  const normalizedStatus = normalizeStatus(status);

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

const parseDate = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const normalized = value.includes("T") ? value.slice(0, 10) : value;
  const [year, month, day] = normalized.split("-").map((part) => Number(part));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateForDisplay = (value?: string | null) => {
  const parsed = parseDate(value);

  if (!parsed) {
    return "-";
  }

  return parsed.toLocaleDateString("en-US", {
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

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(
    /\/api\/v\d+\/?$/,
    "",
  ).replace(/\/$/, "");
  const normalizedPath = value.replace(/^\/+/, "");

  return baseUrl ? `${baseUrl}/${normalizedPath}` : value;
};
const normalizeStatus = (value?: string | null) => {
  const normalized = (value ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase();

  if (!normalized || normalized === "TODO" || normalized === "TO DO") {
    return "To Do";
  }

  if (normalized === "IN PROGRESS") {
    return "In Progress";
  }

  if (normalized === "INTERNAL REVIEW") {
    return "Internal Review";
  }

  if (normalized === "CLIENT REVIEW") {
    return "Client Review";
  }

  if (normalized === "ON HOLD") {
    return "On Hold";
  }

  if (normalized === "DONE" || normalized === "COMPLETED") {
    return "Completed";
  }

  return value?.trim() || "To Do";
};

const getTaskAssigneeId = (task: ProjectTask) =>
  String(task.assignedToId ?? "");

const getTaskAssigneeName = (task: ProjectTask) => {
  const fullName = [task.assignedTo.firstName, task.assignedTo.lastName]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return fullName || "Unassigned";
};

const getTaskGroupId = (task: TaskWithClient): GroupId => {
  const status = normalizeStatus(task.status);

  if (status === "Completed") {
    return "completed";
  }

  const dueDate = parseDate(task.dueDate);

  if (!dueDate) {
    return "later";
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  if (dueDate.getTime() < startOfToday.getTime()) {
    return "overdue";
  }

  return "later";
};

const getTaskRow = ({
  task,
  tasksByParentId,
  tasksInGroupById,
  allTasksById,
  visited,
  depth,
}: {
  task: TaskWithClient;
  tasksByParentId: Map<string, TaskWithClient[]>;
  tasksInGroupById: Map<string, TaskWithClient>;
  allTasksById: Map<string, TaskWithClient>;
  visited: Set<string>;
  depth: number;
}): TaskRow => {
  const taskId = String(task.id);

  if (visited.has(taskId)) {
    return {
      assigneeAvatar:
        resolveServerAssetUrl(task.assignedTo.avatar) ?? undefined,
      assigneeName: getTaskAssigneeName(task),
      children: [],
      clientId: task.clientId,
      clientName: task.clientName,
      depth,
      dueDate: formatDateForDisplay(task.dueDate),
      id: taskId,
      isOrphanChild: false,
      latestComment: formatCommentPreview(task.latestComment),
      projectType: task.projectType?.trim() || "Website",
      status: normalizeStatus(task.status),
      taskName: task.taskName?.trim() || "Untitled task",
    };
  }

  visited.add(taskId);

  const childRows = (tasksByParentId.get(taskId) ?? []).map((childTask) =>
    getTaskRow({
      allTasksById,
      depth: depth + 1,
      task: childTask,
      tasksByParentId,
      tasksInGroupById,
      visited,
    }),
  );

  const parentTaskId =
    task.parentTaskId !== null && task.parentTaskId !== undefined
      ? String(task.parentTaskId)
      : "";
  const isOrphanChild = Boolean(
    parentTaskId && !tasksInGroupById.has(parentTaskId),
  );
  const parentTaskName =
    isOrphanChild && parentTaskId
      ? allTasksById.get(parentTaskId)?.taskName?.trim() || undefined
      : undefined;

  return {
    assigneeAvatar: resolveServerAssetUrl(task.assignedTo.avatar) ?? undefined,
    assigneeName: getTaskAssigneeName(task),
    children: childRows,
    clientId: task.clientId,
    clientName: task.clientName,
    depth,
    dueDate: formatDateForDisplay(task.dueDate),
    id: taskId,
    isOrphanChild,
    latestComment: formatCommentPreview(task.latestComment),
    parentTaskName,
    projectType: task.projectType?.trim() || "Website",
    status: normalizeStatus(task.status),
    taskName: task.taskName?.trim() || "Untitled task",
  };
};

const flattenRows = (
  rows: TaskRow[],
  expandedTaskIds: Set<string>,
  output: TaskRow[] = [],
) => {
  rows.forEach((row) => {
    output.push(row);

    if (row.children.length > 0 && expandedTaskIds.has(row.id)) {
      flattenRows(row.children, expandedTaskIds, output);
    }
  });

  return output;
};

export const MyTasksScreen = () => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const router = useRouter();

  const [allTasks, setAllTasks] = useState<TaskWithClient[]>([]);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientFilter, setSelectedClientFilter] = useState("all");
  const [selectedDueGroupFilter, setSelectedDueGroupFilter] = useState("all");
  const [selectedProjectTypeFilter, setSelectedProjectTypeFilter] =
    useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(
    () => new Set(toggleableColumnKeys),
  );

  const currentUserId = String(session?.user.id ?? "");

  useEffect(() => {
    if (!session || !currentUserId) {
      setAllTasks([]);
      setExpandedTaskIds(new Set());

      return;
    }

    let isActive = true;

    const loadAssignedTasks = async () => {
      setIsLoading(true);

      try {
        const accessToken = await getValidAccessToken();
        const clients = await clientsApi.getClients(accessToken);
        const taskResponses = await Promise.all(
          clients.map(async (client) => {
            try {
              const response = await clientsApi.getProjectTasks(
                accessToken,
                client.id,
              );

              const clientId = String(client.id);
              const clientName =
                client.clientName?.trim() || client.businessName?.trim() || "-";

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

              return response.tasks.map((task) => ({
                ...task,
                clientId,
                clientName,
                latestComment:
                  latestCommentByTaskId.get(String(task.id)) || "-",
              }));
            } catch {
              return [] as TaskWithClient[];
            }
          }),
        );

        if (!isActive) {
          return;
        }

        setAllTasks(taskResponses.flat());
      } catch (error) {
        if (!isActive) {
          return;
        }

        toast.danger("Could not load your tasks.", {
          description:
            error instanceof Error
              ? error.message
              : "Please refresh and try again.",
        });
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadAssignedTasks();

    return () => {
      isActive = false;
    };
  }, [currentUserId, getValidAccessToken, session]);

  const assignedTasks = useMemo(
    () =>
      allTasks.filter((task) => {
        const assigneeId = getTaskAssigneeId(task);

        return assigneeId !== "" && assigneeId === currentUserId;
      }),
    [allTasks, currentUserId],
  );

  const statusCounts = useMemo<TaskStatusCount[]>(() => {
    const counts = new Map<string, number>(
      STATUS_LABELS.map((label) => [label, 0]),
    );

    assignedTasks.forEach((task) => {
      const normalizedStatus = normalizeStatus(task.status);

      if (counts.has(normalizedStatus)) {
        counts.set(normalizedStatus, (counts.get(normalizedStatus) ?? 0) + 1);
      }
    });

    return STATUS_LABELS.map((label) => ({
      label,
      value: counts.get(label) ?? 0,
    }));
  }, [assignedTasks]);

  const clientFilterOptions = useMemo(
    () =>
      Array.from(
        assignedTasks.reduce<Map<string, string>>((acc, task) => {
          acc.set(task.clientName, task.clientName);

          return acc;
        }, new Map()),
      )
        .map(([key, label]) => ({ key, label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [assignedTasks],
  );
  const projectTypeFilterOptions = useMemo(
    () =>
      Array.from(
        assignedTasks.reduce<Map<string, string>>((acc, task) => {
          const projectType = task.projectType?.trim() || "Website";

          acc.set(projectType, projectType);

          return acc;
        }, new Map()),
      )
        .map(([key, label]) => ({ key, label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [assignedTasks],
  );
  const visibleTableColumnKeys = useMemo(
    () => [
      ...toggleableColumnKeys.filter((key) => visibleColumnKeys.has(key)),
      "action",
    ],
    [visibleColumnKeys],
  );
  const visibleColumnCount = visibleTableColumnKeys.length;
  const hasActiveFilters =
    selectedClientFilter !== "all" ||
    selectedDueGroupFilter !== "all" ||
    selectedProjectTypeFilter !== "all" ||
    selectedStatusFilter !== "all";

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return assignedTasks.filter((task) => {
      const normalizedStatus = normalizeStatus(task.status);
      const projectType = task.projectType?.trim() || "Website";
      const matchesStatus =
        selectedStatusFilter === "all" ||
        normalizedStatus === selectedStatusFilter;
      const matchesClient =
        selectedClientFilter === "all" ||
        task.clientName === selectedClientFilter;
      const matchesProjectType =
        selectedProjectTypeFilter === "all" ||
        projectType === selectedProjectTypeFilter;
      const matchesDueGroup =
        selectedDueGroupFilter === "all" ||
        getTaskGroupId(task) === selectedDueGroupFilter;
      const haystack = [
        task.taskName ?? "",
        task.clientName,
        projectType,
        normalizedStatus,
        task.description ?? "",
        task.latestComment ?? "",
        formatDateForDisplay(task.dueDate),
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !query || haystack.includes(query);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesClient &&
        matchesProjectType &&
        matchesDueGroup
      );
    });
  }, [
    assignedTasks,
    searchQuery,
    selectedClientFilter,
    selectedDueGroupFilter,
    selectedProjectTypeFilter,
    selectedStatusFilter,
  ]);

  const groupedTasks = useMemo<TaskGroup[]>(() => {
    const tasksByGroup = new Map<GroupId, TaskWithClient[]>([
      ["overdue", []],
      ["later", []],
      ["completed", []],
    ]);

    filteredTasks.forEach((task) => {
      tasksByGroup.get(getTaskGroupId(task))?.push(task);
    });

    const allTasksById = new Map<string, TaskWithClient>();

    allTasks.forEach((task) => {
      allTasksById.set(String(task.id), task);
    });

    const createRowsForGroup = (groupTasks: TaskWithClient[]) => {
      const tasksInGroupById = new Map<string, TaskWithClient>();
      const tasksByParentId = new Map<string, TaskWithClient[]>();

      groupTasks.forEach((task) => {
        const taskId = String(task.id);

        tasksInGroupById.set(taskId, task);

        const parentId =
          task.parentTaskId !== null && task.parentTaskId !== undefined
            ? String(task.parentTaskId)
            : "";

        if (parentId) {
          const current = tasksByParentId.get(parentId) ?? [];

          current.push(task);
          tasksByParentId.set(parentId, current);
        }
      });

      const childTaskIds = new Set<string>();

      tasksByParentId.forEach((childTasks, parentId) => {
        if (!tasksInGroupById.has(parentId)) {
          return;
        }

        childTasks.forEach((childTask) => {
          childTaskIds.add(String(childTask.id));
        });
      });

      const topLevelTasks = groupTasks.filter(
        (task) => !childTaskIds.has(String(task.id)),
      );

      return topLevelTasks.map((task) =>
        getTaskRow({
          allTasksById,
          depth: 0,
          task,
          tasksByParentId,
          tasksInGroupById,
          visited: new Set<string>(),
        }),
      );
    };

    const overdueRows = createRowsForGroup(tasksByGroup.get("overdue") ?? []);
    const laterRows = createRowsForGroup(tasksByGroup.get("later") ?? []);
    const completedRows = createRowsForGroup(
      tasksByGroup.get("completed") ?? [],
    );

    return [
      {
        id: "overdue",
        label: `Overdue (${overdueRows.length})`,
        rows: overdueRows,
        tone: "danger",
      },
      {
        id: "later",
        label: `Later / No Due Date (${laterRows.length})`,
        rows: laterRows,
      },
      {
        id: "completed",
        label: `Completed (${completedRows.length})`,
        rows: completedRows,
      },
    ];
  }, [allTasks, filteredTasks]);

  const groupedFlatRows = useMemo(
    () =>
      groupedTasks.map((group) => ({
        ...group,
        flatRows: flattenRows(group.rows, expandedTaskIds),
      })),
    [expandedTaskIds, groupedTasks],
  );
  const tableRows = useMemo(
    () =>
      groupedFlatRows.flatMap((group) => [
        {
          groupId: group.id,
          key: `group-${group.id}`,
          label: group.label,
          tone: group.tone,
          type: "group" as const,
        },
        ...group.flatRows.map((item) => ({
          groupId: group.id,
          item,
          key: `task-${item.id}`,
          type: "task" as const,
        })),
      ]),
    [groupedFlatRows],
  );

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTaskIds((current) => {
      const next = new Set(current);

      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }

      return next;
    });
  };

  const openTask = (item: TaskRow) => {
    if (!item.clientId) {
      return;
    }

    router.push(
      `/dashboard/clients/${encodeURIComponent(
        item.clientId,
      )}/task-lists?taskId=${encodeURIComponent(item.id)}`,
    );
  };

  const renderTaskCell = (item: TaskRow, columnKey: string) => {
    if (columnKey === "taskName") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>
          <div
            className="flex min-w-0 items-center gap-2"
            style={{
              paddingLeft: `${item.depth * 20}px`,
            }}
          >
            {item.children.length > 0 ? (
              <button
                className="flex flex-none items-center text-[#6B7280]"
                type="button"
                onClick={() => toggleTaskExpansion(item.id)}
              >
                {expandedTaskIds.has(item.id) ? (
                  <ChevronDown className="flex-none" size={14} />
                ) : (
                  <ChevronRight className="flex-none" size={14} />
                )}
              </button>
            ) : (
              <span className="inline-block w-[14px] flex-none" />
            )}
            <span
              className={`h-8 w-1 flex-none rounded-full ${
                item.depth > 0 || item.isOrphanChild
                  ? "bg-[#10B981]"
                  : "bg-[#60A5FA]"
              }`}
            />
            <div className="min-w-0">
              <span className="line-clamp-2 text-sm font-semibold text-[#111827]">
                {item.taskName}
              </span>
              {item.isOrphanChild ? (
                <span className="line-clamp-1 text-xs text-[#6B7280]">
                  Subtask
                  {item.parentTaskName ? ` of: ${item.parentTaskName}` : ""}
                </span>
              ) : null}
            </div>
          </div>
        </TableCell>
      );
    }

    if (columnKey === "assignee") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>
          <div className="flex items-center gap-2">
            <Avatar
              className="h-8 w-8 flex-none"
              name={item.assigneeName}
              src={item.assigneeAvatar}
            />
            <span>{item.assigneeName}</span>
          </div>
        </TableCell>
      );
    }

    if (columnKey === "status") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>
          <Chip
            className={getStatusChipClassName(item.status)}
            radius="full"
            size="sm"
          >
            {item.status}
          </Chip>
        </TableCell>
      );
    }

    if (columnKey === "clientName") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>{item.clientName}</TableCell>
      );
    }

    if (columnKey === "projectType") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>
          <Chip className="bg-[#DCFCE7] text-[#059669]" radius="full" size="sm">
            {item.projectType}
          </Chip>
        </TableCell>
      );
    }

    if (columnKey === "latestComment") {
      return (
        <TableCell
          key={`${item.id}-${columnKey}`}
          className="max-w-[180px] truncate text-[#6B7280]"
        >
          {item.latestComment}
        </TableCell>
      );
    }

    if (columnKey === "dueDate") {
      return (
        <TableCell key={`${item.id}-${columnKey}`}>{item.dueDate}</TableCell>
      );
    }

    return (
      <TableCell key={`${item.id}-${columnKey}`}>
        <Button
          radius="sm"
          size="sm"
          variant="bordered"
          onPress={() => openTask(item)}
        >
          View
        </Button>
      </TableCell>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {statusCounts.map((item) => (
          <Chip
            key={item.label}
            className="rounded-md border border-default-300 bg-white px-1.5 py-1 text-sm font-semibold text-[#111827]"
            radius="sm"
            variant="flat"
          >
            <span className="font-semibold">{item.label}</span>:{" "}
            <span className="font-bold">{item.value}</span>
          </Chip>
        ))}
      </div>

      <Card className="border border-default-200 shadow-none">
        <CardHeader className="flex flex-col items-start justify-between gap-3 border-b border-default-200 px-4 py-3 md:flex-row md:items-center">
          <h2 className="text-lg font-semibold text-[#1F2937]">Task List</h2>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <Dropdown>
              <DropdownTrigger>
                <Button
                  color={hasActiveFilters ? "primary" : "default"}
                  startContent={<SlidersHorizontal size={14} />}
                  variant={hasActiveFilters ? "flat" : "bordered"}
                >
                  Filter
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="My task filters"
                className="min-w-64"
                closeOnSelect={false}
              >
                <DropdownItem key="status-filter" textValue="Status filter">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#4B5563]">
                      Status
                    </p>
                    <select
                      className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                      value={selectedStatusFilter}
                      onChange={(event) =>
                        setSelectedStatusFilter(event.target.value)
                      }
                    >
                      <option value="all">All statuses</option>
                      {STATUS_LABELS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </DropdownItem>
                <DropdownItem key="client-filter" textValue="Client filter">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#4B5563]">
                      Client
                    </p>
                    <select
                      className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                      value={selectedClientFilter}
                      onChange={(event) =>
                        setSelectedClientFilter(event.target.value)
                      }
                    >
                      <option value="all">All clients</option>
                      {clientFilterOptions.map((client) => (
                        <option key={client.key} value={client.key}>
                          {client.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </DropdownItem>
                <DropdownItem
                  key="project-type-filter"
                  textValue="Project Type filter"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#4B5563]">
                      Project Type
                    </p>
                    <select
                      className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                      value={selectedProjectTypeFilter}
                      onChange={(event) =>
                        setSelectedProjectTypeFilter(event.target.value)
                      }
                    >
                      <option value="all">All project types</option>
                      {projectTypeFilterOptions.map((projectType) => (
                        <option key={projectType.key} value={projectType.key}>
                          {projectType.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </DropdownItem>
                <DropdownItem
                  key="due-date-group-filter"
                  textValue="Due date group filter"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#4B5563]">
                      Due date group
                    </p>
                    <select
                      className="w-full rounded-md border border-default-200 px-2 py-1 text-sm"
                      value={selectedDueGroupFilter}
                      onChange={(event) =>
                        setSelectedDueGroupFilter(event.target.value)
                      }
                    >
                      {dueGroupFilterOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </DropdownItem>
                <DropdownItem key="reset-filters" textValue="Reset filters">
                  <Button
                    fullWidth
                    radius="sm"
                    variant="bordered"
                    onPress={() => {
                      setSelectedStatusFilter("all");
                      setSelectedClientFilter("all");
                      setSelectedProjectTypeFilter("all");
                      setSelectedDueGroupFilter("all");
                    }}
                  >
                    Reset
                  </Button>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
            <Dropdown closeOnSelect={false} placement="bottom-end">
              <DropdownTrigger>
                <Button
                  startContent={<Columns3 size={14} />}
                  variant="bordered"
                >
                  Columns
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Toggle my task columns"
                items={toggleableColumnKeys.map((key) => ({
                  key,
                  label: columnLabels[key],
                }))}
                selectedKeys={visibleColumnKeys}
                selectionMode="multiple"
                onSelectionChange={(keys) => {
                  if (keys === "all") {
                    setVisibleColumnKeys(new Set(toggleableColumnKeys));

                    return;
                  }

                  const nextKeys = new Set(
                    Array.from(keys as Set<string>).map(String),
                  );

                  setVisibleColumnKeys(
                    nextKeys.size > 0
                      ? nextKeys
                      : new Set(toggleableColumnKeys),
                  );
                }}
              >
                {(item) => (
                  <DropdownItem key={item.key}>{item.label}</DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown>
            <Input
              className="w-full md:w-[260px]"
              placeholder="Search here"
              radius="sm"
              startContent={<Search className="text-default-400" size={16} />}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
          </div>
        </CardHeader>

        <CardBody className="p-0">
          <Table
            removeWrapper
            aria-label="My tasks table"
            classNames={{
              table: "border-collapse border-spacing-0",
              tbody:
                "[&_tr]:border-b [&_tr]:border-default-200 [&_tr:nth-child(even)]:bg-[#FCFCFD]",
              td: "px-3 py-3 text-sm text-[#111827]",
              th: "px-3 py-3 text-xs font-medium text-[#6B7280]",
            }}
          >
            <TableHeader>
              {visibleTableColumnKeys.map((columnKey) => (
                <TableColumn key={columnKey}>
                  {columnKey === "action" ? "Action" : columnLabels[columnKey]}
                </TableColumn>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount}>
                    <div className="px-3 py-4 text-sm text-[#6B7280]">
                      Loading tasks...
                    </div>
                  </TableCell>
                </TableRow>
              ) : tableRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount}>
                    <div className="px-3 py-4 text-sm text-[#6B7280]">
                      No tasks found.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tableRows.map((row) =>
                  row.type === "group" ? (
                    <TableRow key={row.key}>
                      <TableCell
                        className="bg-white px-3 py-2"
                        colSpan={visibleColumnCount}
                      >
                        <div
                          className={`text-base font-semibold ${
                            row.tone === "danger"
                              ? "text-danger"
                              : "text-[#374151]"
                          }`}
                        >
                          {row.label}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={`${row.groupId}-${row.key}`}>
                      {visibleTableColumnKeys.map((columnKey) =>
                        renderTaskCell(row.item, columnKey),
                      )}
                    </TableRow>
                  ),
                )
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
};
