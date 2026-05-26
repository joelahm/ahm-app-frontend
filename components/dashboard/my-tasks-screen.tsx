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
import { Drawer, DrawerBody, DrawerContent } from "@heroui/drawer";
import { Input } from "@heroui/input";
import { Tab, Tabs } from "@heroui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { clientsApi, type ProjectTask } from "@/apis/clients";
import { usersApi } from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";
import { ViewTaskListsPanelContent } from "@/components/dashboard/client-details/view-task-lists-panel-content";
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
  dueDateValue?: string | null;
  id: string;
  isOrphanChild: boolean;
  latestComment: string;
  parentTaskName?: string;
  projectType: string;
  status: string;
  taskName: string;
};

type TaskGroup = {
  count: number;
  id: GroupId;
  label: string;
  rows: TaskRow[];
  tone?: "danger" | "default";
};

type GroupId = "overdue" | "later" | "completed";
type TaskListGroupByKey = "client" | "dueDate" | "projectType" | "status";
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
const TASKS_PER_PAGE = 10;
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
const GROUP_BY_LABELS: Record<TaskListGroupByKey, string> = {
  client: "Client",
  dueDate: "Due Date",
  projectType: "Project Type",
  status: "Status",
};
const DUE_DATE_GROUP_ORDER = [
  "due-in-3-days",
  "due-this-week",
  "later",
] as const;
const DUE_DATE_GROUP_LABELS: Record<
  (typeof DUE_DATE_GROUP_ORDER)[number],
  string
> = {
  "due-in-3-days": "Due in 3 days",
  "due-this-week": "Due this week",
  later: "Later / No Due Date",
};

