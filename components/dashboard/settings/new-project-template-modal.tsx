"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Checkbox } from "@heroui/checkbox";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { clientsApi } from "@/apis/clients";
import {
  type ProjectTemplate,
  projectTemplatesApi,
} from "@/apis/project-templates";
import { usersApi } from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";
import { resolveServerAssetUrl } from "@/components/dashboard/client-details/task-panel/task-panel-utils";
import {
  RichTextEditor,
  buildDocFromPlainText,
  type JSONContent,
} from "@/components/dashboard/client-details/task-panel/editor/rich-text-editor";
import {
  AddProjectTemplateTaskModal,
  type AddProjectTemplateTaskFormValues,
  type AddProjectTemplateTaskRichValues,
  type AddProjectTemplateTaskSubmitPayload,
} from "@/components/dashboard/settings/add-project-template-task-modal";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  normalizeProjectStatus,
  PROJECT_STATUS_OPTIONS,
} from "@/lib/project-statuses";
import { normalizeTaskStatus, TASK_STATUS_OPTIONS } from "@/lib/task-statuses";

const createProjectTemplateSchema = yup.object({
  description: yup.string().default(""),
  projectName: yup.string().required("Project name is required"),
  status: yup.string().required("Status is required"),
});

type ProjectTemplateFormValues = yup.InferType<
  typeof createProjectTemplateSchema
>;

type ProjectTemplateTaskRow = {
  assigneeAvatar?: string | null;
  assigneeId?: string;
  assigneeName?: string;
  attachments?: import("@/apis/project-templates").ProjectTemplateTaskAttachment[];
  blockedTaskId?: string;
  checklists?: import("@/apis/project-templates").ProjectTemplateTaskChecklist[];
  dependency: string;
  dependencyType?: string;
  descriptionJson?: Record<string, unknown> | null;
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
  title?: string;
};

interface NewProjectTemplateModalProps {
  initialTemplate?: ProjectTemplate | null;
  isOpen: boolean;
  onCreated?: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
}

const stepCards = [
  {
    description: "Setup project template",
    title: "Create Project",
  },
  {
    description: "Setup task details",
    title: "Create Tasks",
  },
  {
    description: "Review project details",
    title: "Review Project",
  },
] as const;

const defaultProjectTemplateStatusOptions = [...PROJECT_STATUS_OPTIONS];
const initialTaskRows: ProjectTemplateTaskRow[] = [];

const labelClassName = "mb-1.5 block text-sm text-[#4B5563]";

