"use client";

import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { DatePicker } from "@heroui/date-picker";
import { Select, SelectItem } from "@heroui/select";
import { getLocalTimeZone, today } from "@internationalized/date";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  List,
  LocateIcon,
  MapPin,
  X,
} from "lucide-react";

import { clientsApi } from "@/apis/clients";
import { projectTemplatesApi } from "@/apis/project-templates";
import { useAuth } from "@/components/auth/auth-context";
import {
  RichTextEditor,
  buildDocFromPlainText,
  type JSONContent,
} from "@/components/dashboard/client-details/task-panel/editor/rich-text-editor";
import { TaskPanelAttachments } from "@/components/dashboard/client-details/task-panel/task-panel-attachments";
import { TaskPanelChecklists } from "@/components/dashboard/client-details/task-panel/task-panel-checklists";
import { TaskActivityFeed } from "@/components/dashboard/client-details/task-panel/task-activity/task-activity-feed";
import {
  TaskActivityRefreshProvider,
  useTaskActivityRefresh,
} from "@/components/dashboard/client-details/task-panel/task-activity/use-task-activity-refresh";
import { TaskStatusChip } from "@/components/dashboard/client-details/task-panel/task-status-chip";
import {
  calendarDateToIso,
  defaultProjectStatusOptions,
  getTaskDueDateTime,
  resolveServerAssetUrl,
  toCalendarDate,
  toFriendlyDate,
} from "@/components/dashboard/client-details/task-panel/task-panel-utils";
import { useAppToast } from "@/hooks/use-app-toast";
import { normalizeProjectStatus } from "@/lib/project-statuses";
import { normalizeTaskStatus, TASK_STATUS_OPTIONS } from "@/lib/task-statuses";

interface ViewTaskListsPanelContentProps {
  accountManagerAvatar?: string;
  accountManagerId?: string;
  accountManagerName: string;
  address: string;
  clientName: string;
  csmAvatar?: string;
  csmId?: string;
  csmName: string;
  description?: string;
  descriptionJson?: Record<string, unknown> | null;
  initialSelectedTaskId?: string | null;
  projectName: string;
  projectId: string;
  projectDueDate?: string | null;
  projectStartDate?: string | null;
  status?: string;
  onClose?: () => void;
  tasks?: Array<{
    assigneeAvatar?: string;
    assigneeId?: string | null;
    assigneeName: string;
    blockedTaskId?: string | null;
    description?: string | null;
    descriptionJson?: Record<string, unknown> | null;
    dueDate: string;
    dueDateOffsetDays?: number;
    dueDateRuleType?: string | null;
    id: string;
    name: string;
    parentTaskId?: string | null;
    status: string;
  }>;
  users?: Array<{ avatar?: string | null; id: string; name: string }>;
  onProjectMetaChange?: (payload: {
    accountManagerId?: string;
    csmId?: string;
    description?: string | null;
    descriptionJson?: Record<string, unknown> | null;
    dueDate?: string | null;
    startDate?: string | null;
    status?: string;
  }) => Promise<void> | void;
  onTaskDueDateChange?: (
    taskId: string,
    dueDate: string,
  ) => Promise<void> | void;
  onTaskChange?: (
    taskId: string,
    payload: {
      assigneeId?: string;
      dueDate?: string;
      status?: string;
    },
  ) => Promise<void> | void;
}

export const ViewTaskListsPanelContent = (
  props: ViewTaskListsPanelContentProps,
) => (
  <TaskActivityRefreshProvider>
    <ViewTaskListsPanelContentInner {...props} />
  </TaskActivityRefreshProvider>
);

