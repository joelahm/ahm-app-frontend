"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Drawer, DrawerBody, DrawerContent } from "@heroui/drawer";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import {
  Columns3,
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  ListChecks,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { clientsApi, ClientProject, ProjectTask } from "@/apis/clients";
import { usersApi } from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";
import {
  AddProjectTemplateTaskModal,
  type AddProjectTemplateTaskFormValues,
} from "@/components/dashboard/settings/add-project-template-task-modal";
import { ViewTaskListsPanelContent } from "@/components/dashboard/client-details/view-task-lists-panel-content";
import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { formatCommentPreview } from "@/lib/comment-preview";
import { normalizeProjectStatus } from "@/lib/project-statuses";
import { normalizeTaskStatus, TASK_STATUS_OPTIONS } from "@/lib/task-statuses";

type TaskListRow = {
  id: string;
  assignee: {
    avatar?: string;
    name: string;
  };
  assigneeId?: string;
  blockedTaskId?: string;
  comment: string;
  description: string;
  descriptionJson?: Record<string, unknown> | null;
  dueDate: string;
  dueDateRuleType?: string | null;
  parentTaskId?: string;
  projectId?: string;
  projectType: string;
  status: string;
  taskName: string;
};

type VisibleTaskListRow = TaskListRow & {
  depth: number;
  hasChildren: boolean;
};

type TaskListGroup = {
  key: string;
  label: string;
  rows: TaskListRow[];
};

type TaskPanelProject = {
  accountManagerAvatar?: string;
  accountManagerId: string;
  accountManagerName: string;
  csmAvatar?: string;
  csmId: string;
  csmName: string;
  dueDate: string | null;
  id: string;
  name: string;
  startDate: string | null;
  status: string;
};

const thClassName = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";
const toggleableColumnKeys = [
  "taskName",
  "projectType",
  "assignee",
  "comment",
  "dueDate",
  "status",
];
const allDueDateFilter = "all";
const dueDateFilterOptions = [
  { key: allDueDateFilter, label: "All due dates" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "this-week", label: "This week" },
  { key: "none", label: "No due date" },
];