const getStatusChipClassName = (status?: string) => {
  const normalizedStatus = normalizeTaskStatus(status ?? "");

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

const TaskStatusChip = ({ status }: { status?: string }) => {
  const normalizedStatus = normalizeTaskStatus(status ?? "");

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
};

const getVisibleTaskRows = (rows: ProjectTemplateTaskRow[]) => {
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

const hasChildRows = (
  rows: ProjectTemplateTaskRow[],
  currentIndex: number,
  level: number,
) => {
  for (let index = currentIndex + 1; index < rows.length; index += 1) {
    const nextRow = rows[index];

    if (nextRow.level <= level) {
      return false;
    }

    if (nextRow.level === level + 1) {
      return true;
    }
  }

  return false;
};

const getTaskSubtreeEndIndex = (
  rows: ProjectTemplateTaskRow[],
  startIndex: number,
) => {
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

const getDescendantTaskIds = (
  rows: ProjectTemplateTaskRow[],
  taskId: string,
) => {
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
  rows: ProjectTemplateTaskRow[];
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

const getTaskRuleLabel = (task: ProjectTemplateTaskRow) => {
  return task.dueDateTrigger.trim() || "-";
};

const renderStepCard = (step: number, currentStep: number) => {
  const item = stepCards[step - 1];
  const isActive = step === currentStep;

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border px-3 py-3 ${
        isActive
          ? "border-[#022279] bg-[#EEF2FF]"
          : "border-default-200 bg-white"
      }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-lg text-2xl font-semibold ${
          isActive
            ? "bg-[#022279] text-white"
            : "bg-default-100 text-default-400"
        }`}
      >
        {step}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1F2937]">{item.title}</p>
        <p className="mt-0.5 text-xs text-default-500">{item.description}</p>
      </div>
    </div>
  );
};

export const NewProjectTemplateModal = ({
  initialTemplate,
  isOpen,
  onCreated,
  onOpenChange,
}: NewProjectTemplateModalProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [taskRows, setTaskRows] =
    useState<ProjectTemplateTaskRow[]>(initialTaskRows);
  const [submitError, setSubmitError] = useState("");
  const [taskUsers, setTaskUsers] = useState<
    Array<{ avatarUrl?: string | null; id: string; name: string }>
  >([]);
  const [projectStatusOptions, setProjectStatusOptions] = useState<string[]>(
    defaultProjectTemplateStatusOptions,
  );
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<ProjectTemplateFormValues>({
    defaultValues: {
      description: "",
      projectName: "",
      status: defaultProjectTemplateStatusOptions[0],
    },
    mode: "onBlur",
  });
  const [descriptionJson, setDescriptionJson] = useState<JSONContent | null>(
    null,
  );
  const isEditing = Boolean(initialTemplate);

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
          ? Array.from(
              new Set(
                response.statusOptions.map((item) =>
                  normalizeProjectStatus(item),
                ),
              ),
            )
          : defaultProjectTemplateStatusOptions;

        if (!isMounted) {
          return;
        }

        setProjectStatusOptions(nextOptions);

        const currentStatus = getValues("status");

        const normalizedCurrentStatus = normalizeProjectStatus(
          currentStatus || initialTemplate?.status,
        );

        if (!currentStatus || !nextOptions.includes(normalizedCurrentStatus)) {
          setValue("status", nextOptions[0] ?? "");
        } else if (currentStatus !== normalizedCurrentStatus) {
          setValue("status", normalizedCurrentStatus);
        }
      } catch {
        if (isMounted) {
          setProjectStatusOptions(defaultProjectTemplateStatusOptions);
        }
      }
    };

    void loadStatusOptions();

    return () => {
      isMounted = false;
    };
  }, [
    getValidAccessToken,
    getValues,
    initialTemplate?.status,
    isOpen,
    session,
    setValue,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCurrentStep(1);
    setSubmitError("");
    clearErrors();
    reset({
      description: initialTemplate?.description ?? "",
      projectName: initialTemplate?.projectName ?? "",
      status: normalizeProjectStatus(
        initialTemplate?.status ?? defaultProjectTemplateStatusOptions[0],
      ),
    });
    setDescriptionJson(
      (initialTemplate?.descriptionJson as JSONContent | undefined) ??
        (initialTemplate?.description
          ? buildDocFromPlainText(initialTemplate.description)
          : null),
    );
    setTaskRows(
      initialTemplate?.tasks?.map((task) => ({
        assigneeId: task.assigneeId,
        assigneeName: task.assigneeName,
        assigneeAvatar: task.assigneeAvatar,
        attachments: task.attachments,
        blockedTaskId: task.blockedTaskId,
        checklists: task.checklists,
        dependency: task.dependency,
        dependencyType: task.dependencyType,
        descriptionJson: task.descriptionJson,
        dueDateTrigger: task.dueDateTrigger,
        enableDependency: task.enableDependency,
        id: task.id,
        isExpanded: task.isExpanded,
        isSelected: Boolean(task.isSelected),
        labels: task.labels ?? [],
        level: task.level,
        parentTaskId: task.parentTaskId,
        status: task.status,
        taskDescription: task.taskDescription,
        taskName: task.taskName,
        title: task.title,
      })) ?? initialTaskRows,
    );
  }, [clearErrors, initialTemplate, isOpen, reset]);

  useEffect(() => {
    if (!isOpen || !session) {
      return;
    }

    let isMounted = true;

    const loadUsers = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const response = await usersApi.getUsers(accessToken, {
          limit: 100,
          page: 1,
        });

        if (!isMounted) {
          return;
        }

        setTaskUsers(
          response.users.map((user) => ({
            id: String(user.id),
            name:
              [user.firstName, user.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() || user.email,
            avatarUrl: resolveServerAssetUrl(user.avatarUrl) ?? null,
          })),
        );
      } catch {
        if (isMounted) {
          setTaskUsers([]);
        }
      }
    };

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, isOpen, session]);

  const resetModal = () => {
    setCurrentStep(1);
    setDragOverTaskId(null);
    setDraggingTaskId(null);
    setEditingTaskId(null);
    setIsAddTaskModalOpen(false);
    setTaskRows(initialTaskRows);
    setSubmitError("");
    clearErrors();
    reset({
      description: "",
      projectName: "",
      status: projectStatusOptions[0] ?? "",
    });
    setDescriptionJson(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetModal();
  };

  const validateProjectStep = async () => {
    clearErrors();
    setSubmitError("");

    try {
      await createProjectTemplateSchema.validate(getValues(), {
        abortEarly: false,
      });
      setCurrentStep(2);
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof ProjectTemplateFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to validate project template.",
      );
    }
  };

  const addTask = (payload: AddProjectTemplateTaskSubmitPayload) => {
    setTaskRows((current) => {
      const assignee = taskUsers.find((user) => user.id === payload.assigneeId);
      const dependencyType = payload.dependencyType ?? "After trigger date";
      const isBlockedTaskRule = dependencyType === "After Blocked Task";
      const parentIndex = current.findIndex(
        (row) => row.id === payload.parentTaskId,
      );
      const parentRow = parentIndex >= 0 ? current[parentIndex] : null;
      const nextTask: ProjectTemplateTaskRow = {
        assigneeId: payload.assigneeId,
        assigneeAvatar: assignee?.avatarUrl ?? null,
        assigneeName: assignee?.name ?? "",
        attachments: payload.attachments,
        blockedTaskId: isBlockedTaskRule ? payload.blockedTaskId : undefined,
        checklists: payload.checklists,
        dependency:
          isBlockedTaskRule && payload.blockedTaskId
            ? (current.find((row) => row.id === payload.blockedTaskId)
                ?.taskName ?? "-")
            : "-",
        dependencyType,
        descriptionJson: payload.descriptionJson as
          | Record<string, unknown>
          | null
          | undefined,
        dueDateTrigger: `${payload.remapDays} Days ${dependencyType.toLowerCase()}`,
        enableDependency: isBlockedTaskRule,
        id: `task-${Date.now()}`,
        isSelected: false,
        labels: payload.labels,
        level: parentRow ? Math.min(parentRow.level + 1, 2) : 0,
        parentTaskId: payload.parentTaskId,
        status: payload.status,
        taskDescription: payload.description?.trim() || "-",
        taskName: payload.taskTitle,
        title: payload.taskTitle,
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
    payload: AddProjectTemplateTaskSubmitPayload,
  ) => {
    setTaskRows((current) => {
      const dependencyType = payload.dependencyType ?? "After trigger date";
      const isBlockedTaskRule = dependencyType === "After Blocked Task";
      const sourceIndex = current.findIndex((row) => row.id === taskId);

      if (sourceIndex < 0) {
        return current;
      }

      const assignee = taskUsers.find((user) => user.id === payload.assigneeId);
      const parentIndex = current.findIndex(
        (row) => row.id === payload.parentTaskId,
      );
      const parentRow = parentIndex >= 0 ? current[parentIndex] : null;
      const nextLevel = parentRow ? Math.min(parentRow.level + 1, 2) : 0;
      const sourceRow = current[sourceIndex];
      const updatedTaskRow = {
        ...sourceRow,
        assigneeId: payload.assigneeId,
        assigneeAvatar: assignee?.avatarUrl ?? null,
        assigneeName: assignee?.name ?? "",
        attachments: payload.attachments,
        blockedTaskId: isBlockedTaskRule ? payload.blockedTaskId : undefined,
        checklists: payload.checklists,
        dependency:
          isBlockedTaskRule && payload.blockedTaskId
            ? (current.find((item) => item.id === payload.blockedTaskId)
                ?.taskName ?? "-")
            : "-",
        dependencyType,
        descriptionJson: payload.descriptionJson as
          | Record<string, unknown>
          | null
          | undefined,
        dueDateTrigger: `${payload.remapDays} Days ${dependencyType.toLowerCase()}`,
        enableDependency: isBlockedTaskRule,
        labels: payload.labels,
        level: nextLevel,
        parentTaskId: payload.parentTaskId,
        status: payload.status,
        taskDescription: payload.description?.trim() || "-",
        taskName: payload.taskTitle,
        title: payload.taskTitle,
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

  const moveTask = (taskId: string, nextParentTaskId?: string) => {
    setTaskRows((current) =>
      moveTaskRows({
        nextParentTaskId,
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

  const handleDropOnTask = (
    targetRow: ProjectTemplateTaskRow,
    draggedId?: string,
  ) => {
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

  const toggleTaskSelection = (taskId: string, isSelected: boolean) => {
    setTaskRows((current) =>
      current.map((row) => (row.id === taskId ? { ...row, isSelected } : row)),
    );
  };

  const toggleTaskExpansion = (taskId: string) => {
    setTaskRows((current) =>
      current.map((row) =>
        row.id === taskId ? { ...row, isExpanded: !row.isExpanded } : row,
      ),
    );
  };

  const selectedTaskIds = useMemo(
    () =>
      new Set(taskRows.filter((row) => row.isSelected).map((row) => row.id)),
    [taskRows],
  );

  const visibleTaskRows = useMemo(
    () => getVisibleTaskRows(taskRows),
    [taskRows],
  );
  const taskNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of taskRows) {
      map.set(row.id, row.taskName ?? "-");
    }
    return map;
  }, [taskRows]);
  const taskUserAvatarById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const user of taskUsers) {
      map.set(user.id, user.avatarUrl ?? null);
    }
    return map;
  }, [taskUsers]);
  const taskOptionRows = useMemo(
    () => taskRows.filter((row) => row.level === 0),
    [taskRows],
  );
  const parentTaskOptions = useMemo(
    () =>
      taskOptionRows.map((row) => ({
        id: row.id,
        label: row.taskName,
      })),
    [taskOptionRows],
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
        dependencyType: editingTask.dependencyType ?? "After trigger date",
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

  const renderTaskTable = ({ isFullHeight = false } = {}) => (
    <div
      className={
        isFullHeight
          ? "rounded-2xl border border-default-200 pb-6"
          : "overflow-hidden rounded-2xl border border-default-200"
      }
    >
      <div className="flex items-center justify-between border-b border-default-200 px-4 py-4">
        <h3 className="text-lg font-semibold text-[#111827]">Tasks</h3>
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            className="border-danger-200 text-danger"
            radius="md"
            variant="bordered"
            onPress={() => removeTask()}
          >
            <Trash2 size={18} />
          </Button>
          <Button
            className="bg-[#022279] text-white"
            radius="md"
            startContent={<Plus size={16} />}
            onPress={() => {
              setEditingTaskId(null);
              setIsAddTaskModalOpen(true);
            }}
          >
            New Task
          </Button>
        </div>
      </div>
      <div
        className="border-b border-default-200 bg-[#F8FAFC] px-4 py-3 text-sm text-[#6B7280]"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          const draggedId =
            event.dataTransfer?.getData("text/plain") ||
            event.dataTransfer?.getData("application/project-template-task");

          handleMakeTaskTopLevel(draggedId || undefined);
          setDraggingTaskId(null);
          setDragOverTaskId(null);
        }}
      >
        Drag a task here to make it a parent task
      </div>
      <div
        className={
          isFullHeight
            ? "overflow-visible pb-4"
            : "max-h-[430px] overflow-y-auto"
        }
      >
        <div>
          <div className="grid min-h-[42px] grid-cols-[44px_minmax(320px,1fr)_110px_180px_minmax(150px,210px)_minmax(120px,160px)_72px] items-center border-b border-default-200 bg-[#F9FAFB] text-xs font-medium text-[#111827]">
            <div className="px-4">
              <Checkbox
                isSelected={
                  selectedTaskIds.size > 0 &&
                  selectedTaskIds.size === taskRows.length
                }
                onValueChange={(isSelected) =>
                  setTaskRows((current) =>
                    current.map((row) => ({ ...row, isSelected })),
                  )
                }
              />
            </div>
            <div className="px-3">Task</div>
            <div className="border-l border-default-100 px-2">Status</div>
            <div className="border-l border-default-100 px-2">Assignee</div>
            <div className="border-l border-default-100 px-2">Due rule</div>
            <div className="border-l border-default-100 px-2">Blocked task</div>
            <div className="border-l border-default-100 px-3 text-right">
              Action
            </div>
          </div>
          <div>
            {visibleTaskRows.map((item) => {
              const sourceIndex = taskRows.findIndex(
                (row) => row.id === item.id,
              );
              const hasChildren =
                sourceIndex >= 0
                  ? hasChildRows(taskRows, sourceIndex, item.level)
                  : false;
              const isSubtask = item.level > 0;

              return (
                <div
                  key={item.id}
                  draggable
                  className={`grid min-h-[54px] grid-cols-[44px_minmax(320px,1fr)_110px_180px_minmax(150px,210px)_minmax(120px,160px)_72px] items-center border-b border-default-200 text-sm last:border-b-0 ${
                    dragOverTaskId === item.id ? "bg-[#EEF2FF]" : "bg-white"
                  }`}
                  onDragEnd={() => {
                    setDraggingTaskId(null);
                    setDragOverTaskId(null);
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    if (draggingTaskId && draggingTaskId !== item.id) {
                      setDragOverTaskId(item.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverTaskId === item.id) {
                      setDragOverTaskId(null);
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer?.setData("text/plain", item.id);
                    event.dataTransfer?.setData(
                      "application/project-template-task",
                      item.id,
                    );
                    event.dataTransfer!.effectAllowed = "move";
                    setDraggingTaskId(item.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const draggedId =
                      event.dataTransfer?.getData("text/plain") ||
                      draggingTaskId;

                    if (draggedId) {
                      handleDropOnTask(item, draggedId);
                    }

                    setDraggingTaskId(null);
                    setDragOverTaskId(null);
                  }}
                >
                  <div className="px-4">
                    <Checkbox
                      isSelected={item.isSelected}
                      onValueChange={(isSelected) =>
                        toggleTaskSelection(item.id, isSelected)
                      }
                    />
                  </div>
                  <div className="flex min-w-0 items-center gap-3 px-3 py-2">
                    <GripVertical
                      className="flex-none cursor-grab text-default-400"
                      size={16}
                    />
                    <div
                      className="flex min-w-0 items-center gap-2"
                      style={{ paddingLeft: `${item.level * 18}px` }}
                    >
                      {hasChildren ? (
                        <button
                          aria-label={
                            item.isExpanded
                              ? `Collapse ${item.taskName}`
                              : `Expand ${item.taskName}`
                          }
                          className="inline-flex h-[18px] w-[18px] flex-none items-center justify-center text-[#6B7280]"
                          type="button"
                          onClick={() => toggleTaskExpansion(item.id)}
                        >
                          {item.isExpanded ? (
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
                        <span className="block max-w-full truncate text-sm font-semibold text-[#111827]">
                          {item.taskName}
                        </span>
                        {item.taskDescription &&
                        item.taskDescription !== "-" ? (
                          <span className="line-clamp-1 text-xs text-[#6B7280]">
                            {item.taskDescription}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="border-l border-default-100 px-2 py-2">
                    <TaskStatusChip status={item.status} />
                  </div>
                  <div className="flex min-w-0 items-center gap-2 border-l border-default-100 px-2 py-2 text-xs text-[#6B7280]">
                    <Avatar
                      className="h-5 w-5 flex-none"
                      name={item.assigneeName || "-"}
                      size="sm"
                      src={
                        (item.assigneeId
                          ? taskUserAvatarById.get(item.assigneeId)
                          : null) ??
                        item.assigneeAvatar ??
                        undefined
                      }
                    />
                    <span className="truncate">{item.assigneeName || "-"}</span>
                  </div>
                  <div className="border-l border-default-100 px-2 py-2 text-xs font-semibold text-[#DC2626]">
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <Calendar className="flex-none" size={13} />
                      <span className="truncate">{getTaskRuleLabel(item)}</span>
                    </span>
                  </div>
                  <div className="border-l border-default-100 px-2 py-2 text-xs text-[#374151]">
                    <span className="block truncate">
                      {item.blockedTaskId
                        ? (taskNameById.get(item.blockedTaskId) ?? "-")
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-end border-l border-default-100 px-3 py-2">
                    <Dropdown placement="bottom-end">
                      <DropdownTrigger>
                        <Button isIconOnly radius="md" variant="bordered">
                          <EllipsisVertical size={18} />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label={`Task ${item.taskName} actions`}
                      >
                        <DropdownItem
                          key="edit"
                          startContent={
                            <Pencil className="text-[#4F46E5]" size={18} />
                          }
                          onPress={() => {
                            setEditingTaskId(item.id);
                            setIsAddTaskModalOpen(true);
                          }}
                        >
                          Edit
                        </DropdownItem>
                        <DropdownItem
                          key="delete"
                          className="text-danger"
                          color="danger"
                          startContent={
                            <Trash2 className="text-danger" size={18} />
                          }
                          onPress={() => removeTask(item.id)}
                        >
                          Delete
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const submitProjectTemplate = () => {
    void handleSubmit(async () => {
      if (!session) {
        const message = "You must be signed in to create a project template.";

        setSubmitError(message);
        toast.danger("Session expired", {
          description: message,
        });

        return;
      }

      try {
        setSubmitError("");
        const accessToken = await getValidAccessToken();

        const payload = {
          description: getValues("description") ?? "",
          descriptionJson,
          projectName: getValues("projectName") ?? "",
          status: getValues("status") ?? "",
          tasks: taskRows.map((task) => ({
            assigneeId: task.assigneeId,
            assigneeName: task.assigneeName,
            attachments: task.attachments,
            blockedTaskId: task.blockedTaskId,
            checklists: task.checklists,
            dependency: task.dependency,
            dependencyType: task.dependencyType,
            descriptionJson: task.descriptionJson,
            dueDateTrigger: task.dueDateTrigger,
            enableDependency: task.enableDependency,
            id: task.id,
            isExpanded: task.isExpanded,
            isSelected: task.isSelected,
            labels: task.labels,
            level: task.level,
            parentTaskId: task.parentTaskId,
            status: task.status,
            taskDescription: task.taskDescription,
            taskName: task.taskName,
            title: task.title,
          })),
        };

        if (isEditing && initialTemplate?.id) {
          await projectTemplatesApi.updateProjectTemplate(
            accessToken,
            initialTemplate.id,
            payload,
          );
        } else {
          await projectTemplatesApi.createProjectTemplate(accessToken, payload);
        }

        await onCreated?.();
        toast.success(
          isEditing
            ? "Project template updated successfully."
            : "Project template added successfully.",
        );
        handleClose();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `Failed to ${isEditing ? "update" : "create"} project template.`;

        setSubmitError(message);
        toast.danger(
          `Failed to ${isEditing ? "update" : "add"} project template`,
          {
            description: message,
          },
        );
      }
    })();
  };

  return (
    <Modal
      hideCloseButton
      classNames={{
        base: "max-w-[1180px]",
      }}
      isDismissable={false}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="5xl"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between border-b border-default-200">
          <h2 className="text-lg font-semibold text-[#111827]">
            {isEditing ? "Edit Project" : "Create Project"}
          </h2>
          <Button
            isIconOnly
            radius="full"
            size="sm"
            variant="light"
            onPress={handleClose}
          >
            <X size={22} />
          </Button>
        </ModalHeader>
        <ModalBody className="space-y-6 overflow-y-auto py-5">
          {submitError ? (
            <p className="text-sm text-danger">{submitError}</p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            {stepCards.map((_, index) => (
              <div key={index + 1}>
                {renderStepCard(index + 1, currentStep)}
              </div>
            ))}
          </div>

          {(currentStep === 1 || currentStep === 3) && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className={labelClassName}>Project Name</p>
                  <Controller
                    control={control}
                    name="projectName"
                    render={({ field }) => (
                      <Input
                        errorMessage={errors.projectName?.message}
                        isInvalid={!!errors.projectName}
                        placeholder="[Enter Project Name]"
                        value={field.value ?? ""}
                        onBlur={field.onBlur}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <div>
                  <p className={labelClassName}>Status</p>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select
                        errorMessage={errors.status?.message}
                        isInvalid={!!errors.status}
                        selectedKeys={field.value ? [field.value] : []}
                        onSelectionChange={(keys) => {
                          const selected =
                            Array.from(keys as Set<string>)[0] ?? "";

                          field.onChange(selected);
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

              <div>
                <p className={labelClassName}>Project Description</p>
                <RichTextEditor
                  placeholder="Describe the template…"
                  value={descriptionJson}
                  onChange={(json) => {
                    setDescriptionJson(json);
                  }}
                  onFetchUrlPreview={async (url) => {
                    const accessToken = await getValidAccessToken();
                    return clientsApi.getUrlPreview(accessToken, url);
                  }}
                  onUploadError={(message) =>
                    toast.danger("Image upload failed", {
                      description: message,
                    })
                  }
                  onUploadImage={async (file) => {
                    const accessToken = await getValidAccessToken();
                    const attachment =
                      await projectTemplatesApi.uploadAttachment(
                        accessToken,
                        file,
                      );
                    return {
                      url:
                        resolveServerAssetUrl(attachment.url) ?? attachment.url,
                    };
                  }}
                />
              </div>
            </>
          )}

          {currentStep === 2 ? renderTaskTable({ isFullHeight: true }) : null}
          {currentStep === 3 ? renderTaskTable({ isFullHeight: true }) : null}
        </ModalBody>
        <ModalFooter className="justify-between border-t border-default-200">
          {currentStep === 1 ? (
            <Button radius="md" variant="bordered" onPress={handleClose}>
              Cancel
            </Button>
          ) : (
            <Button
              radius="md"
              variant="bordered"
              onPress={() => setCurrentStep((step) => Math.max(1, step - 1))}
            >
              Prev
            </Button>
          )}

          {currentStep === 1 ? (
            <Button
              className="bg-[#022279] px-10 text-white"
              radius="md"
              onPress={validateProjectStep}
            >
              Next
            </Button>
          ) : null}

          {currentStep === 2 ? (
            <Button
              className="bg-[#022279] px-10 text-white"
              radius="md"
              onPress={() => setCurrentStep(3)}
            >
              Next
            </Button>
          ) : null}

          {currentStep === 3 ? (
            <Button
              className="bg-[#022279] px-10 text-white"
              radius="md"
              onPress={submitProjectTemplate}
            >
              Save
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
      <AddProjectTemplateTaskModal
        blockedTaskOptions={editableBlockedTaskOptions}
        initialRich={
          editingTask
            ? ({
                attachments: editingTask.attachments ?? [],
                checklists: editingTask.checklists ?? [],
                descriptionJson:
                  (editingTask.descriptionJson as
                    | AddProjectTemplateTaskRichValues["descriptionJson"]
                    | undefined) ?? null,
              } satisfies AddProjectTemplateTaskRichValues)
            : null
        }
        initialValues={editingTaskInitialValues}
        isOpen={isAddTaskModalOpen}
        mode={editingTaskId ? "edit" : "add"}
        parentTaskOptions={editableParentTaskOptions}
        users={taskUsers}
        onOpenChange={(open) => {
          setIsAddTaskModalOpen(open);

          if (!open) {
            setEditingTaskId(null);
          }
        }}
        onSubmit={async (payload) => {
          if (editingTaskId) {
            updateTask(editingTaskId, payload);

            return;
          }

          addTask(payload);
        }}
      />
    </Modal>
  );
};