const ViewTaskListsPanelContentInner = ({
  accountManagerAvatar,
  accountManagerId,
  accountManagerName,
  address,
  clientName,
  csmAvatar,
  csmId,
  csmName,
  description,
  descriptionJson: projectDescriptionJsonProp,
  initialSelectedTaskId,
  onClose,
  onProjectMetaChange,
  onTaskChange,
  onTaskDueDateChange,
  projectName,
  projectId,
  projectDueDate,
  projectStartDate,
  status,
  tasks = [],
  users = [],
}: ViewTaskListsPanelContentProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const { bump: bumpActivity } = useTaskActivityRefresh();
  const [activeAccountManagerId, setActiveAccountManagerId] =
    useState(accountManagerId);
  const [activeCsmId, setActiveCsmId] = useState(csmId);
  const todayDate = useMemo(() => today(getLocalTimeZone()), []);
  const [startDate, setStartDate] = useState(todayDate);
  const [dueDate, setDueDate] = useState(todayDate);
  const [activeStatus, setActiveStatus] = useState(
    normalizeProjectStatus(status),
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [projectStatusOptions, setProjectStatusOptions] = useState<string[]>(
    defaultProjectStatusOptions,
  );
  const [isSavingProjectMeta, setIsSavingProjectMeta] = useState(false);
  const [isSavingTaskDueDate, setIsSavingTaskDueDate] = useState(false);
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDueDate, setTaskDueDate] = useState(todayDate);
  const [taskStatus, setTaskStatus] = useState<string>(TASK_STATUS_OPTIONS[0]);
  const [taskOverridesById, setTaskOverridesById] = useState<
    Record<
      string,
      Partial<
        Pick<
          (typeof tasks)[number],
          | "assigneeAvatar"
          | "assigneeId"
          | "assigneeName"
          | "description"
          | "descriptionJson"
          | "dueDate"
          | "status"
        >
      >
    >
  >({});
  const [descriptionDraft, setDescriptionDraft] = useState<JSONContent | null>(
    null,
  );
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const [projectDescriptionDraft, setProjectDescriptionDraft] =
    useState<JSONContent | null>(null);
  const [projectDescriptionDirty, setProjectDescriptionDirty] = useState(false);
  const [isSavingProjectDescription, setIsSavingProjectDescription] =
    useState(false);
  const [
    isUploadingProjectDescriptionImage,
    setIsUploadingProjectDescriptionImage,
  ] = useState(false);
  const [isUploadingDescriptionImage, setIsUploadingDescriptionImage] =
    useState(false);

  useEffect(() => {
    setActiveAccountManagerId(accountManagerId);
  }, [accountManagerId]);

  useEffect(() => {
    setActiveCsmId(csmId);
  }, [csmId]);

  useEffect(() => {
    setActiveStatus(normalizeProjectStatus(status));
  }, [status]);

  useEffect(() => {
    setSelectedTaskId(initialSelectedTaskId ?? null);
    setExpandedTaskIds(new Set());
    setTaskOverridesById({});
    setProjectDescriptionDraft(null);
    setProjectDescriptionDirty(false);
  }, [initialSelectedTaskId, projectId]);

  useEffect(() => {
    setDescriptionDirty(false);
  }, [selectedTaskId]);

  useEffect(() => {
    const nextStartDate = toCalendarDate(projectStartDate) ?? todayDate;
    const nextDueDate = toCalendarDate(projectDueDate) ?? nextStartDate;

    setStartDate(nextStartDate);
    setDueDate(
      nextDueDate.compare(nextStartDate) < 0 ? nextStartDate : nextDueDate,
    );
  }, [projectDueDate, projectStartDate, todayDate]);

  const originalStartDate = useMemo(
    () => calendarDateToIso(toCalendarDate(projectStartDate) ?? todayDate),
    [projectStartDate, todayDate],
  );
  const originalDueDate = useMemo(() => {
    const nextStartDate = toCalendarDate(projectStartDate) ?? todayDate;
    const nextDueDate = toCalendarDate(projectDueDate) ?? nextStartDate;

    return calendarDateToIso(
      nextDueDate.compare(nextStartDate) < 0 ? nextStartDate : nextDueDate,
    );
  }, [projectDueDate, projectStartDate, todayDate]);

  const hasMetaChanges =
    (activeAccountManagerId ?? "") !== (accountManagerId ?? "") ||
    (activeCsmId ?? "") !== (csmId ?? "") ||
    (activeStatus ?? "On Going") !== normalizeProjectStatus(status) ||
    calendarDateToIso(startDate) !== originalStartDate ||
    calendarDateToIso(dueDate) !== originalDueDate;

  useEffect(() => {
    if (!session || !projectId) {
      setProjectStatusOptions(defaultProjectStatusOptions);

      return;
    }

    let isMounted = true;

    const loadProjectStatusOptions = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const response =
          await projectTemplatesApi.listProjectTemplateStatusOptions(
            accessToken,
          );
        const options = Array.from(
          new Set(
            response.statusOptions
              .map((item) => normalizeProjectStatus(item))
              .filter(Boolean),
          ),
        );

        if (!isMounted) {
          return;
        }

        setProjectStatusOptions(
          options.length ? options : defaultProjectStatusOptions,
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setProjectStatusOptions(defaultProjectStatusOptions);
      }
    };

    void loadProjectStatusOptions();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, projectId, session]);

  const subtitle = useMemo(
    () => `${clientName || "-"} | ${address || "-"}`,
    [address, clientName],
  );
  const panelTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        ...(taskOverridesById[task.id] ?? {}),
      })),
    [taskOverridesById, tasks],
  );
  const selectedTask = useMemo(
    () => panelTasks.find((task) => task.id === selectedTaskId) ?? null,
    [panelTasks, selectedTaskId],
  );
  const selectedTaskBlockedTask = useMemo(
    () =>
      selectedTask?.dueDateRuleType === "BLOCKED_TASK" &&
      selectedTask.blockedTaskId
        ? (panelTasks.find((task) => task.id === selectedTask.blockedTaskId) ??
          null)
        : null,
    [panelTasks, selectedTask],
  );
  const hasSelectedTaskDueDateChange = useMemo(
    () =>
      Boolean(selectedTask) &&
      calendarDateToIso(taskDueDate) !==
        calendarDateToIso(toCalendarDate(selectedTask?.dueDate) ?? todayDate),
    [selectedTask, taskDueDate, todayDate],
  );
  const hasSelectedTaskStatusChange = useMemo(
    () =>
      Boolean(selectedTask) &&
      taskStatus !== normalizeTaskStatus(selectedTask?.status ?? ""),
    [selectedTask, taskStatus],
  );
  const hasSelectedTaskAssigneeChange = useMemo(
    () =>
      Boolean(selectedTask) &&
      Boolean(taskAssigneeId) &&
      taskAssigneeId !== (selectedTask?.assigneeId ?? ""),
    [selectedTask, taskAssigneeId],
  );
  const canSaveSelectedTaskChanges = useMemo(
    () =>
      Boolean(selectedTask) &&
      ((hasSelectedTaskDueDateChange &&
        (Boolean(onTaskChange) || Boolean(onTaskDueDateChange))) ||
        ((hasSelectedTaskAssigneeChange || hasSelectedTaskStatusChange) &&
          Boolean(onTaskChange))),
    [
      hasSelectedTaskAssigneeChange,
      hasSelectedTaskDueDateChange,
      hasSelectedTaskStatusChange,
      onTaskChange,
      onTaskDueDateChange,
      selectedTask,
    ],
  );

  useEffect(() => {
    setTaskAssigneeId(selectedTask?.assigneeId ?? "");
    setTaskDueDate(toCalendarDate(selectedTask?.dueDate) ?? todayDate);
    setTaskStatus(
      normalizeTaskStatus(selectedTask?.status ?? TASK_STATUS_OPTIONS[0]),
    );
  }, [
    selectedTask?.assigneeId,
    selectedTask?.dueDate,
    selectedTask?.status,
    todayDate,
  ]);

  const orderedTasks = useMemo(
    () => panelTasks.map((task, index) => ({ index, task })),
    [panelTasks],
  );
  const taskOrderById = useMemo(
    () =>
      orderedTasks.reduce<Record<string, number>>((acc, { index, task }) => {
        acc[task.id] = index;

        return acc;
      }, {}),
    [orderedTasks],
  );
  const sortTasksByDueDate = useMemo(
    () => (items: typeof panelTasks) =>
      [...items].sort((left, right) => {
        const dueDateDifference =
          getTaskDueDateTime(left.dueDate) - getTaskDueDateTime(right.dueDate);

        if (dueDateDifference !== 0) {
          return dueDateDifference;
        }

        return (taskOrderById[left.id] ?? 0) - (taskOrderById[right.id] ?? 0);
      }),
    [taskOrderById],
  );
  const taskById = useMemo(
    () =>
      panelTasks.reduce<Record<string, (typeof panelTasks)[number]>>(
        (acc, task) => {
          acc[task.id] = task;

          return acc;
        },
        {},
      ),
    [panelTasks],
  );
  const childrenByParentId = useMemo(() => {
    const groups = new Map<string, typeof panelTasks>();

    orderedTasks.forEach(({ task }) => {
      if (!task.parentTaskId || !taskById[task.parentTaskId]) {
        return;
      }

      const current = groups.get(task.parentTaskId) ?? [];

      current.push(task);
      groups.set(task.parentTaskId, current);
    });

    return new Map(
      Array.from(groups.entries()).map(([taskId, children]) => [
        taskId,
        sortTasksByDueDate(children),
      ]),
    );
  }, [orderedTasks, sortTasksByDueDate, taskById]);
  const rootTasks = useMemo(
    () =>
      sortTasksByDueDate(
        orderedTasks
          .filter(
            ({ task }) =>
              !task.parentTaskId || !taskById[String(task.parentTaskId)],
          )
          .map(({ task }) => task),
      ),
    [orderedTasks, sortTasksByDueDate, taskById],
  );
  const parentTaskIds = useMemo(
    () =>
      new Set(
        Array.from(childrenByParentId.entries())
          .filter(([, children]) => children.length > 0)
          .map(([taskId]) => taskId),
      ),
    [childrenByParentId],
  );

  useEffect(() => {
    setExpandedTaskIds(new Set(parentTaskIds));
  }, [parentTaskIds, projectId]);

  const flattenedTaskRows = useMemo(() => {
    const rows: Array<{
      depth: number;
      isSubtask: boolean;
      task: (typeof panelTasks)[number];
    }> = [];

    const appendChildren = (
      taskId: string,
      depth: number,
      visited = new Set<string>(),
    ) => {
      const children = childrenByParentId.get(taskId) ?? [];

      children.forEach((child) => {
        if (visited.has(child.id)) {
          return;
        }

        const nextVisited = new Set(visited);

        nextVisited.add(child.id);
        rows.push({ depth, isSubtask: true, task: child });

        if (expandedTaskIds.has(child.id)) {
          appendChildren(child.id, depth + 1, nextVisited);
        }
      });
    };

    if (selectedTask) {
      appendChildren(selectedTask.id, 0, new Set([selectedTask.id]));

      return rows;
    }

    rootTasks.forEach((rootTask) => {
      rows.push({ depth: 0, isSubtask: false, task: rootTask });

      if (expandedTaskIds.has(rootTask.id)) {
        appendChildren(rootTask.id, 1, new Set([rootTask.id]));
      }
    });

    return rows;
  }, [
    childrenByParentId,
    expandedTaskIds,
    panelTasks,
    rootTasks,
    selectedTask,
  ]);
  const displayedTasks = useMemo(() => flattenedTaskRows, [flattenedTaskRows]);
  const hasTaskHierarchy = useMemo(
    () => tasks.some((task) => Boolean(task.parentTaskId)),
    [tasks],
  );
  const selectedTaskDescriptionValue = useMemo<JSONContent | null>(() => {
    if (!selectedTask) return null;
    if (descriptionDirty) return descriptionDraft;
    if (selectedTask.descriptionJson) {
      return selectedTask.descriptionJson as JSONContent;
    }

    return buildDocFromPlainText(selectedTask.description ?? null);
  }, [descriptionDirty, descriptionDraft, selectedTask]);

  const projectDescriptionValue = useMemo<JSONContent | null>(() => {
    if (projectDescriptionDirty) return projectDescriptionDraft;
    if (projectDescriptionJsonProp) {
      return projectDescriptionJsonProp as JSONContent;
    }

    return buildDocFromPlainText(description ?? null);
  }, [
    description,
    projectDescriptionDirty,
    projectDescriptionDraft,
    projectDescriptionJsonProp,
  ]);

  const handleSaveProjectDescription = async () => {
    if (
      !projectDescriptionDirty ||
      isSavingProjectDescription ||
      !onProjectMetaChange
    ) {
      return;
    }

    try {
      setIsSavingProjectDescription(true);
      await onProjectMetaChange({
        descriptionJson: projectDescriptionDraft as Record<
          string,
          unknown
        > | null,
      });
      setProjectDescriptionDirty(false);
      toast.success("Project description saved.");
    } catch (error) {
      toast.danger("Failed to save project description.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSavingProjectDescription(false);
    }
  };

  const handleSaveTaskDescription = async () => {
    if (!selectedTask || !descriptionDirty || isSavingDescription) return;
    if (!session?.accessToken) return;

    try {
      setIsSavingDescription(true);
      const accessToken = await getValidAccessToken();
      const payload = {
        descriptionJson: descriptionDraft as Record<string, unknown> | null,
      } as unknown as Partial<
        Parameters<typeof clientsApi.updateProjectTask>[2]
      >;
      const response = await clientsApi.updateProjectTask(
        accessToken,
        selectedTask.id,
        payload as Parameters<typeof clientsApi.updateProjectTask>[2],
      );
      const nextDescriptionJson = (response?.descriptionJson ?? null) as Record<
        string,
        unknown
      > | null;
      const nextDescriptionPlain = response?.description ?? null;

      setTaskOverridesById((current) => ({
        ...current,
        [selectedTask.id]: {
          ...(current[selectedTask.id] ?? {}),
          description: nextDescriptionPlain,
          descriptionJson: nextDescriptionJson,
        },
      }));
      setDescriptionDirty(false);
      toast.success("Description saved.");
    } catch (error) {
      toast.danger("Failed to save description.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSavingDescription(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          {selectedTask ? (
            <button
              className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-[#111827]"
              type="button"
              onClick={() => {
                setSelectedTaskId(null);
              }}
            >
              <ArrowLeft size={14} />
              {projectName || "-"}
            </button>
          ) : null}
          <h2 className="text-lg font-semibold leading-none text-[#111827]">
            {selectedTask?.name || projectName || "-"}
          </h2>
          <div className="mt-2 flex items-center gap-2 text-sm text-[#6B7280]">
            <MapPin className="text-[#022279]" size={14} />
            <span>{subtitle}</span>
          </div>
        </div>
        {onClose ? (
          <Button
            isIconOnly
            aria-label="Close task details"
            radius="full"
            size="sm"
            variant="light"
            onPress={onClose}
          >
            <X size={20} />
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl bg-[#F3F6FA] p-4">
        {selectedTask ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <CircleUserRound className="text-[#022279]" size={16} />
                <span>Assignee</span>
                {users.length > 0 ? (
                  <Select
                    aria-label="Task assignee"
                    className="ml-auto max-w-[220px]"
                    isDisabled={isSavingTaskDueDate}
                    selectedKeys={taskAssigneeId ? [taskAssigneeId] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const nextValue = Array.from(keys as Set<string>)[0];

                      if (!nextValue) {
                        return;
                      }

                      setTaskAssigneeId(nextValue);
                    }}
                  >
                    {users.map((user) => (
                      <SelectItem key={user.id}>{user.name}</SelectItem>
                    ))}
                  </Select>
                ) : (
                  <div className="ml-auto flex items-center gap-1 font-semibold text-[#111827]">
                    <Avatar
                      className="h-5 w-5"
                      name={selectedTask.assigneeName || "-"}
                      size="sm"
                      src={selectedTask.assigneeAvatar}
                    />
                    <span>{selectedTask.assigneeName || "-"}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-[#6B7280]">
                <LocateIcon className="text-[#022279]" size={16} />
                <span>Status</span>
                <Select
                  aria-label="Task status"
                  className="ml-auto max-w-[160px]"
                  isDisabled={isSavingTaskDueDate}
                  selectedKeys={taskStatus ? [taskStatus] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const first =
                      Array.from(keys as Set<string>)[0] ??
                      TASK_STATUS_OPTIONS[0];

                    setTaskStatus(first);
                  }}
                >
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option}>{option}</SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Calendar className="text-[#022279]" size={16} />
                <span>Due Date</span>
                <DatePicker
                  aria-label="Task due date"
                  className="ml-auto max-w-[150px]"
                  isDisabled={isSavingTaskDueDate}
                  size="sm"
                  value={taskDueDate}
                  onChange={(value) => {
                    if (value) {
                      setTaskDueDate(value);
                    }
                  }}
                />
              </div>
              {selectedTaskBlockedTask ? (
                <div className="flex items-center gap-2 text-[#6B7280]">
                  <List className="text-[#022279]" size={16} />
                  <span>Blocked Task</span>
                  <span className="ml-auto max-w-[260px] truncate font-semibold text-[#111827]">
                    {selectedTaskBlockedTask.name}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="col-span-2 flex justify-end">
              <Button
                className="bg-[#022279] text-white"
                isDisabled={!canSaveSelectedTaskChanges}
                isLoading={isSavingTaskDueDate}
                size="sm"
                onPress={async () => {
                  if (!selectedTask || !canSaveSelectedTaskChanges) {
                    return;
                  }

                  setIsSavingTaskDueDate(true);

                  try {
                    const taskPatch = {
                      ...(hasSelectedTaskAssigneeChange
                        ? { assigneeId: taskAssigneeId }
                        : {}),
                      ...(hasSelectedTaskDueDateChange
                        ? { dueDate: calendarDateToIso(taskDueDate) }
                        : {}),
                      ...(hasSelectedTaskStatusChange
                        ? { status: taskStatus }
                        : {}),
                    };

                    if (onTaskChange) {
                      await onTaskChange(selectedTask.id, taskPatch);
                    } else if (hasSelectedTaskDueDateChange) {
                      await onTaskDueDateChange?.(
                        selectedTask.id,
                        calendarDateToIso(taskDueDate),
                      );
                    }

                    setTaskOverridesById((current) => ({
                      ...current,
                      [selectedTask.id]: {
                        ...(current[selectedTask.id] ?? {}),
                        ...taskPatch,
                        ...(hasSelectedTaskAssigneeChange
                          ? {
                              assigneeAvatar:
                                users.find((user) => user.id === taskAssigneeId)
                                  ?.avatar ?? undefined,
                              assigneeName:
                                users.find((user) => user.id === taskAssigneeId)
                                  ?.name ?? selectedTask.assigneeName,
                            }
                          : {}),
                      },
                    }));

                    bumpActivity();
                    toast.success("Task updated.");
                  } catch (error) {
                    setTaskDueDate(
                      toCalendarDate(selectedTask.dueDate) ?? todayDate,
                    );
                    setTaskAssigneeId(selectedTask.assigneeId ?? "");
                    setTaskStatus(
                      normalizeTaskStatus(
                        selectedTask.status ?? TASK_STATUS_OPTIONS[0],
                      ),
                    );
                    toast.danger("Failed to update task", {
                      description:
                        error instanceof Error
                          ? error.message
                          : "Please try again.",
                    });
                  } finally {
                    setIsSavingTaskDueDate(false);
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <CircleUserRound className="text-[#022279]" size={16} />
                <span>CSM</span>
                {users.length > 0 ? (
                  <Select
                    aria-label="Select CSM"
                    className="ml-auto max-w-[220px]"
                    selectedKeys={activeCsmId ? [activeCsmId] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const nextValue = Array.from(keys as Set<string>)[0];

                      if (!nextValue) {
                        return;
                      }

                      setActiveCsmId(nextValue);
                    }}
                  >
                    {users.map((user) => (
                      <SelectItem key={user.id}>{user.name}</SelectItem>
                    ))}
                  </Select>
                ) : (
                  <div className="ml-auto flex items-center gap-1 font-semibold text-[#111827]">
                    <Avatar
                      className="h-5 w-5"
                      name={csmName || "-"}
                      size="sm"
                      src={csmAvatar}
                    />
                    <span>{csmName || "-"}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-[#6B7280]">
                <CircleUserRound className="text-[#022279]" size={16} />
                <span>Account Manager</span>
                {users.length > 0 ? (
                  <Select
                    aria-label="Select account manager"
                    className="ml-auto max-w-[220px]"
                    selectedKeys={
                      activeAccountManagerId ? [activeAccountManagerId] : []
                    }
                    size="sm"
                    onSelectionChange={(keys) => {
                      const nextValue = Array.from(keys as Set<string>)[0];

                      if (!nextValue) {
                        return;
                      }

                      setActiveAccountManagerId(nextValue);
                    }}
                  >
                    {users.map((user) => (
                      <SelectItem key={user.id}>{user.name}</SelectItem>
                    ))}
                  </Select>
                ) : (
                  <div className="ml-auto flex items-center gap-1 font-semibold text-[#111827]">
                    <Avatar
                      className="h-5 w-5"
                      name={accountManagerName || "-"}
                      size="sm"
                      src={accountManagerAvatar}
                    />
                    <span>{accountManagerName || "-"}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-[#6B7280]">
                <LocateIcon className="text-[#022279]" size={16} />
                <span>Status</span>
                <Select
                  aria-label="Select status"
                  className="ml-auto max-w-[160px]"
                  selectedKeys={activeStatus ? [activeStatus] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const first =
                      Array.from(keys as Set<string>)[0] ??
                      projectStatusOptions[0] ??
                      defaultProjectStatusOptions[0];

                    setActiveStatus(normalizeProjectStatus(first));
                  }}
                >
                  {projectStatusOptions.map((option) => (
                    <SelectItem key={option}>{option}</SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Calendar className="text-[#022279]" size={16} />
                <span>Start Date</span>
                <DatePicker
                  isReadOnly
                  aria-label="Select start date"
                  className="ml-auto max-w-[160px]"
                  minValue={todayDate}
                  size="sm"
                  value={startDate}
                />
              </div>
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Calendar className="text-[#022279]" size={16} />
                <span>Due Date</span>
                <DatePicker
                  isReadOnly
                  aria-label="Select due date"
                  className="ml-auto max-w-[160px]"
                  minValue={startDate}
                  size="sm"
                  value={dueDate}
                />
              </div>
            </div>
          </div>
        )}
        {!selectedTask ? (
          <div className="mt-4 flex justify-end">
            <Button
              className="bg-[#022279] text-white"
              isDisabled={!hasMetaChanges}
              isLoading={isSavingProjectMeta}
              size="sm"
              onPress={async () => {
                if (!onProjectMetaChange || !hasMetaChanges) {
                  return;
                }

                setIsSavingProjectMeta(true);

                try {
                  await onProjectMetaChange({
                    accountManagerId: activeAccountManagerId,
                    csmId: activeCsmId,
                    dueDate: calendarDateToIso(dueDate),
                    startDate: calendarDateToIso(startDate),
                    status: activeStatus,
                  });
                  toast.success("Project changes saved successfully.");
                } catch (error) {
                  toast.danger("Failed to save project changes", {
                    description:
                      error instanceof Error
                        ? error.message
                        : "Please try again.",
                  });
                } finally {
                  setIsSavingProjectMeta(false);
                }
              }}
            >
              Save
            </Button>
          </div>
        ) : null}
      </div>

      <Accordion
        className="space-y-5"
        defaultExpandedKeys={[
          "description",
          selectedTask ? "subtasks" : "task",
          "checklists",
          "attachments",
          "activity",
        ]}
        itemClasses={{
          base: "border-0 rounded-none shadow-none px-0 pb-4 last:pb-0",
          content: "pt-4 pb-0 px-0",
          heading: "px-0",
          title: "text-lg font-semibold text-[#111827]",
          trigger:
            "px-0 py-0 min-h-0 h-auto border-b border-default-200 pb-2 data-[hover=true]:bg-transparent",
        }}
        selectionMode="multiple"
        variant="splitted"
      >
        <AccordionItem
          key="description"
          aria-label="Description"
          title="Description"
        >
          {selectedTask ? (
            <div className="space-y-3">
              <RichTextEditor
                placeholder="Add a description for this task…"
                taskId={selectedTask.id}
                value={selectedTaskDescriptionValue}
                onChange={(json) => {
                  setDescriptionDraft(json);
                  setDescriptionDirty(true);
                }}
                onFetchUrlPreview={async (url) => {
                  const accessToken = await getValidAccessToken();

                  return clientsApi.getUrlPreview(accessToken, url);
                }}
                onUploadError={(message) => {
                  toast.danger("Image upload failed", {
                    description: message,
                  });
                }}
                onUploadImage={async (file) => {
                  const accessToken = await getValidAccessToken();
                  const attachment = await clientsApi.uploadTaskAttachment(
                    accessToken,
                    selectedTask.id,
                    file,
                  );

                  return {
                    url:
                      resolveServerAssetUrl(attachment.url) ?? attachment.url,
                  };
                }}
                onUploadStateChange={setIsUploadingDescriptionImage}
              />
              <div className="flex items-center justify-end gap-2">
                {isUploadingDescriptionImage ? (
                  <span className="text-xs text-default-500">Uploading…</span>
                ) : null}
                {descriptionDirty ? (
                  <Button
                    isDisabled={isSavingDescription}
                    radius="sm"
                    size="sm"
                    variant="light"
                    onPress={() => {
                      setDescriptionDirty(false);
                      setDescriptionDraft(null);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
                <Button
                  className="bg-[#022279] text-white"
                  isDisabled={!descriptionDirty || isUploadingDescriptionImage}
                  isLoading={isSavingDescription}
                  radius="sm"
                  size="sm"
                  onPress={() => {
                    void handleSaveTaskDescription();
                  }}
                >
                  Save description
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <RichTextEditor
                placeholder="Describe this project…"
                value={projectDescriptionValue}
                onChange={(json) => {
                  setProjectDescriptionDraft(json);
                  setProjectDescriptionDirty(true);
                }}
                onFetchUrlPreview={async (url) => {
                  const accessToken = await getValidAccessToken();

                  return clientsApi.getUrlPreview(accessToken, url);
                }}
                onUploadError={(message) =>
                  toast.danger("Image upload failed", { description: message })
                }
                onUploadStateChange={setIsUploadingProjectDescriptionImage}
              />
              <div className="flex items-center justify-end gap-2">
                {isUploadingProjectDescriptionImage ? (
                  <span className="text-xs text-default-500">Uploading…</span>
                ) : null}
                {projectDescriptionDirty ? (
                  <Button
                    isDisabled={isSavingProjectDescription}
                    radius="sm"
                    size="sm"
                    variant="light"
                    onPress={() => {
                      setProjectDescriptionDirty(false);
                      setProjectDescriptionDraft(null);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
                <Button
                  className="bg-[#022279] text-white"
                  isDisabled={
                    !projectDescriptionDirty ||
                    isUploadingProjectDescriptionImage
                  }
                  isLoading={isSavingProjectDescription}
                  radius="sm"
                  size="sm"
                  onPress={() => {
                    void handleSaveProjectDescription();
                  }}
                >
                  Save description
                </Button>
              </div>
            </div>
          )}
        </AccordionItem>

        <AccordionItem
          key={selectedTask ? "subtasks" : "task"}
          aria-label={selectedTask ? "Subtasks" : "Task"}
          title={selectedTask ? "Subtasks" : "Task"}
        >
          <div className="overflow-hidden rounded-lg border border-default-200 bg-white">
            {displayedTasks.map(({ depth, isSubtask, task }) => (
              <div
                key={task.id}
                className="grid min-h-[54px] grid-cols-[minmax(300px,1fr)_88px_170px_120px] items-center border-b border-default-200 text-sm last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3 px-3 py-2">
                  <div
                    className="flex min-w-0 items-center gap-2"
                    style={{ paddingLeft: `${depth * 18}px` }}
                  >
                    {parentTaskIds.has(task.id) ? (
                      <button
                        className="rounded p-0.5 text-[#6B7280] hover:bg-default-100"
                        type="button"
                        onClick={() => {
                          setExpandedTaskIds((current) => {
                            const next = new Set(current);

                            if (next.has(task.id)) {
                              next.delete(task.id);
                            } else {
                              next.add(task.id);
                            }

                            return next;
                          });
                        }}
                      >
                        {expandedTaskIds.has(task.id) ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                    ) : (
                      <span className="inline-block w-[18px] flex-none" />
                    )}
                    <span
                      className={`h-8 w-1 flex-none rounded-full ${
                        isSubtask ? "bg-[#10B981]" : "bg-[#60A5FA]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <button
                        className="block max-w-full truncate text-left text-sm font-semibold text-[#111827]"
                        type="button"
                        onClick={() => {
                          setSelectedTaskId(task.id);
                        }}
                      >
                        {task.name}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="border-l border-default-100 px-2 py-2">
                  <TaskStatusChip status={task.status} />
                </div>
                <div className="flex min-w-0 items-center gap-2 border-l border-default-100 px-2 py-2 text-xs text-[#6B7280]">
                  <Avatar
                    className="h-5 w-5 flex-none"
                    name={task.assigneeName || "-"}
                    size="sm"
                    src={task.assigneeAvatar}
                  />
                  <span className="truncate">{task.assigneeName || "-"}</span>
                </div>
                <div className="border-l border-default-100 px-2 py-2 text-xs font-semibold text-[#DC2626]">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={13} />
                    {toFriendlyDate(task.dueDate)}
                  </span>
                </div>
              </div>
            ))}
            {!selectedTask && !hasTaskHierarchy && displayedTasks.length > 0 ? (
              <p className="text-xs text-[#9CA3AF] m-3">
                No saved subtask hierarchy found for this project yet.
              </p>
            ) : null}
            {displayedTasks.length === 0 ? (
              <p className="text-sm text-[#6B7280] m-3">
                {selectedTask
                  ? "No subtasks for this task yet."
                  : "No tasks for this project yet."}
              </p>
            ) : null}
          </div>
        </AccordionItem>

        {selectedTask ? (
          <AccordionItem
            key="checklists"
            aria-label="Checklists"
            title="Checklists"
          >
            <TaskPanelChecklists taskId={selectedTask.id} />
          </AccordionItem>
        ) : null}

        {selectedTask ? (
          <AccordionItem
            key="attachments"
            aria-label="Attachments"
            title="Attachments"
          >
            <TaskPanelAttachments taskId={selectedTask.id} />
          </AccordionItem>
        ) : null}

        {selectedTask ? (
          <AccordionItem key="activity" aria-label="Activity" title="Activity">
            <TaskActivityFeed taskId={selectedTask.id} />
          </AccordionItem>
        ) : null}
      </Accordion>
    </div>
  );
};