const getPageItems = (
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const pages = new Set<number>([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  const validPages = Array.from(pages)
    .filter((page) => page > 1 && page < totalPages)
    .sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [1];

  for (const page of validPages) {
    const last = items[items.length - 1];

    if (typeof last === "number" && page - last > 1) {
      items.push("ellipsis");
    }

    items.push(page);
  }

  const last = items[items.length - 1];

  if (typeof last === "number" && totalPages - last > 1) {
    items.push("ellipsis");
  }

  items.push(totalPages);

  return items;
};

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

const compareTasksByDueDate = (left: TaskWithClient, right: TaskWithClient) => {
  const leftDate = parseDate(left.dueDate);
  const rightDate = parseDate(right.dueDate);
  const leftTime = leftDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightTime = rightDate?.getTime() ?? Number.POSITIVE_INFINITY;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return (left.taskName ?? "").localeCompare(right.taskName ?? "");
};

const getLaterTaskRowGroupId = (
  row: TaskRow,
): (typeof DUE_DATE_GROUP_ORDER)[number] => {
  const dueDate = parseDate(row.dueDateValue);

  if (!dueDate) {
    return "later";
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const dueInThreeDays = new Date(startOfToday);

  dueInThreeDays.setDate(startOfToday.getDate() + 3);

  const endOfWeek = new Date(startOfToday);
  const daysUntilSunday = 6 - startOfToday.getDay();

  endOfWeek.setDate(startOfToday.getDate() + daysUntilSunday);

  const dueTime = dueDate.getTime();

  if (dueTime <= dueInThreeDays.getTime()) {
    return "due-in-3-days";
  }

  if (dueTime <= endOfWeek.getTime()) {
    return "due-this-week";
  }

  return "later";
};

const groupLaterTaskRows = (rows: TaskRow[]) => {
  const groups = new Map<(typeof DUE_DATE_GROUP_ORDER)[number], TaskRow[]>(
    DUE_DATE_GROUP_ORDER.map((key) => [key, []]),
  );

  rows.forEach((row) => {
    groups.get(getLaterTaskRowGroupId(row))?.push(row);
  });

  return DUE_DATE_GROUP_ORDER.map((id) => ({
    id,
    label: DUE_DATE_GROUP_LABELS[id],
    rows: groups.get(id) ?? [],
  })).filter((group) => group.rows.length > 0);
};

const getLaterTaskRowClassName = (groupId: string) => {
  if (groupId === "due-in-3-days") {
    return "[&>td]:bg-[#FEF2F2]";
  }

  if (groupId === "due-this-week") {
    return "[&>td]:bg-[#FFFBEB]";
  }

  return "";
};

const getTaskRowGroupValue = (row: TaskRow, groupBy: TaskListGroupByKey) => {
  if (groupBy === "client") {
    return row.clientName || "No Client";
  }

  if (groupBy === "status") {
    return row.status || "No Status";
  }

  if (groupBy === "projectType") {
    return row.projectType || "No Project Type";
  }

  return "Due Date";
};

const groupTaskRows = (rows: TaskRow[], groupBy: TaskListGroupByKey) => {
  const groups = new Map<string, TaskRow[]>();

  rows.forEach((row) => {
    const groupKey = getTaskRowGroupValue(row, groupBy);
    const current = groups.get(groupKey) ?? [];

    current.push(row);
    groups.set(groupKey, current);
  });

  const statusOrder = new Map<string, number>(
    STATUS_LABELS.map((status, index) => [status, index]),
  );

  return Array.from(groups.entries())
    .map(([id, groupRows]) => ({
      id,
      label: id,
      rows: groupRows,
    }))
    .sort((left, right) => {
      if (groupBy === "status") {
        return (
          (statusOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
            (statusOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
          left.label.localeCompare(right.label)
        );
      }

      return left.label.localeCompare(right.label);
    });
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
      dueDateValue: task.dueDate ?? null,
    };
  }

  visited.add(taskId);

  const childRows = [...(tasksByParentId.get(taskId) ?? [])]
    .sort(compareTasksByDueDate)
    .map((childTask) =>
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
    dueDateValue: task.dueDate ?? null,
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

  const [allTasks, setAllTasks] = useState<TaskWithClient[]>([]);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientFilter, setSelectedClientFilter] = useState("all");
  const [selectedProjectTypeFilter, setSelectedProjectTypeFilter] =
    useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [taskListGroupBy, setTaskListGroupBy] =
    useState<TaskListGroupByKey>("dueDate");
  const [activeGroupTab, setActiveGroupTab] = useState<GroupId>("overdue");
  const [groupPages, setGroupPages] = useState<Record<GroupId, number>>({
    completed: 1,
    later: 1,
    overdue: 1,
  });
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(
    () => new Set(toggleableColumnKeys),
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [savingStatusTaskIds, setSavingStatusTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [users, setUsers] = useState<
    Array<{ avatar?: string; id: string; name: string }>
  >([]);
  const [reloadKey, setReloadKey] = useState(0);

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
        const response = await clientsApi.getProjectTasks(accessToken);

        if (!isActive) {
          return;
        }

        const enriched: TaskWithClient[] = response.tasks.map((task) => ({
          ...task,
          clientId: task.clientId ? String(task.clientId) : "",
          clientName: task.clientName?.trim() || "-",
          latestComment: formatCommentPreview(task.latestComment),
        }));

        setAllTasks(enriched);
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
  }, [currentUserId, getValidAccessToken, reloadKey, session]);

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
              avatar: user.avatarUrl ?? undefined,
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
        matchesSearch && matchesStatus && matchesClient && matchesProjectType
      );
    });
  }, [
    assignedTasks,
    searchQuery,
    selectedClientFilter,
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
      const sortedGroupTasks = [...groupTasks].sort(compareTasksByDueDate);
      const tasksInGroupById = new Map<string, TaskWithClient>();
      const tasksByParentId = new Map<string, TaskWithClient[]>();

      sortedGroupTasks.forEach((task) => {
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

      const topLevelTasks = sortedGroupTasks.filter(
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
        count: tasksByGroup.get("overdue")?.length ?? 0,
        id: "overdue",
        label: "Overdue",
        rows: overdueRows,
        tone: "danger",
      },
      {
        count: tasksByGroup.get("later")?.length ?? 0,
        id: "later",
        label: "Later / No Due Date",
        rows: laterRows,
      },
      {
        count: tasksByGroup.get("completed")?.length ?? 0,
        id: "completed",
        label: "Completed",
        rows: completedRows,
      },
    ];
  }, [allTasks, filteredTasks]);

  useEffect(() => {
    setGroupPages({
      completed: 1,
      later: 1,
      overdue: 1,
    });
  }, [
    searchQuery,
    selectedClientFilter,
    selectedProjectTypeFilter,
    selectedStatusFilter,
  ]);

  useEffect(() => {
    setGroupPages((current) => {
      let didChange = false;
      const next = { ...current };

      groupedTasks.forEach((group) => {
        const totalPages = Math.max(
          1,
          Math.ceil(group.rows.length / TASKS_PER_PAGE),
        );

        if ((next[group.id] ?? 1) > totalPages) {
          next[group.id] = totalPages;
          didChange = true;
        }
      });

      return didChange ? next : current;
    });
  }, [groupedTasks]);

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
    setSelectedTaskId(item.id);
  };

  const selectedTaskWithClient = useMemo(() => {
    if (!selectedTaskId) {
      return null;
    }

    return allTasks.find((task) => String(task.id) === selectedTaskId) ?? null;
  }, [allTasks, selectedTaskId]);

  const selectedTaskProjectId = selectedTaskWithClient?.projectId
    ? String(selectedTaskWithClient.projectId)
    : "";

  const selectedPanelTasks = useMemo(() => {
    if (!selectedTaskWithClient) {
      return [];
    }

    return allTasks
      .filter((task) => {
        const taskProjectId = task.projectId ? String(task.projectId) : "";

        if (selectedTaskProjectId) {
          return taskProjectId === selectedTaskProjectId;
        }

        return String(task.id) === String(selectedTaskWithClient.id);
      })
      .map((task) => ({
        assigneeAvatar: resolveServerAssetUrl(task.assignedTo.avatar),
        assigneeId: task.assignedToId ? String(task.assignedToId) : null,
        assigneeName: getTaskAssigneeName(task),
        blockedTaskId: task.blockedTaskId ? String(task.blockedTaskId) : null,
        description: task.description,
        descriptionJson: task.descriptionJson ?? null,
        dueDate: task.dueDate || "-",
        dueDateRuleType: task.dueDateRuleType ?? null,
        id: String(task.id),
        name: task.taskName?.trim() || task.task?.trim() || "Untitled task",
        parentTaskId: task.parentTaskId ? String(task.parentTaskId) : null,
        status: normalizeStatus(task.status),
      }));
  }, [allTasks, selectedTaskProjectId, selectedTaskWithClient]);

  const handlePanelTaskChange = async (
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
    setReloadKey((current) => current + 1);
  };

  const handleTaskStatusChange = async (taskId: string, status: string) => {
    const normalizedStatus = normalizeStatus(status);
    const currentTask = allTasks.find((task) => String(task.id) === taskId);

    if (
      !currentTask ||
      normalizeStatus(currentTask.status) === normalizedStatus
    ) {
      return;
    }

    if (!session?.accessToken) {
      toast.danger("Your session has expired. Please login again.");

      return;
    }

    const previousTasks = allTasks;

    setSavingStatusTaskIds((current) => new Set(current).add(taskId));
    setAllTasks((current) =>
      current.map((task) =>
        String(task.id) === taskId
          ? { ...task, status: normalizedStatus }
          : task,
      ),
    );

    try {
      const accessToken = await getValidAccessToken();
      const updatedTask = await clientsApi.updateProjectTask(
        accessToken,
        taskId,
        {
          status: normalizedStatus,
        },
      );

      setAllTasks((current) =>
        current.map((task) =>
          String(task.id) === taskId
            ? {
                ...task,
                ...updatedTask,
                clientId: updatedTask.clientId
                  ? String(updatedTask.clientId)
                  : task.clientId,
                clientName: updatedTask.clientName?.trim() || task.clientName,
                latestComment: formatCommentPreview(
                  updatedTask.latestComment ?? task.latestComment,
                ),
              }
            : task,
        ),
      );
    } catch (error) {
      setAllTasks(previousTasks);
      toast.danger("Could not update task status.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSavingStatusTaskIds((current) => {
        const next = new Set(current);

        next.delete(taskId);

        return next;
      });
    }
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
      const isSavingStatus = savingStatusTaskIds.has(item.id);

      return (
        <TableCell key={`${item.id}-${columnKey}`}>
          <Dropdown>
            <DropdownTrigger>
              <Button
                className="h-auto min-w-0 px-0"
                isDisabled={isSavingStatus}
                radius="full"
                variant="light"
              >
                <Chip
                  className={getStatusChipClassName(item.status)}
                  radius="full"
                  size="sm"
                >
                  <span className="inline-flex items-center gap-1">
                    {isSavingStatus ? "Saving..." : item.status}
                    <ChevronDown size={12} />
                  </span>
                </Chip>
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label={`Change status for ${item.taskName}`}
              selectedKeys={new Set([item.status])}
              selectionMode="single"
              onAction={(key) => {
                void handleTaskStatusChange(item.id, String(key));
              }}
            >
              {STATUS_LABELS.map((status) => (
                <DropdownItem key={status}>{status}</DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
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

  const renderPagination = (
    groupId: GroupId,
    currentPage: number,
    totalPages: number,
  ) => {
    if (totalPages <= 1) {
      return null;
    }

    const updatePage = (page: number) => {
      setGroupPages((current) => ({
        ...current,
        [groupId]: Math.min(Math.max(page, 1), totalPages),
      }));
    };

    return (
      <div className="flex items-center justify-center border-t-0 border-default-200 p-3">
        <Button
          isDisabled={currentPage <= 1}
          startContent={<ChevronLeft size={20} />}
          variant="light"
          onPress={() => updatePage(currentPage - 1)}
        >
          Prev
        </Button>

        <div className="flex items-center gap-1">
          {getPageItems(currentPage, totalPages).map((item, idx) => {
            if (item === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-sm text-default-500"
                >
                  ...
                </span>
              );
            }

            const isActive = item === currentPage;

            return (
              <Button
                key={`page-${groupId}-${item}`}
                className={`min-h-11 min-w-11 ${isActive ? "bg-[#022279] text-white" : ""}`}
                radius="full"
                variant={isActive ? "solid" : "light"}
                onPress={() => updatePage(item)}
              >
                {item}
              </Button>
            );
          })}
        </div>

        <Button
          endContent={<ChevronRight size={20} />}
          isDisabled={currentPage >= totalPages}
          variant="light"
          onPress={() => updatePage(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    );
  };

  const renderTaskTable = (group: TaskGroup) => {
    const totalPages = Math.max(
      1,
      Math.ceil(group.rows.length / TASKS_PER_PAGE),
    );
    const currentPage = Math.min(groupPages[group.id] ?? 1, totalPages);
    const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
    const paginatedTopLevelRows = group.rows.slice(
      startIndex,
      startIndex + TASKS_PER_PAGE,
    );
    const paginatedRows = flattenRows(paginatedTopLevelRows, expandedTaskIds);
    const shouldShowInternalGroups =
      taskListGroupBy !== "dueDate" || group.id === "later";
    const internalRowGroups =
      taskListGroupBy === "dueDate"
        ? groupLaterTaskRows(paginatedTopLevelRows)
        : groupTaskRows(paginatedTopLevelRows, taskListGroupBy);

    return (
      <>
        <Table
          removeWrapper
          aria-label={`${group.label} tasks table`}
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
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount}>
                  <div className="px-3 py-4 text-sm text-[#6B7280]">
                    No tasks found.
                  </div>
                </TableCell>
              </TableRow>
            ) : shouldShowInternalGroups ? (
              internalRowGroups.flatMap((rowGroup) => [
                <TableRow key={`${group.id}-group-${rowGroup.id}`}>
                  <TableCell
                    className="bg-white px-3 py-2"
                    colSpan={visibleColumnCount}
                  >
                    <Chip
                      className="bg-[#EEF2FF] text-[#4F46E5]"
                      radius="full"
                      size="sm"
                    >
                      {rowGroup.label}
                    </Chip>
                  </TableCell>
                </TableRow>,
                ...flattenRows(rowGroup.rows, expandedTaskIds).map((item) => (
                  <TableRow
                    key={`${group.id}-${rowGroup.id}-${item.id}`}
                    className={
                      taskListGroupBy === "dueDate"
                        ? getLaterTaskRowClassName(rowGroup.id)
                        : ""
                    }
                  >
                    {visibleTableColumnKeys.map((columnKey) =>
                      renderTaskCell(item, columnKey),
                    )}
                  </TableRow>
                )),
              ])
            ) : (
              paginatedRows.map((item) => (
                <TableRow key={`${group.id}-${item.id}`}>
                  {visibleTableColumnKeys.map((columnKey) =>
                    renderTaskCell(item, columnKey),
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {renderPagination(group.id, currentPage, totalPages)}
      </>
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
                <DropdownItem key="reset-filters" textValue="Reset filters">
                  <Button
                    fullWidth
                    radius="sm"
                    variant="bordered"
                    onPress={() => {
                      setSelectedStatusFilter("all");
                      setSelectedClientFilter("all");
                      setSelectedProjectTypeFilter("all");
                    }}
                  >
                    Reset
                  </Button>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
            <Dropdown placement="bottom-start">
              <DropdownTrigger>
                <Button
                  startContent={<SlidersHorizontal size={14} />}
                  variant="bordered"
                >
                  {`Group by: ${GROUP_BY_LABELS[taskListGroupBy]}`}
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Group my tasks by"
                selectedKeys={new Set([taskListGroupBy])}
                selectionMode="single"
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];

                  if (
                    selected === "dueDate" ||
                    selected === "client" ||
                    selected === "status" ||
                    selected === "projectType"
                  ) {
                    setTaskListGroupBy(selected);
                  }
                }}
              >
                <DropdownItem key="dueDate">Due Date</DropdownItem>
                <DropdownItem key="client">Client</DropdownItem>
                <DropdownItem key="status">Status</DropdownItem>
                <DropdownItem key="projectType">Project Type</DropdownItem>
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

        <CardBody className="py-0 px-4">
          <Tabs
            aria-label="My task groups"
            className="w-full"
            classNames={{
              base: "w-full",
              cursor: "bg-white shadow-none",
              panel: "p-0",
              tab: "h-9 rounded-lg px-4 text-sm font-medium data-[hover-unselected=true]:opacity-100",
              tabContent:
                "group-data-[selected=true]:text-[#111827] group-data-[selected=false]:text-[#111827]",
              tabList: "mt-4 mb-1 h-11 gap-0 rounded-xl bg-[#F3F4F6] p-1",
            }}
            selectedKey={activeGroupTab}
            onSelectionChange={(key) => setActiveGroupTab(key as GroupId)}
          >
            {groupedTasks.map((group) => (
              <Tab
                key={group.id}
                title={
                  <span className="flex items-center gap-2">
                    <span>{group.label}</span>
                    <Chip
                      className="h-5 min-w-5 px-1 text-[11px] font-semibold"
                      color={group.tone === "danger" ? "danger" : "default"}
                      radius="full"
                      size="sm"
                      variant="flat"
                    >
                      {group.count}
                    </Chip>
                  </span>
                }
              >
                {renderTaskTable(group)}
              </Tab>
            ))}
          </Tabs>
        </CardBody>
      </Card>
      <Drawer
        hideCloseButton
        classNames={{
          backdrop: "bg-black/20",
          base: "w-full max-w-4xl",
          wrapper: "justify-end",
        }}
        isDismissable={false}
        isOpen={Boolean(selectedTaskWithClient)}
        placement="right"
        scrollBehavior="inside"
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedTaskId(null);
          }
        }}
      >
        <DrawerContent className="h-screen max-h-screen rounded-none">
          <DrawerBody className="p-5">
            <ViewTaskListsPanelContent
              accountManagerName="-"
              address=""
              clientName={selectedTaskWithClient?.clientName ?? "-"}
              csmName="-"
              initialSelectedTaskId={selectedTaskId}
              projectDueDate={selectedTaskWithClient?.dueDate ?? null}
              projectId={selectedTaskProjectId}
              projectName={
                selectedTaskWithClient?.projectName?.trim() ||
                selectedTaskWithClient?.projectType?.trim() ||
                "Project"
              }
              projectStartDate={selectedTaskWithClient?.startDate ?? null}
              status="Draft"
              tasks={selectedPanelTasks}
              users={users}
              onClose={() => {
                setSelectedTaskId(null);
              }}
              onTaskChange={handlePanelTaskChange}
              onTaskDueDateChange={async (taskId, dueDate) => {
                await handlePanelTaskChange(taskId, { dueDate });
              }}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
