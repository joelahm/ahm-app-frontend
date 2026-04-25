"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Checkbox } from "@heroui/checkbox";
import { Input, Textarea } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";

import {
  type ProjectTemplate,
  projectTemplatesApi,
} from "@/apis/project-templates";
import { usersApi } from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";
import {
  AddProjectTemplateTaskModal,
  type AddProjectTemplateTaskFormValues,
} from "@/components/dashboard/settings/add-project-template-task-modal";
import { useAppToast } from "@/hooks/use-app-toast";

const createProjectTemplateSchema = yup.object({
  description: yup.string().default(""),
  projectName: yup.string().required("Project name is required"),
  status: yup.string().required("Status is required"),
});

type ProjectTemplateFormValues = yup.InferType<
  typeof createProjectTemplateSchema
>;

type ProjectTemplateTaskRow = {
  assigneeId?: string;
  assigneeName?: string;
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

const defaultProjectTemplateStatusOptions = [
  "Onboarding",
  "Planning",
  "Implementation",
  "On hold",
  "Closed",
  "Cancelled",
];
const initialTaskRows: ProjectTemplateTaskRow[] = [];

const labelClassName = "mb-1.5 block text-sm text-[#4B5563]";
const headerCellClass = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";

const getVisibleTaskRows = (rows: ProjectTemplateTaskRow[]) => {
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

const buildTaskRowName = (
  task: ProjectTemplateTaskRow,
  hasChildren: boolean,
  onToggleExpand: (taskId: string) => void,
) => {
  if (task.level === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#1F2937]">
          {task.taskName}
        </span>
      </div>
    );
  }

  if (task.level === 1) {
    return (
      <button
        className="flex items-center gap-2 pl-2 text-left"
        type="button"
        onClick={() => (hasChildren ? onToggleExpand(task.id) : undefined)}
      >
        {hasChildren ? (
          task.isExpanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )
        ) : (
          <span className="inline-block w-[14px]" />
        )}
        <span className="text-sm text-[#1F2937]">{task.taskName}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center pl-10">
      <span className="mr-3 h-px w-4 bg-default-300" />
      <span className="text-sm text-[#1F2937]">{task.taskName}</span>
    </div>
  );
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
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [taskRows, setTaskRows] =
    useState<ProjectTemplateTaskRow[]>(initialTaskRows);
  const [submitError, setSubmitError] = useState("");
  const [taskUsers, setTaskUsers] = useState<
    Array<{ id: string; name: string }>
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
          ? response.statusOptions
          : defaultProjectTemplateStatusOptions;

        if (!isMounted) {
          return;
        }

        setProjectStatusOptions(nextOptions);

        const currentStatus = getValues("status");

        if (!currentStatus || !nextOptions.includes(currentStatus)) {
          setValue("status", initialTemplate?.status ?? nextOptions[0] ?? "");
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
      status: initialTemplate?.status ?? defaultProjectTemplateStatusOptions[0],
    });
    setTaskRows(
      initialTemplate?.tasks?.map((task) => ({
        assigneeId: task.assigneeId,
        assigneeName: task.assigneeName,
        blockedTaskId: task.blockedTaskId,
        dependency: task.dependency,
        dependencyType: task.dependencyType,
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
    setIsAddTaskModalOpen(false);
    setTaskRows(initialTaskRows);
    setSubmitError("");
    clearErrors();
    reset({
      description: "",
      projectName: "",
      status: projectStatusOptions[0] ?? "",
    });
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

  const addTask = (payload: AddProjectTemplateTaskFormValues) => {
    setTaskRows((current) => {
      const assignee = taskUsers.find((user) => user.id === payload.assigneeId);
      const parentIndex = current.findIndex(
        (row) => row.id === payload.parentTaskId,
      );
      const parentRow = parentIndex >= 0 ? current[parentIndex] : null;
      const nextTask: ProjectTemplateTaskRow = {
        assigneeId: payload.assigneeId,
        assigneeName: assignee?.name ?? "",
        blockedTaskId: payload.blockedTaskId,
        dependency:
          payload.enableDependency && payload.blockedTaskId
            ? (current.find((row) => row.id === payload.blockedTaskId)
                ?.taskName ?? "-")
            : "-",
        dependencyType: payload.dependencyType,
        dueDateTrigger: payload.enableDependency
          ? `${payload.remapDays} Days ${(payload.dependencyType ?? "After trigger date").toLowerCase()}`
          : "On trigger date",
        enableDependency: payload.enableDependency,
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

    setTaskRows((current) => current.filter((row) => row.id !== taskId));
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
            onPress={() => setIsAddTaskModalOpen(true)}
          >
            New Task
          </Button>
        </div>
      </div>
      <div
        className={
          isFullHeight
            ? "overflow-visible pb-4"
            : "max-h-[430px] overflow-y-auto"
        }
      >
        <Table
          removeWrapper
          aria-label="Project template tasks"
          classNames={{
            table: "border-collapse border-spacing-0",
            tbody:
              "[&_tr]:border-b [&_tr]:border-default-200 [&_tr:nth-child(even)]:bg-[#F9FAFB]",
            td: "p-4 align-middle",
            th: "!rounded-none",
          }}
        >
          <TableHeader>
            {[
              <TableColumn key="select" className={headerCellClass}>
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
              </TableColumn>,
              <TableColumn key="task-name" className={headerCellClass}>
                Task Name
              </TableColumn>,
              <TableColumn key="task-description" className={headerCellClass}>
                Task Description
              </TableColumn>,
              <TableColumn key="dependencies" className={headerCellClass}>
                Dependencies
              </TableColumn>,
              <TableColumn key="due-date-trigger" className={headerCellClass}>
                Due date trigger
              </TableColumn>,
              <TableColumn key="label" className={headerCellClass}>
                Label
              </TableColumn>,
              <TableColumn
                key="action"
                className={`${headerCellClass} text-right`}
              >
                Action
              </TableColumn>,
            ]}
          </TableHeader>
          <TableBody items={visibleTaskRows}>
            {(item) => {
              const sourceIndex = taskRows.findIndex(
                (row) => row.id === item.id,
              );
              const hasChildren =
                sourceIndex >= 0
                  ? hasChildRows(taskRows, sourceIndex, item.level)
                  : false;

              return (
                <TableRow key={item.id}>
                  {[
                    <TableCell key="select">
                      <Checkbox
                        isSelected={item.isSelected}
                        onValueChange={(isSelected) =>
                          toggleTaskSelection(item.id, isSelected)
                        }
                      />
                    </TableCell>,
                    <TableCell key="task-name">
                      {buildTaskRowName(item, hasChildren, toggleTaskExpansion)}
                    </TableCell>,
                    <TableCell
                      key="task-description"
                      className="text-sm text-[#4B5563]"
                    >
                      {item.taskDescription}
                    </TableCell>,
                    <TableCell
                      key="dependencies"
                      className="text-sm text-[#4B5563]"
                    >
                      {item.dependency}
                    </TableCell>,
                    <TableCell key="due-date-trigger">
                      <span className="text-sm text-[#4B5563]">
                        {item.dueDateTrigger}
                      </span>
                    </TableCell>,
                    <TableCell key="label">
                      <div className="flex flex-wrap gap-2">
                        {item.labels.length ? (
                          item.labels.map((label) => (
                            <Chip
                              key={label}
                              className="bg-[#EEF2FF] text-[#6366F1]"
                              size="sm"
                              variant="flat"
                            >
                              {label}
                            </Chip>
                          ))
                        ) : (
                          <span className="text-sm text-default-400">-</span>
                        )}
                      </div>
                    </TableCell>,
                    <TableCell key="action">
                      <div className="flex justify-end">
                        <Button
                          isIconOnly
                          className="border-danger-200 text-danger"
                          radius="md"
                          variant="bordered"
                          onPress={() => removeTask(item.id)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </TableCell>,
                  ]}
                </TableRow>
              );
            }}
          </TableBody>
        </Table>
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
          projectName: getValues("projectName") ?? "",
          status: getValues("status") ?? "",
          tasks: taskRows.map((task) => ({
            assigneeId: task.assigneeId,
            assigneeName: task.assigneeName,
            blockedTaskId: task.blockedTaskId,
            dependency: task.dependency,
            dependencyType: task.dependencyType,
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
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <Textarea
                      minRows={currentStep === 1 ? 10 : 6}
                      placeholder=""
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onValueChange={field.onChange}
                    />
                  )}
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
        blockedTaskOptions={blockedTaskOptions}
        isOpen={isAddTaskModalOpen}
        parentTaskOptions={parentTaskOptions}
        users={taskUsers}
        onOpenChange={setIsAddTaskModalOpen}
        onSubmit={async (payload) => {
          addTask(payload);
        }}
      />
    </Modal>
  );
};
