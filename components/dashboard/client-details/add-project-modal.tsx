"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { DatePicker } from "@heroui/date-picker";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input, Textarea } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { parseDate } from "@internationalized/date";
import {
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import {
  AddProjectTemplateTaskFormValues,
  AddProjectTemplateTaskModal,
} from "@/components/dashboard/settings/add-project-template-task-modal";
import { projectTemplatesApi } from "@/apis/project-templates";
import { useAuth } from "@/components/auth/auth-context";
import { TASK_STATUS_OPTIONS } from "@/lib/task-statuses";

const defaultProjectStatusOptions = [
  "Onboarding",
  "Planning",
  "Implementation",
  "On hold",
  "Closed",
  "Cancelled",
];

type TaskTableRow = {
  assigneeId?: string;
  blockedTaskId?: string;
  dependency: string;
  dependencyType?: string;
  dueDateTrigger: string;
  enableDependency?: boolean;
  id: string;
  isExpanded?: boolean;
  isSelected: boolean;
  labels: string[];
  level: number;
  parentTaskId?: string;
  status?: string;
  taskDescription: string;
  taskName: string;
  timeEstimate: string;
};

type ProjectTemplate = {
  description: string;
  tasks: TaskTableRow[];
};

const addProjectSchema = yup.object({
  accountManagerId: yup.string().required("Account manager is required"),
  clientSuccessManagerId: yup
    .string()
    .required("Client success manager is required"),
  dueDate: yup.string().required("Due date is required"),
  project: yup.string().required("Project is required"),
  startDate: yup.string().required("Start date is required"),
  status: yup.string().required("Status is required"),
});

const emptyProjectTasks: TaskTableRow[] = [];

const defaultProjectTemplates: Record<string, ProjectTemplate> = {
  Custom: {
    description: "",
    tasks: emptyProjectTasks,
  },
};

const getVisibleTaskRows = (rows: TaskTableRow[]) => {
  const expansionByLevel = new Map<number, boolean>();

  return rows.filter((row) => {
    if (row.level === 0) {
      expansionByLevel.clear();
      expansionByLevel.set(0, Boolean(row.isExpanded));

      return true;
    }

    for (let level = 0; level <= row.level - 1; level += 1) {
      if (!expansionByLevel.get(level)) {
        return false;
      }
    }

    if (row.level === 1) {
      expansionByLevel.set(1, Boolean(row.isExpanded));

      return true;
    }

    expansionByLevel.set(row.level, Boolean(row.isExpanded));

    return true;
  });
};

const getTaskSubtreeEndIndex = (rows: TaskTableRow[], startIndex: number) => {
  const sourceRow = rows[startIndex];

  if (!sourceRow) {
    return startIndex;
  }

  let endIndex = startIndex + 1;

  while (endIndex < rows.length && rows[endIndex].level > sourceRow.level) {
    endIndex += 1;
  }

  return endIndex;
};

const getDescendantTaskIds = (rows: TaskTableRow[], taskId: string) => {
  const sourceIndex = rows.findIndex((row) => row.id === taskId);

  if (sourceIndex < 0) {
    return new Set<string>();
  }

  const endIndex = getTaskSubtreeEndIndex(rows, sourceIndex);

  return new Set(rows.slice(sourceIndex + 1, endIndex).map((row) => row.id));
};

const parseDueDateTriggerDays = (value?: string) => {
  const match = value?.match(/^(\d+)/);

  return match?.[1] ?? "0";
};

const moveTaskRows = ({
  nextParentTaskId,
  rows,
  taskId,
}: {
  nextParentTaskId?: string;
  rows: TaskTableRow[];
  taskId: string;
}) => {
  const sourceIndex = rows.findIndex((row) => row.id === taskId);

  if (sourceIndex < 0) {
    return rows;
  }

  const sourceRow = rows[sourceIndex];
  const endIndex = getTaskSubtreeEndIndex(rows, sourceIndex);
  const subtree = rows.slice(sourceIndex, endIndex);
  const subtreeIds = new Set(subtree.map((row) => row.id));
  const normalizedParentTaskId =
    nextParentTaskId && !subtreeIds.has(nextParentTaskId)
      ? nextParentTaskId
      : undefined;
  const rowsWithoutSubtree = [
    ...rows.slice(0, sourceIndex),
    ...rows.slice(endIndex),
  ];
  const parentRow = normalizedParentTaskId
    ? rowsWithoutSubtree.find((row) => row.id === normalizedParentTaskId)
    : null;
  const nextLevel = parentRow ? Math.min(parentRow.level + 1, 2) : 0;
  const maxRelativeDepth = subtree.reduce(
    (maxDepth, row) => Math.max(maxDepth, row.level - sourceRow.level),
    0,
  );

  if (nextLevel + maxRelativeDepth > 2) {
    return rows;
  }

  const levelDelta = nextLevel - sourceRow.level;
  const updatedSubtree = subtree.map((row, index) => ({
    ...row,
    level: Math.min(Math.max(row.level + levelDelta, 0), 2),
    parentTaskId: index === 0 ? normalizedParentTaskId : row.parentTaskId,
  }));
  const normalizedRows = rowsWithoutSubtree.map((row) =>
    row.id === normalizedParentTaskId ? { ...row, isExpanded: true } : row,
  );

  if (!parentRow) {
    return [...normalizedRows, ...updatedSubtree];
  }

  let insertIndex = normalizedRows.findIndex((row) => row.id === parentRow.id);

  if (insertIndex < 0) {
    return [...normalizedRows, ...updatedSubtree];
  }

  insertIndex += 1;

  while (
    insertIndex < normalizedRows.length &&
    normalizedRows[insertIndex].level > parentRow.level
  ) {
    insertIndex += 1;
  }

  return [
    ...normalizedRows.slice(0, insertIndex),
    ...updatedSubtree,
    ...normalizedRows.slice(insertIndex),
  ];
};

export type AddProjectFormValues = yup.InferType<typeof addProjectSchema> & {
  clientId?: string;
  description?: string;
  phase: string;
  progress: string;
  tasks?: TaskTableRow[];
};

interface AddProjectModalProps {
  clientOptions?: Array<{
    address?: string | null;
    id: string;
    name: string;
  }>;
  clientAddress?: string;
  clientName: string;
  fixedClientId?: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (payload: AddProjectFormValues) => void | Promise<void>;
  users: Array<{
    avatar?: string | null;
    id: string;
    name: string;
  }>;
}

const labelClassName = "mb-1.5 block text-xs font-medium text-[#6B7280]";

const today = new Date().toISOString().slice(0, 10);

const toCalendarDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const normalized = value.includes("T") ? value.slice(0, 10) : value;

  try {
    return parseDate(normalized);
  } catch {
    return null;
  }
};