const getFullName = (firstName?: string | null, lastName?: string | null) => {
  const parts = [firstName, lastName]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);

  return parts.join(" ");
};

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
  expandedTaskIds,
  onDeleteTask,
  onToggleTaskExpanded,
  onViewTask,
}: {
  expandedTaskIds: Set<string>;
  onDeleteTask: (taskId: string) => void;
  onToggleTaskExpanded: (taskId: string) => void;
  onViewTask: (taskId: string) => void;
}): DashboardDataTableColumn<VisibleTaskListRow>[] => [
  {
    key: "taskName",
    label: "Task Name",
    className: thClassName,
    renderCell: (item) => (
      <div
        className="flex min-w-0 items-center gap-2"
        style={{ paddingLeft: `${Math.min(item.depth, 2) * 20}px` }}
      >
        {item.hasChildren ? (
          <button
            className="flex flex-none items-center text-[#6B7280]"
            type="button"
            onClick={() => onToggleTaskExpanded(item.id)}
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
            item.depth > 0 ? "bg-[#10B981]" : "bg-[#60A5FA]"
          }`}
        />
        <span className="line-clamp-2 min-w-0 text-sm font-semibold text-[#111827]">
          {item.taskName}
        </span>
      </div>
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
      <div className="flex min-w-0 items-center gap-2">
        <Avatar
          className="flex-none w-8 h-8"
          name={item.assignee.name}
          size="sm"
          src={item.assignee.avatar}
        />
        <span className="truncate">{item.assignee.name}</span>
      </div>
    ),
  },
  {
    key: "comment",
    label: "Latest comment",
    className: thClassName,
    renderCell: (item) => (
      <span className="line-clamp-1 text-sm text-[#111827]">
        {item.comment}
      </span>
    ),
  },
  {
    key: "dueDate",
    label: "Due Date",
    className: thClassName,
    renderCell: (item) => (
      <span className="inline-flex items-center whitespace-nowrap text-sm font-semibold text-[#DC2626]">
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
  const normalized = isoDate.includes("T") ? isoDate.slice(0, 10) : isoDate;
  const [year, month, day] = normalized.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return isoDate;
  }

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getTaskDueDateTime = (value?: string) => {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const normalized = value.includes("T") ? value.slice(0, 10) : value;
  const [year, month, day] = normalized.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return Number.POSITIVE_INFINITY;
  }

  return new Date(year, month - 1, day).getTime();
};

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getTaskDueDateKey = (value?: string) => {
  if (!value) {
    return "";
  }

  const normalized = value.includes("T") ? value.slice(0, 10) : value;
  const [year, month, day] = normalized.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
};

const sortTaskRowsByDueDate = (
  rows: TaskListRow[],
  originalIndexByTaskId: Map<string, number>,
) =>
  [...rows].sort((left, right) => {
    const dueDateDifference =
      getTaskDueDateTime(left.dueDate) - getTaskDueDateTime(right.dueDate);

    if (dueDateDifference !== 0) {
      return dueDateDifference;
    }

    return (
      (originalIndexByTaskId.get(left.id) ?? 0) -
      (originalIndexByTaskId.get(right.id) ?? 0)
    );
  });

const resolveServerAssetUrl = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(
    /\/api\/v\d+\/?$/,
    "",
  ).replace(/\/$/, "");
  const normalizedPath = value.replace(/^\/+/, "");

  return baseUrl ? `${baseUrl}/${normalizedPath}` : value;
};

const toTaskPanelProject = (project: ClientProject): TaskPanelProject => ({
  accountManagerAvatar: resolveServerAssetUrl(project.accountManager.avatar),
  accountManagerId: String(project.accountManagerId ?? ""),
  accountManagerName:
    getFullName(
      project.accountManager.firstName,
      project.accountManager.lastName,
    ) || "-",
  csmAvatar: resolveServerAssetUrl(project.clientSuccessManager.avatar),
  csmId: String(project.clientSuccessManagerId ?? ""),
  csmName:
    getFullName(
      project.clientSuccessManager.firstName,
      project.clientSuccessManager.lastName,
    ) || "-",
  dueDate: project.dueDate ?? null,
  id: String(project.id),
  name: project.project ?? `Project ${String(project.id)}`,
  startDate: project.startDate ?? null,
  status: normalizeProjectStatus(project.progress),
});

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
    blockedTaskId:
      typeof task.blockedTaskId === "number" ||
      typeof task.blockedTaskId === "string"
        ? String(task.blockedTaskId)
        : undefined,
    comment: "-",
    description: task.description ?? "",
    descriptionJson:
      task.descriptionJson && typeof task.descriptionJson === "object"
        ? (task.descriptionJson as Record<string, unknown>)
        : null,
    dueDate: task.dueDate ?? "",
    dueDateRuleType: task.dueDateRuleType ?? null,
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

const flattenTaskRowsByHierarchy = (
  rows: TaskListRow[],
  expandedTaskIds: Set<string>,
): VisibleTaskListRow[] => {
  const taskById = new Map(rows.map((row) => [row.id, row]));
  const originalIndexByTaskId = new Map(
    rows.map((row, index) => [row.id, index]),
  );
  const childrenByParentId = new Map<string, TaskListRow[]>();

  rows.forEach((row) => {
    if (!row.parentTaskId || !taskById.has(row.parentTaskId)) {
      return;
    }

    const current = childrenByParentId.get(row.parentTaskId) ?? [];

    current.push(row);
    childrenByParentId.set(row.parentTaskId, current);
  });

  const visibleRows: VisibleTaskListRow[] = [];
  const appendRow = (row: TaskListRow, depth: number, visited: Set<string>) => {
    if (visited.has(row.id)) {
      return;
    }

    const nextVisited = new Set(visited);
    const children = childrenByParentId.get(row.id) ?? [];

    nextVisited.add(row.id);
    visibleRows.push({
      ...row,
      depth,
      hasChildren: children.length > 0,
    });

    if (!children.length || !expandedTaskIds.has(row.id)) {
      return;
    }

    sortTaskRowsByDueDate(children, originalIndexByTaskId).forEach((child) =>
      appendRow(child, depth + 1, nextVisited),
    );
  };

  sortTaskRowsByDueDate(
    rows.filter((row) => !row.parentTaskId || !taskById.has(row.parentTaskId)),
    originalIndexByTaskId,
  ).forEach((row) => appendRow(row, 0, new Set<string>()));

  return visibleRows;
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
  const [isTaskListPanelOpen, setIsTaskListPanelOpen] = useState(false);
  const [resolvedProjectId, setResolvedProjectId] = useState(projectId ?? "");
  const [projectOptions, setProjectOptions] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [projectDetailsById, setProjectDetailsById] = useState<
    Record<string, TaskPanelProject>
  >({});
  const [rows, setRows] = useState<TaskListRow[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState("all");
  const [selectedDueDateFilter, setSelectedDueDateFilter] =
    useState(allDueDateFilter);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(
    () => new Set(toggleableColumnKeys),
  );
  const [selectedTask, setSelectedTask] = useState<TaskListRow | null>(null);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [users, setUsers] = useState<
    Array<{ avatar?: string | null; id: string; name: string }>
  >([]);
  const [clientName, setClientName] = useState("-");
  const [clientAddress, setClientAddress] = useState("-");
  const [statusOptions] = useState<string[]>([...TASK_STATUS_OPTIONS]);
  const [hasProcessedInitialTask, setHasProcessedInitialTask] = useState(false);
  const assigneeFilterOptions = useMemo(
    () =>
      Array.from(
        rows.reduce<Map<string, string>>((acc, row) => {
          const key = row.assignee.name || "-";

          acc.set(key, key);

          return acc;
        }, new Map()),
      )
        .map(([key, label]) => ({ key, label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [rows],
  );
  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const todayKey = getLocalDateKey(today);
    const weekEnd = new Date(today);

    weekEnd.setDate(today.getDate() + 7);

    return rows.filter((row) => {
      const normalizedStatus = normalizeTaskStatus(row.status);
      const dueDateKey = getTaskDueDateKey(row.dueDate);
      const dueDateTime = getTaskDueDateTime(row.dueDate);
      const matchesSearch =
        !query ||
        [
          row.taskName,
          row.projectType,
          row.assignee.name,
          row.comment,
          formatDateForDisplay(row.dueDate),
          normalizedStatus,
        ].some((value) => value.toLowerCase().includes(query));
      const matchesStatus =
        selectedStatusFilter === "all" ||
        normalizedStatus === selectedStatusFilter;
      const matchesAssignee =
        selectedAssigneeFilter === "all" ||
        row.assignee.name === selectedAssigneeFilter;
      const matchesDueDate =
        selectedDueDateFilter === allDueDateFilter ||
        (selectedDueDateFilter === "none" && !dueDateKey) ||
        (selectedDueDateFilter === "overdue" &&
          Boolean(dueDateKey) &&
          dueDateKey < todayKey) ||
        (selectedDueDateFilter === "today" && dueDateKey === todayKey) ||
        (selectedDueDateFilter === "this-week" &&
          Number.isFinite(dueDateTime) &&
          dueDateTime >= todayStart.getTime() &&
          dueDateTime <= weekEnd.getTime());

      return (
        matchesSearch && matchesStatus && matchesAssignee && matchesDueDate
      );
    });
  }, [
    rows,
    searchValue,
    selectedAssigneeFilter,
    selectedDueDateFilter,
    selectedStatusFilter,
  ]);
  const groups = useMemo(
    () => groupRowsByProjectType(filteredRows),
    [filteredRows],
  );
  const parentTaskIds = useMemo(() => {
    const taskIds = new Set(filteredRows.map((row) => row.id));
    const nextParentTaskIds = new Set<string>();

    filteredRows.forEach((row) => {
      if (row.parentTaskId && taskIds.has(row.parentTaskId)) {
        nextParentTaskIds.add(row.parentTaskId);
      }
    });

    return nextParentTaskIds;
  }, [filteredRows]);
  const hasActiveFilters =
    selectedAssigneeFilter !== "all" ||
    selectedDueDateFilter !== allDueDateFilter ||
    selectedStatusFilter !== "all";
  const currentProjectTaskOptions = useMemo(
    () =>
      rows
        .filter(
          (row) => !resolvedProjectId || row.projectId === resolvedProjectId,
        )
        .map((row) => ({
          id: row.id,
          label: row.taskName,
        })),
    [resolvedProjectId, rows],
  );
  const selectedTaskProjectId = selectedTask?.projectId ?? resolvedProjectId;
  const selectedPanelProject = useMemo(
    () =>
      selectedTaskProjectId
        ? (projectDetailsById[selectedTaskProjectId] ?? null)
        : null,
    [projectDetailsById, selectedTaskProjectId],
  );
  const selectedPanelTasks = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            !selectedTaskProjectId || row.projectId === selectedTaskProjectId,
        )
        .map((row) => ({
          assigneeAvatar: row.assignee.avatar,
          assigneeId: row.assigneeId ?? null,
          assigneeName: row.assignee.name,
          blockedTaskId: row.blockedTaskId ?? null,
          description: row.description,
          descriptionJson: row.descriptionJson ?? null,
          dueDate: row.dueDate || "-",
          dueDateRuleType: row.dueDateRuleType ?? null,
          id: row.id,
          name: row.taskName,
          parentTaskId: row.parentTaskId ?? null,
          status: row.status,
        })),
    [rows, selectedTaskProjectId],
  );
  const currentProjectParentTaskOptions = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            (!resolvedProjectId || row.projectId === resolvedProjectId) &&
            !row.parentTaskId,
        )
        .map((row) => ({
          id: row.id,
          label: row.taskName,
        })),
    [resolvedProjectId, rows],
  );

  useEffect(() => {
    setExpandedTaskIds(new Set(parentTaskIds));
  }, [parentTaskIds]);

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
        const allProjects: ClientProject[] = [];
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

          allProjects.push(...response.projects);
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
        const mappedProjectDetails = allProjects.reduce<
          Record<string, TaskPanelProject>
        >((acc, project) => {
          acc[String(project.id)] = toTaskPanelProject(project);

          return acc;
        }, {});

        setProjectOptions(mappedOptions);
        setProjectDetailsById(mappedProjectDetails);

        if (!resolvedProjectId && mappedOptions[0]) {
          setResolvedProjectId(mappedOptions[0].id);
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setProjectOptions([]);
        setProjectDetailsById({});
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
    setResolvedProjectId(matchedTask.projectId ?? resolvedProjectId);
    setSelectedTask(matchedTask);
    setIsTaskListPanelOpen(true);
    setHasProcessedInitialTask(true);
  }, [hasProcessedInitialTask, initialTaskId, resolvedProjectId, rows]);

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

  const handleAddTask = async (payload: AddProjectTemplateTaskFormValues) => {
    if (!session?.accessToken) {
      throw new Error("Your session has expired. Please login again.");
    }

    if (!resolvedProjectId) {
      throw new Error("Project selection is required.");
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const assigneeId = payload.assigneeId || users[0]?.id || "";
    const taskStatus =
      normalizeTaskStatus(payload.status) ||
      statusOptions[0] ||
      TASK_STATUS_OPTIONS[0];
    const accessToken = await getValidAccessToken();

    await clientsApi.createProjectTask(accessToken, resolvedProjectId, {
      assigneeId,
      description: payload.description,
      dueDate: todayIso,
      parentTaskId: payload.parentTaskId || undefined,
      projectId:
        projectOptions.find((project) => project.id === resolvedProjectId)
          ?.id ?? resolvedProjectId,
      status: taskStatus,
      taskName: payload.taskTitle,
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

  const handleTaskDueDateChange = async (taskId: string, dueDate: string) => {
    if (!session?.accessToken) {
      throw new Error("Your session has expired. Please login again.");
    }

    const accessToken = await getValidAccessToken();

    await clientsApi.updateProjectTask(accessToken, taskId, { dueDate });

    const latestRows = await loadTasks();
    const updatedTask = latestRows.find((row) => row.id === taskId);

    setSelectedTask((current) => updatedTask ?? current);
  };

  const handleTaskChange = async (
    taskId: string,
    payload: {
      assigneeId?: string;
      dueDate?: string;
      status?: string;
    },
  ) => {
    if (!session?.accessToken) {
      throw new Error("Your session has expired. Please login again.");
    }

    const accessToken = await getValidAccessToken();

    await clientsApi.updateProjectTask(accessToken, taskId, payload);

    const latestRows = await loadTasks();
    const updatedTask = latestRows.find((row) => row.id === taskId);

    setSelectedTask((current) => updatedTask ?? current);
  };

  const columns = buildColumns({
    expandedTaskIds,
    onDeleteTask: (taskId) => {
      void handleDeleteTask(taskId);
    },
    onToggleTaskExpanded: (taskId) => {
      setExpandedTaskIds((current) => {
        const next = new Set(current);

        if (next.has(taskId)) {
          next.delete(taskId);
        } else {
          next.add(taskId);
        }

        return next;
      });
    },
    onViewTask: (taskId) => {
      const task = rows.find((row) => row.id === taskId) ?? null;

      if (task?.projectId) {
        setResolvedProjectId(task.projectId);
      }
      setSelectedTask(task);
      setIsTaskListPanelOpen(true);
    },
  }).filter(
    (column) =>
      column.key === "action" || visibleColumnKeys.has(String(column.key)),
  );

  return (
    <>
      <Card className="border border-default-200 shadow-none">
        <CardHeader className="flex flex-col items-start justify-between gap-3 border-b-0 sm:flex-row sm:items-center">
          <h2 className="flex-none font-semibold text-[#111827]">Task List</h2>
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Dropdown closeOnSelect={false} placement="bottom-end">
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
                aria-label="Task filters"
                selectedKeys={
                  new Set([
                    `status:${selectedStatusFilter}`,
                    `assignee:${selectedAssigneeFilter}`,
                    `due:${selectedDueDateFilter}`,
                  ])
                }
                selectionMode="multiple"
                onAction={(key) => {
                  const value = String(key);

                  if (value === "reset") {
                    setSelectedStatusFilter("all");
                    setSelectedAssigneeFilter("all");
                    setSelectedDueDateFilter(allDueDateFilter);

                    return;
                  }

                  const [type, selectedValue] = value.split(":");

                  if (type === "status") {
                    setSelectedStatusFilter(selectedValue || "all");
                  }

                  if (type === "assignee") {
                    setSelectedAssigneeFilter(selectedValue || "all");
                  }

                  if (type === "due") {
                    setSelectedDueDateFilter(selectedValue || allDueDateFilter);
                  }
                }}
              >
                <DropdownSection
                  items={[
                    { key: "status:all", label: "All statuses" },
                    ...TASK_STATUS_OPTIONS.map((option) => ({
                      key: `status:${option}`,
                      label: option,
                    })),
                  ]}
                  title="Status"
                >
                  {(item) => (
                    <DropdownItem key={item.key}>{item.label}</DropdownItem>
                  )}
                </DropdownSection>
                <DropdownSection
                  items={[
                    { key: "assignee:all", label: "All assignees" },
                    ...assigneeFilterOptions.map((option) => ({
                      key: `assignee:${option.key}`,
                      label: option.label,
                    })),
                  ]}
                  title="Assignee"
                >
                  {(item) => (
                    <DropdownItem key={item.key}>{item.label}</DropdownItem>
                  )}
                </DropdownSection>
                <DropdownSection
                  items={dueDateFilterOptions.map((option) => ({
                    key: `due:${option.key}`,
                    label: option.label,
                  }))}
                  title="Due date"
                >
                  {(item) => (
                    <DropdownItem key={item.key}>{item.label}</DropdownItem>
                  )}
                </DropdownSection>
                <DropdownItem
                  key="reset"
                  className="text-danger"
                  color="danger"
                >
                  Reset
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
                aria-label="Toggle task columns"
                selectedKeys={visibleColumnKeys}
                selectionMode="multiple"
                onSelectionChange={(keys) => {
                  const nextKeys = new Set(Array.from(keys as Set<string>));

                  setVisibleColumnKeys(
                    nextKeys.size > 0
                      ? nextKeys
                      : new Set(toggleableColumnKeys),
                  );
                }}
              >
                {toggleableColumnKeys.map((columnKey) => {
                  const column = buildColumns({
                    expandedTaskIds,
                    onDeleteTask: () => undefined,
                    onToggleTaskExpanded: () => undefined,
                    onViewTask: () => undefined,
                  }).find((item) => item.key === columnKey);

                  return (
                    <DropdownItem key={columnKey}>
                      {column?.label ?? columnKey}
                    </DropdownItem>
                  );
                })}
              </DropdownMenu>
            </Dropdown>
            <Input
              className="max-w-[220px]"
              placeholder="Search here"
              startContent={<Search className="text-default-400" size={14} />}
              value={searchValue}
              onValueChange={setSearchValue}
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
            {groups.map((group) => {
              const visibleRows = flattenTaskRowsByHierarchy(
                group.rows,
                expandedTaskIds,
              );

              return (
                <AccordionItem
                  key={group.key}
                  aria-label={group.label}
                  title={group.label}
                >
                  <DashboardDataTable
                    ariaLabel={`${group.label} task list`}
                    columns={columns}
                    getRowKey={(item) => item.id}
                    rows={visibleRows}
                    title=""
                    withShell={false}
                  />
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardBody>
      </Card>

      <AddProjectTemplateTaskModal
        blockedTaskOptions={currentProjectTaskOptions}
        isOpen={isAddTaskOpen}
        parentTaskOptions={currentProjectParentTaskOptions}
        users={users}
        onOpenChange={setIsAddTaskOpen}
        onSubmit={handleAddTask}
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
        onOpenChange={(open) => {
          setIsTaskListPanelOpen(open);

          if (!open) {
            setSelectedTask(null);
          }
        }}
      >
        <DrawerContent className="h-screen max-h-screen rounded-none">
          <DrawerBody className="p-5">
            <ViewTaskListsPanelContent
              accountManagerAvatar={selectedPanelProject?.accountManagerAvatar}
              accountManagerId={selectedPanelProject?.accountManagerId ?? ""}
              accountManagerName={
                selectedPanelProject?.accountManagerName ?? "-"
              }
              address={clientAddress}
              clientName={clientName}
              csmAvatar={selectedPanelProject?.csmAvatar}
              csmId={selectedPanelProject?.csmId ?? ""}
              csmName={selectedPanelProject?.csmName ?? "-"}
              description=""
              initialSelectedTaskId={selectedTask?.id ?? null}
              projectDueDate={selectedPanelProject?.dueDate ?? null}
              projectId={selectedTaskProjectId ?? ""}
              projectName={selectedPanelProject?.name ?? "Project"}
              projectStartDate={selectedPanelProject?.startDate ?? null}
              status={selectedPanelProject?.status ?? "Draft"}
              tasks={selectedPanelTasks}
              users={users}
              onClose={() => {
                setIsTaskListPanelOpen(false);
                setSelectedTask(null);
              }}
              onTaskChange={handleTaskChange}
              onTaskDueDateChange={handleTaskDueDateChange}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};
