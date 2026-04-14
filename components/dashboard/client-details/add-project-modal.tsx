"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { DatePicker } from "@heroui/date-picker";
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
import { ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";

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

const defaultProjectStatusOptions = [
  "Onboarding",
  "Planning",
  "Implementation",
  "On hold",
  "Closed",
  "Cancelled",
];
const dueDateTriggerOptions = [
  "On trigger date",
  "2 Days after blocked task",
  "2 Days after trigger date",
];

type TaskTableRow = {
  assigneeId?: string;
  dependency: string;
  dueDateTrigger: string;
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
      expansionByLevel.set(0, true);

      return true;
    }

    for (let level = 1; level <= row.level - 1; level += 1) {
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

const getStoredAccessToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const rawSession = window.localStorage.getItem("ahm-auth-session");

    if (!rawSession) {
      return "";
    }

    const parsed = JSON.parse(rawSession) as { accessToken?: unknown };

    return typeof parsed.accessToken === "string" ? parsed.accessToken : "";
  } catch {
    return "";
  }
};

export type AddProjectFormValues = yup.InferType<typeof addProjectSchema> & {
  description?: string;
  phase: string;
  progress: string;
  tasks?: TaskTableRow[];
};

interface AddProjectModalProps {
  clientAddress?: string;
  clientName: string;
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
  clientAddress,
  clientName,
  isOpen,
  onOpenChange,
  onSubmit,
  users,
}: AddProjectModalProps) => {
  const { session } = useAuth();
  const [submitError, setSubmitError] = useState("");
  const [availableTemplates, setAvailableTemplates] = useState<
    Record<string, ProjectTemplate>
  >(defaultProjectTemplates);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [projectStatusOptions, setProjectStatusOptions] = useState<string[]>(
    defaultProjectStatusOptions,
  );
  const firstTemplateName = Object.keys(availableTemplates)[0] ?? "Custom";
  const [taskRows, setTaskRows] = useState<TaskTableRow[]>(
    availableTemplates[firstTemplateName]?.tasks ?? [],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadProjectTemplates = async () => {
      setIsLoadingTemplates(true);

      try {
        const accessToken = session?.accessToken || getStoredAccessToken();

        if (!accessToken) {
          setAvailableTemplates(defaultProjectTemplates);
          setIsLoadingTemplates(false);

          return;
        }

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
              dueDateTrigger: task.dueDateTrigger,
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
  }, [isOpen, session?.accessToken]);

  const topLevelTaskRows = useMemo(
    () => taskRows.filter((task) => !task.parentTaskId),
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
    setTaskRows((current) => {
      const taskToMove = current.find((task) => task.id === taskId);

      if (!taskToMove) {
        return current;
      }

      const updated = current.filter((task) => task.id !== taskId);
      const normalizedParentId = parentTaskId || undefined;
      const movedTask = {
        ...taskToMove,
        parentTaskId: normalizedParentId,
      };

      if (!normalizedParentId) {
        return [...updated, movedTask];
      }

      const targetIndex = updated.findIndex(
        (task) => task.id === normalizedParentId,
      );

      if (targetIndex === -1) {
        return [...updated, movedTask];
      }

      let insertIndex = targetIndex + 1;

      while (
        insertIndex < updated.length &&
        updated[insertIndex].parentTaskId === normalizedParentId
      ) {
        insertIndex += 1;
      }

      const next = [...updated];

      next.splice(insertIndex, 0, movedTask);

      return next.map((task) =>
        task.id === normalizedParentId ? { ...task, isExpanded: true } : task,
      );
    });
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

    const parentTaskId = targetRow.parentTaskId ?? targetRow.id;

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
    if (!isOpen || !session?.accessToken) {
      return;
    }

    let isMounted = true;

    const loadStatusOptions = async () => {
      try {
        const response =
          await projectTemplatesApi.listProjectTemplateStatusOptions(
            session.accessToken,
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
  }, [isOpen, session?.accessToken, setValue, watch]);

  const allSelected = useMemo(
    () => taskRows.length > 0 && taskRows.every((task) => task.isSelected),
    [taskRows],
  );

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
          const isTopLevel = !item.parentTaskId;

          return (
            <div
              className={`flex items-center gap-1 ${
                item.parentTaskId ? "pl-5" : ""
              }`}
            >
              {isTopLevel ? (
                isParent ? (
                  item.isExpanded ? (
                    <ChevronDown
                      className="text-[#6B7280] cursor-pointer"
                      size={12}
                      onClick={() => {
                        setTaskRows((current) =>
                          current.map((row) =>
                            row.id === item.id
                              ? { ...row, isExpanded: !row.isExpanded }
                              : row,
                          ),
                        );
                      }}
                    />
                  ) : (
                    <ChevronRight
                      className="text-[#6B7280] cursor-pointer"
                      size={12}
                      onClick={() => {
                        setTaskRows((current) =>
                          current.map((row) =>
                            row.id === item.id
                              ? { ...row, isExpanded: !row.isExpanded }
                              : row,
                          ),
                        );
                      }}
                    />
                  )
                ) : (
                  <span className="inline-block w-3" />
                )
              ) : (
                <span className="inline-block w-3" />
              )}
              <span>{item.taskName}</span>
            </div>
          );
        },
      },
      {
        key: "taskDescription",
        label: "Task Description",
        className:
          "bg-[#F9FAFB] text-xs font-medium text-[#111827] !rounded-none",
        renderCell: (item) => <span>{item.taskDescription}</span>,
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
          <Select
            className="max-w-[190px]"
            radius="sm"
            selectedKeys={[item.dueDateTrigger]}
            size="sm"
            onSelectionChange={(keys) => {
              const selected = Array.from(keys as Set<string>)[0] ?? "";

              setTaskRows((current) =>
                current.map((row) =>
                  row.id === item.id
                    ? { ...row, dueDateTrigger: selected }
                    : row,
                ),
              );
            }}
          >
            {dueDateTriggerOptions.map((option) => (
              <SelectItem key={option}>{option}</SelectItem>
            ))}
          </Select>
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
        renderCell: (item) => <span>{item.status ?? "-"}</span>,
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
            <Button
              isIconOnly
              className="border-danger-200 text-danger"
              radius="md"
              size="sm"
              variant="bordered"
              onPress={() => {
                setTaskRows((current) =>
                  current.filter((row) => row.id !== item.id),
                );
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ),
      },
    ],
    [allSelected],
  );

  const closeModal = () => {
    onOpenChange(false);
    reset({
      accountManagerId: users[0]?.id ?? "",
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
    }
  };

  const submitProject = async (values: AddProjectFormValues) => {
    clearErrors();
    setSubmitError("");

    try {
      const validatedValues = await addProjectSchema.validate(values, {
        abortEarly: false,
      });

      await onSubmit({
        ...validatedValues,
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
      scrollBehavior="outside"
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
                <p className={labelClassName}>Client Name</p>
                <Input
                  isReadOnly
                  radius="sm"
                  size="sm"
                  value={clientName}
                  variant="bordered"
                />
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
            <p className="mt-1 text-xs text-[#9CA3AF]">{clientAddress || ""}</p>
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
                  onPress={() => {
                    setTaskRows((current) =>
                      current.filter((row) => !row.isSelected),
                    );
                  }}
                >
                  <Trash2 size={16} />
                </Button>
                <Button
                  className="bg-[#022279] text-white"
                  radius="md"
                  size="sm"
                  startContent={<Plus size={14} />}
                  onPress={() => {
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
              Drag a task here to revert it back to no parent
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
            blockedTaskOptions={taskRows.map((row) => ({
              id: row.id,
              label: row.taskName,
            }))}
            isOpen={isAddTaskOpen}
            parentTaskOptions={topLevelTaskRows.map((row) => ({
              id: row.id,
              label: row.taskName,
            }))}
            users={users}
            onOpenChange={setIsAddTaskOpen}
            onSubmit={handleAddTask}
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