export const AddProjectModal = ({
  clientOptions = [],
  clientAddress: _clientAddress,
  clientName,
  fixedClientId,
  isOpen,
  onOpenChange,
  onSubmit,
  users,
}: AddProjectModalProps) => {
  const { getValidAccessToken, session } = useAuth();
  const [submitError, setSubmitError] = useState("");
  const [availableTemplates, setAvailableTemplates] = useState<
    Record<string, ProjectTemplate>
  >(defaultProjectTemplates);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [projectStatusOptions, setProjectStatusOptions] = useState<string[]>(
    defaultProjectStatusOptions,
  );
  const isClientSelectionRequired = !fixedClientId;
  const firstTemplateName = Object.keys(availableTemplates)[0] ?? "Custom";
  const [taskRows, setTaskRows] = useState<TaskTableRow[]>(
    availableTemplates[firstTemplateName]?.tasks ?? [],
  );

  useEffect(() => {
    if (!isOpen || !session) {
      return;
    }

    const loadProjectTemplates = async () => {
      setIsLoadingTemplates(true);

      try {
        const accessToken = await getValidAccessToken();

        const { projectTemplates: apiTemplates } =
          await projectTemplatesApi.listProjectTemplates(accessToken);

        const transformedTemplates: Record<string, ProjectTemplate> = {
          Custom: defaultProjectTemplates["Custom"],
        };

        apiTemplates.forEach((template) => {
          transformedTemplates[template.projectName] = {
            description: template.description,
            tasks: template.tasks.map((task) => ({
              dependency: task.dependency,
              blockedTaskId: task.blockedTaskId,
              dependencyType: task.dependencyType,
              dueDateTrigger: task.dueDateTrigger,
              enableDependency: task.enableDependency,
              id: task.id,
              isExpanded: task.isExpanded,
              isSelected: task.isSelected ?? false,
              labels: task.labels ?? [],
              level: task.level ?? 0,
              parentTaskId: task.parentTaskId,
              status: task.status,
              taskDescription: task.taskDescription,
              taskName: task.taskName,
              timeEstimate: "",
            })),
          };
        });

        setAvailableTemplates(transformedTemplates);
      } catch {
        setAvailableTemplates(defaultProjectTemplates);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    void loadProjectTemplates();
  }, [getValidAccessToken, isOpen, session]);

  const topLevelTaskRows = useMemo(
    () => taskRows.filter((task) => task.level === 0),
    [taskRows],
  );

  const childCountByTaskId = useMemo(
    () =>
      taskRows.reduce<Record<string, number>>((acc, task) => {
        if (task.parentTaskId) {
          acc[task.parentTaskId] = (acc[task.parentTaskId] ?? 0) + 1;
        }

        return acc;
      }, {}),
    [taskRows],
  );

  const visibleTaskRows = useMemo(
    () => getVisibleTaskRows(taskRows),
    [taskRows],
  );

  const moveTask = (taskId: string, parentTaskId?: string) => {
    setTaskRows((current) =>
      moveTaskRows({
        nextParentTaskId: parentTaskId,
        rows: current,
        taskId,
      }),
    );
  };

  const handleMakeTaskTopLevel = (draggedId?: string) => {
    const taskId = draggedId || draggingTaskId;

    if (!taskId) {
      return;
    }

    moveTask(taskId);
  };

  const handleDropOnTask = (targetRow: TaskTableRow, draggedId?: string) => {
    const taskId = draggedId || draggingTaskId;

    if (!taskId || taskId === targetRow.id) {
      return;
    }

    const descendants = getDescendantTaskIds(taskRows, taskId);

    if (descendants.has(targetRow.id)) {
      return;
    }

    const parentTaskId =
      targetRow.level >= 2 ? targetRow.parentTaskId : targetRow.id;

    moveTask(taskId, parentTaskId);
  };

  const handleAddTask = (payload: AddProjectTemplateTaskFormValues) => {
    setTaskRows((current) => {
      const parentIndex = current.findIndex(
        (row) => row.id === payload.parentTaskId,
      );
      const parentRow = parentIndex >= 0 ? current[parentIndex] : null;
      const nextTask: TaskTableRow = {
        dependency:
          payload.enableDependency && payload.blockedTaskId
            ? (current.find((row) => row.id === payload.blockedTaskId)
                ?.taskName ?? "-")
            : "-",
        dueDateTrigger: payload.enableDependency
          ? `${payload.remapDays} Days ${(payload.dependencyType ?? "After trigger date").toLowerCase()}`
          : "On trigger date",
        id: `task-${Date.now()}`,
        assigneeId: payload.assigneeId,
        isSelected: false,
        labels: payload.labels,
        level: parentRow ? Math.min(parentRow.level + 1, 2) : 0,
        parentTaskId: payload.parentTaskId,
        status: payload.status,
        taskDescription: payload.description?.trim() || "-",
        taskName: payload.taskTitle,
        timeEstimate: "",
      };

      if (!parentRow) {
        return [...current, nextTask];
      }

      const nextRows = current.map((row) =>
        row.id === parentRow.id ? { ...row, isExpanded: true } : row,
      );
      let insertIndex = parentIndex + 1;

      while (
        insertIndex < nextRows.length &&
        nextRows[insertIndex].level > parentRow.level
      ) {
        insertIndex += 1;
      }

      return [
        ...nextRows.slice(0, insertIndex),
        nextTask,
        ...nextRows.slice(insertIndex),
      ];
    });
  };

  const removeTask = (taskId?: string) => {
    if (!taskId) {
      setTaskRows((current) => current.filter((row) => !row.isSelected));

      return;
    }

    setTaskRows((current) => {
      const sourceIndex = current.findIndex((row) => row.id === taskId);

      if (sourceIndex < 0) {
        return current;
      }

      const endIndex = getTaskSubtreeEndIndex(current, sourceIndex);
      const deletedIds = new Set(
        current.slice(sourceIndex, endIndex).map((row) => row.id),
      );

      return current
        .filter((row) => !deletedIds.has(row.id))
        .map((row) =>
          row.blockedTaskId && deletedIds.has(row.blockedTaskId)
            ? {
                ...row,
                blockedTaskId: undefined,
                dependency: "-",
                dependencyType: undefined,
                dueDateTrigger: "On trigger date",
                enableDependency: false,
              }
            : row,
        );
    });
  };

  const updateTask = (
    taskId: string,
    payload: AddProjectTemplateTaskFormValues,
  ) => {
    setTaskRows((current) => {
      const sourceIndex = current.findIndex((row) => row.id === taskId);

      if (sourceIndex < 0) {
        return current;
      }

      const parentIndex = current.findIndex(
        (row) => row.id === payload.parentTaskId,
      );
      const parentRow = parentIndex >= 0 ? current[parentIndex] : null;
      const nextLevel = parentRow ? Math.min(parentRow.level + 1, 2) : 0;
      const sourceRow = current[sourceIndex];
      const updatedTaskRow = {
        ...sourceRow,
        assigneeId: payload.assigneeId,
        blockedTaskId: payload.blockedTaskId,
        dependency:
          payload.enableDependency && payload.blockedTaskId
            ? (current.find((item) => item.id === payload.blockedTaskId)
                ?.taskName ?? "-")
            : "-",
        dependencyType: payload.dependencyType,
        dueDateTrigger: payload.enableDependency
          ? `${payload.remapDays} Days ${(payload.dependencyType ?? "After trigger date").toLowerCase()}`
          : "On trigger date",
        enableDependency: payload.enableDependency,
        labels: payload.labels,
        level: nextLevel,
        parentTaskId: payload.parentTaskId,
        status: payload.status,
        taskDescription: payload.description?.trim() || "-",
        taskName: payload.taskTitle,
      };

      if ((payload.parentTaskId ?? "") === (sourceRow.parentTaskId ?? "")) {
        return current.map((row) => (row.id === taskId ? updatedTaskRow : row));
      }

      const movedRows = moveTaskRows({
        nextParentTaskId: payload.parentTaskId || undefined,
        rows: current,
        taskId,
      });

      return movedRows.map((row) =>
        row.id === taskId
          ? {
              ...updatedTaskRow,
              level: row.level,
              parentTaskId: row.parentTaskId,
            }
          : row,
      );
    });
  };

  const childCount = childCountByTaskId;

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddProjectFormValues>({
    defaultValues: {
      accountManagerId: users[0]?.id ?? "",
      clientId: fixedClientId ?? clientOptions[0]?.id ?? "",
      clientSuccessManagerId: users[0]?.id ?? "",
      description: availableTemplates[firstTemplateName]?.description ?? "",
      dueDate: today,
      phase: "Onboarding",
      progress: defaultProjectStatusOptions[0],
      project: firstTemplateName,
      startDate: today,
      status: defaultProjectStatusOptions[0],
    },
    mode: "onBlur",
  });

  const selectedStatus = watch("status");
  const selectedStartDate = watch("startDate");

  useEffect(() => {
    if (!isOpen || !session) {
      return;
    }

    let isMounted = true;

    const loadStatusOptions = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const response =
          await projectTemplatesApi.listProjectTemplateStatusOptions(
            accessToken,
          );
        const nextOptions = response.statusOptions.length
          ? response.statusOptions
          : defaultProjectStatusOptions;

        if (!isMounted) {
          return;
        }

        setProjectStatusOptions(nextOptions);

        const currentStatus = watch("status");

        if (!currentStatus || !nextOptions.includes(currentStatus)) {
          setValue("status", nextOptions[0] ?? "");
        }
      } catch {
        if (isMounted) {
          setProjectStatusOptions(defaultProjectStatusOptions);
        }
      }
    };

    void loadStatusOptions();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, isOpen, session, setValue, watch]);

  const parentTaskOptions = useMemo(
    () =>
      topLevelTaskRows.map((row) => ({
        id: row.id,
        label: row.taskName,
      })),
    [topLevelTaskRows],
  );
  const blockedTaskOptions = useMemo(
    () =>
      taskRows.map((row) => ({
        id: row.id,
        label: row.taskName,
      })),
    [taskRows],
  );
  const editingTask = useMemo(
    () => taskRows.find((row) => row.id === editingTaskId) ?? null,
    [editingTaskId, taskRows],
  );
  const editableParentTaskOptions = useMemo(() => {
    if (!editingTaskId) {
      return parentTaskOptions;
    }

    const excludedIds = getDescendantTaskIds(taskRows, editingTaskId);

    excludedIds.add(editingTaskId);

    return parentTaskOptions.filter((option) => !excludedIds.has(option.id));
  }, [editingTaskId, parentTaskOptions, taskRows]);
  const editableBlockedTaskOptions = useMemo(() => {
    if (!editingTaskId) {
      return blockedTaskOptions;
    }

    const excludedIds = getDescendantTaskIds(taskRows, editingTaskId);

    excludedIds.add(editingTaskId);

    return blockedTaskOptions.filter((option) => !excludedIds.has(option.id));
  }, [blockedTaskOptions, editingTaskId, taskRows]);
  const editingTaskInitialValues =
    useMemo<Partial<AddProjectTemplateTaskFormValues> | null>(() => {
      if (!editingTask) {
        return null;
      }

      const taskStatus = TASK_STATUS_OPTIONS.includes(
        editingTask.status as AddProjectTemplateTaskFormValues["status"],
      )
        ? (editingTask.status as AddProjectTemplateTaskFormValues["status"])
        : TASK_STATUS_OPTIONS[0];

      return {
        assigneeId: editingTask.assigneeId ?? "",
        blockedTaskId: editingTask.blockedTaskId ?? "",
        dependencyType: editingTask.dependencyType ?? "",
        description:
          editingTask.taskDescription === "-"
            ? ""
            : editingTask.taskDescription,
        enableDependency: Boolean(editingTask.enableDependency),
        labels: editingTask.labels,
        parentTaskId: editingTask.parentTaskId ?? "",
        remapDays: parseDueDateTriggerDays(editingTask.dueDateTrigger),
        status: taskStatus,
        taskTitle: editingTask.taskName,
      };
    }, [editingTask]);

  const taskColumns = useMemo<DashboardDataTableColumn<TaskTableRow>[]>(
    () => [
      {
        key: "select",
        label: "",
        className:
          "bg-[#F9FAFB] text-xs font-medium text-[#111827] !rounded-none w-12",
        renderCell: (item) => (
          <Checkbox
            isSelected={item.isSelected}
            onValueChange={(isSelected) => {
              setTaskRows((current) =>
                current.map((row) =>
                  row.id === item.id ? { ...row, isSelected } : row,
                ),
              );
            }}
          />
        ),
      },
      {
        key: "taskName",
        label: "Task Name",
        className:
          "bg-[#F9FAFB] text-xs font-medium text-[#111827] !rounded-none",
        renderCell: (item) => {
          const isParent = childCount[item.id] > 0;

          return (
            <div
              className={`flex items-center gap-2 ${
                item.level === 1 ? "pl-5" : item.level >= 2 ? "pl-10" : ""
              }`}
            >
              <GripVertical
                className="shrink-0 cursor-grab text-default-400"
                size={14}
              />
              {isParent ? (
                <button
                  className="flex flex-none items-center text-[#6B7280]"
                  type="button"
                  onClick={() => {
                    setTaskRows((current) =>
                      current.map((row) =>
                        row.id === item.id
                          ? { ...row, isExpanded: !row.isExpanded }
                          : row,
                      ),
                    );
                  }}
                >
                  {item.isExpanded ? (
                    <ChevronDown className="flex-none" size={12} />
                  ) : (
                    <ChevronRight className="flex-none" size={12} />
                  )}
                </button>
              ) : (
                <span className="inline-block w-3 flex-none" />
              )}
              <span className="line-clamp-2">{item.taskName}</span>
            </div>
          );
        },
      },
      {
        key: "taskDescription",
        label: "Task Description",
        className:
          "bg-[#F9FAFB] text-xs font-medium text-[#111827] !rounded-none",
        renderCell: (item) => (
          <span className="line-clamp-2">{item.taskDescription}</span>
        ),
      },
      {
        key: "dependency",
        label: "Dependencies",
        className:
          "bg-[#F9FAFB] text-xs font-medium text-[#111827] !rounded-none",
        renderCell: (item) => <span>{item.dependency}</span>,
      },
      {
        key: "dueDateTrigger",
        label: "Due date trigger",
        className:
          "bg-[#F9FAFB] text-xs font-medium text-[#111827] !rounded-none",
        renderCell: (item) => (
          <span className="line-clamp-2 text-sm text-[#1F2937]">
            {item.dueDateTrigger}
          </span>
        ),
      },
      {
        key: "timeEstimate",
        label: "Time Estimate",
        className:
          "bg-[#F9FAFB] text-xs font-medium text-[#111827] !rounded-none",
        renderCell: (item) => <span>{item.timeEstimate}</span>,
      },
      {
        key: "status",
        label: "Status",
        className:
          "bg-[#F9FAFB] text-xs font-medium text-[#111827] !rounded-none",
        renderCell: (item) => (
          <span className="whitespace-nowrap">{item.status ?? "-"}</span>
        ),
      },
      {
        key: "labels",
        label: "Labels",
        className:
          "bg-[#F9FAFB] text-xs font-medium text-[#111827] !rounded-none",
        renderCell: (item) => (
          <div className="flex flex-wrap gap-1">
            {item.labels.length > 0 ? (
              item.labels.map((label) => (
                <Chip
                  key={label}
                  className="bg-[#EEF2FF] text-[#6366F1]"
                  radius="sm"
                  size="sm"
                  variant="flat"
                >
                  {label}
                </Chip>
              ))
            ) : (
              <span>-</span>
            )}
          </div>
        ),
      },
      {
        key: "action",
        label: "Action",
        className:
          "bg-[#F9FAFB] text-xs font-medium text-[#111827] !rounded-none text-right",
        renderCell: (item) => (
          <div className="flex justify-end">
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button isIconOnly radius="md" size="sm" variant="bordered">
                  <EllipsisVertical size={14} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label={`Task ${item.taskName} actions`}>
                <DropdownItem
                  key="edit"
                  startContent={<Pencil className="text-[#4F46E5]" size={16} />}
                  onPress={() => {
                    setEditingTaskId(item.id);
                    setIsAddTaskOpen(true);
                  }}
                >
                  Edit
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  className="text-danger"
                  color="danger"
                  startContent={<Trash2 className="text-danger" size={16} />}
                  onPress={() => removeTask(item.id)}
                >
                  Delete
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        ),
      },
    ],
    [childCount],
  );

  const closeModal = () => {
    onOpenChange(false);
    reset({
      accountManagerId: users[0]?.id ?? "",
      clientId: fixedClientId ?? clientOptions[0]?.id ?? "",
      clientSuccessManagerId: users[0]?.id ?? "",
      description: availableTemplates[firstTemplateName]?.description ?? "",
      dueDate: today,
      phase: "Onboarding",
      progress: projectStatusOptions[0] ?? "",
      project: firstTemplateName,
      startDate: today,
      status: projectStatusOptions[0] ?? "",
    });
    setTaskRows(availableTemplates[firstTemplateName]?.tasks ?? []);
    setDragOverTaskId(null);
    setDraggingTaskId(null);
    setEditingTaskId(null);
    setIsAddTaskOpen(false);
    clearErrors();
    setSubmitError("");
  };

  const handleProjectChange = (selectedProject: string) => {
    const template = availableTemplates[selectedProject];

    if (template) {
      reset(
        {
          ...watch(),
          description: template.description,
          project: selectedProject,
        },
        { keepErrors: true, keepDirty: true, keepTouched: true },
      );
      setTaskRows(template.tasks);
      setEditingTaskId(null);
    }
  };

  const submitProject = async (values: AddProjectFormValues) => {
    clearErrors();
    setSubmitError("");

    try {
      if (isClientSelectionRequired && !values.clientId) {
        setError("clientId", {
          message: "Client is required",
          type: "manual",
        });

        return;
      }

      const validatedValues = await addProjectSchema.validate(values, {
        abortEarly: false,
      });

      await onSubmit({
        ...validatedValues,
        clientId: fixedClientId ?? values.clientId ?? "",
        description: values.description?.trim() ?? "",
        phase: "Onboarding",
        progress: selectedStatus || projectStatusOptions[0] || "Planning",
        tasks: taskRows.map((task) => ({ ...task })),
      });
      closeModal();
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof AddProjectFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      setSubmitError(
        error instanceof Error ? error.message : "Failed to save project.",
      );
    }
  };

  return (
    <Modal
      hideCloseButton
      isDismissable={false}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="5xl"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between border-b border-default-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-[#111827]">
            Create Project
          </h2>
          <Button
            isIconOnly
            radius="full"
            size="sm"
            variant="light"
            onPress={closeModal}
          >
            <X size={22} />
          </Button>
        </ModalHeader>
        <ModalBody className="space-y-4 px-6 py-4 max-h-none">
          {submitError ? (
            <p className="text-sm text-danger">{submitError}</p>
          ) : null}

          <div className="space-y-1">
            <p className="text-base font-semibold text-[#111827]">
              Project Details
            </p>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <p className={labelClassName}>
                  {isClientSelectionRequired ? "Client" : "Client Name"}
                </p>
                {isClientSelectionRequired ? (
                  <Controller
                    control={control}
                    name="clientId"
                    render={({ field }) => (
                      <Select
                        errorMessage={errors.clientId?.message}
                        isInvalid={!!errors.clientId}
                        radius="sm"
                        selectedKeys={field.value ? [field.value] : []}
                        size="sm"
                        onSelectionChange={(keys) => {
                          const selectedClient =
                            Array.from(keys as Set<string>)[0] ?? "";

                          field.onChange(selectedClient);
                        }}
                      >
                        {clientOptions.map((option) => (
                          <SelectItem key={option.id} textValue={option.name}>
                            <div className="flex flex-col">
                              <span className="text-sm text-[#111827]">
                                {option.name}
                              </span>
                              <span className="text-xs text-[#9CA3AF]">
                                {option.address || "-"}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </Select>
                    )}
                  />
                ) : (
                  <Input
                    isReadOnly
                    radius="sm"
                    size="sm"
                    value={clientName}
                    variant="bordered"
                  />
                )}
              </div>
              <div>
                <p className={labelClassName}>Select Project</p>
                <Controller
                  control={control}
                  name="project"
                  render={({ field }) => (
                    <Select
                      errorMessage={errors.project?.message}
                      isDisabled={isLoadingTemplates}
                      isInvalid={!!errors.project}
                      radius="sm"
                      selectedKeys={field.value ? [field.value] : []}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const selectedProject =
                          Array.from(keys as Set<string>)[0] ?? "";

                        field.onChange(selectedProject);
                        handleProjectChange(selectedProject);
                      }}
                    >
                      {Object.keys(availableTemplates).map((option) => (
                        <SelectItem key={option}>{option}</SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>
              <div>
                <p className={labelClassName}>Start Date</p>
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <DatePicker
                      errorMessage={errors.startDate?.message}
                      isInvalid={!!errors.startDate}
                      minValue={toCalendarDate(today) ?? undefined}
                      radius="sm"
                      size="sm"
                      value={toCalendarDate(field.value)}
                      onChange={(value) => {
                        if (!value) {
                          field.onChange("");

                          return;
                        }

                        const nextDate = String(value);

                        field.onChange(nextDate);
                        const dueDate = watch("dueDate");

                        if (dueDate && nextDate && dueDate < nextDate) {
                          reset(
                            {
                              ...watch(),
                              dueDate: nextDate,
                              startDate: nextDate,
                            },
                            {
                              keepErrors: true,
                              keepDirty: true,
                              keepTouched: true,
                            },
                          );
                        }
                      }}
                    />
                  )}
                />
              </div>
              <div>
                <p className={labelClassName}>Due Date</p>
                <Controller
                  control={control}
                  name="dueDate"
                  render={({ field }) => (
                    <DatePicker
                      errorMessage={errors.dueDate?.message}
                      isInvalid={!!errors.dueDate}
                      minValue={
                        toCalendarDate(selectedStartDate) ??
                        toCalendarDate(today) ??
                        undefined
                      }
                      radius="sm"
                      size="sm"
                      value={toCalendarDate(field.value)}
                      onChange={(value) => {
                        field.onChange(value ? String(value) : "");
                      }}
                    />
                  )}
                />
              </div>
              <div>
                <p className={labelClassName}>Client Success Manager</p>
                <Controller
                  control={control}
                  name="clientSuccessManagerId"
                  render={({ field }) => (
                    <Select
                      errorMessage={errors.clientSuccessManagerId?.message}
                      isInvalid={!!errors.clientSuccessManagerId}
                      radius="sm"
                      selectedKeys={field.value ? [field.value] : []}
                      size="sm"
                      onSelectionChange={(keys) => {
                        field.onChange(
                          Array.from(keys as Set<string>)[0] ?? "",
                        );
                      }}
                    >
                      {users.map((user) => (
                        <SelectItem key={user.id}>{user.name}</SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>
              <div>
                <p className={labelClassName}>Account Manager</p>
                <Controller
                  control={control}
                  name="accountManagerId"
                  render={({ field }) => (
                    <Select
                      errorMessage={errors.accountManagerId?.message}
                      isInvalid={!!errors.accountManagerId}
                      radius="sm"
                      selectedKeys={field.value ? [field.value] : []}
                      size="sm"
                      onSelectionChange={(keys) => {
                        field.onChange(
                          Array.from(keys as Set<string>)[0] ?? "",
                        );
                      }}
                    >
                      {users.map((user) => (
                        <SelectItem key={user.id}>{user.name}</SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>
              <div className="col-span-2">
                <p className={labelClassName}>Status</p>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      errorMessage={errors.status?.message}
                      isInvalid={!!errors.status}
                      radius="sm"
                      selectedKeys={field.value ? [field.value] : []}
                      size="sm"
                      onSelectionChange={(keys) => {
                        field.onChange(
                          Array.from(keys as Set<string>)[0] ?? "",
                        );
                      }}
                    >
                      {projectStatusOptions.map((option) => (
                        <SelectItem key={option}>{option}</SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          <div>
            <p className={labelClassName}>Project Description</p>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Textarea
                  minRows={4}
                  radius="sm"
                  size="sm"
                  value={field.value ?? ""}
                  variant="bordered"
                  onValueChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="rounded-2xl border border-default-200 bg-white overflow-visible">
            <div className="flex items-center justify-between border-b border-default-200 px-4 py-3">
              <h3 className="text-base font-semibold text-[#111827]">Tasks</h3>
              <div className="flex items-center gap-3">
                <Button
                  isIconOnly
                  className="border-danger-200 text-danger"
                  radius="md"
                  size="sm"
                  variant="bordered"
                  onPress={() => removeTask()}
                >
                  <Trash2 size={16} />
                </Button>
                <Button
                  className="bg-[#022279] text-white"
                  radius="md"
                  size="sm"
                  startContent={<Plus size={14} />}
                  onPress={() => {
                    setEditingTaskId(null);
                    setIsAddTaskOpen(true);
                  }}
                >
                  New Task
                </Button>
              </div>
            </div>
            <div
              className="rounded-b-2xl border-x border-b border-default-200 bg-[#F8FAFC] p-3 text-sm text-[#6B7280]"
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const draggedId =
                  event.dataTransfer?.getData("text/plain") ||
                  event.dataTransfer?.getData("application/myapp-task");

                handleMakeTaskTopLevel(draggedId || undefined);
                setDraggingTaskId(null);
                setDragOverTaskId(null);
              }}
            >
              Drag a task here to make it a parent task
            </div>
            <DashboardDataTable
              ariaLabel="Project tasks"
              columns={taskColumns}
              getRowKey={(item) => item.id}
              getRowProps={(item) => ({
                draggable: true,
                onDragStart: (event) => {
                  event.dataTransfer?.setData("text/plain", item.id);
                  event.dataTransfer?.setData(
                    "application/myapp-task",
                    item.id,
                  );
                  event.dataTransfer!.effectAllowed = "move";
                  setDraggingTaskId(item.id);
                },
                onDragEnd: () => {
                  setDraggingTaskId(null);
                  setDragOverTaskId(null);
                },
                onDragEnter: (event) => {
                  event.preventDefault();
                  if (draggingTaskId && draggingTaskId !== item.id) {
                    setDragOverTaskId(item.id);
                  }
                },
                onDragLeave: () => {
                  if (dragOverTaskId === item.id) {
                    setDragOverTaskId(null);
                  }
                },
                onDragOver: (event) => {
                  event.preventDefault();
                },
                onDrop: (event) => {
                  event.preventDefault();
                  const draggedId =
                    event.dataTransfer?.getData("text/plain") || draggingTaskId;

                  if (draggedId) {
                    handleDropOnTask(item, draggedId);
                  }
                  setDraggingTaskId(null);
                  setDragOverTaskId(null);
                },
                className: `${
                  dragOverTaskId === item.id ? "bg-[#EEF2FF]" : ""
                }`,
              })}
              rows={visibleTaskRows}
              showPagination={false}
              title=""
              withShell={false}
            />
          </div>

          <AddProjectTemplateTaskModal
            blockedTaskOptions={editableBlockedTaskOptions}
            initialValues={editingTaskInitialValues}
            isOpen={isAddTaskOpen}
            mode={editingTaskId ? "edit" : "add"}
            parentTaskOptions={editableParentTaskOptions}
            users={users}
            onOpenChange={(open) => {
              setIsAddTaskOpen(open);

              if (!open) {
                setEditingTaskId(null);
              }
            }}
            onSubmit={async (payload) => {
              if (editingTaskId) {
                updateTask(editingTaskId, payload);

                return;
              }

              handleAddTask(payload);
            }}
          />
        </ModalBody>
        <ModalFooter className="border-t border-default-200 px-6 py-4">
          <Button
            className="bg-[#022279] text-white"
            isLoading={isSubmitting}
            radius="sm"
            onPress={() => {
              void handleSubmit(submitProject)();
            }}
          >
            Save
          </Button>
          <Button radius="sm" variant="bordered" onPress={closeModal}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
