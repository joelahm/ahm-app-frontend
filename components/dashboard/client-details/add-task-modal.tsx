"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Button } from "@heroui/button";
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
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { X } from "lucide-react";

const taskStatusOptions = ["TODO", "IN PROGRESS", "DONE", "ON HOLD"];

const addTaskSchema = yup.object({
  assigneeId: yup.string().required("Assignee is required"),
  description: yup.string().required("Description is required"),
  dueDate: yup
    .string()
    .required("Due date is required")
    .test(
      "due-date-min",
      "Due date must be today or later, and not before start date.",
      function validateDueDate(value) {
        const { startDate } = this.parent as { startDate?: string };

        if (!value) {
          return false;
        }

        const due = new Date(value);
        const start = startDate ? new Date(startDate) : null;
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        if (Number.isNaN(due.getTime())) {
          return false;
        }

        if (due < today) {
          return false;
        }

        if (start && !Number.isNaN(start.getTime()) && due < start) {
          return false;
        }

        return true;
      },
    ),
  projectId: yup.string().required("Project type is required"),
  startDate: yup
    .string()
    .required("Start date is required")
    .test(
      "start-date-min",
      "Start date must be today or later.",
      (value: string | undefined) => {
        if (!value) {
          return false;
        }

        const start = new Date(value);
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        return !Number.isNaN(start.getTime()) && start >= today;
      },
    ),
  status: yup.string().oneOf(taskStatusOptions).required("Status is required"),
  taskName: yup.string().required("Task name is required"),
});

export type AddTaskFormValues = yup.InferType<typeof addTaskSchema>;

interface AddTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (payload: AddTaskFormValues) => void | Promise<void>;
  projectOptions: Array<{
    id: string;
    label: string;
  }>;
  users: Array<{
    avatar?: string | null;
    id: string;
    name: string;
  }>;
}

const labelClassName = "mb-1.5 block text-sm text-[#4B5563]";

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toCalendarDate = (value?: string) => {
  if (!value) {
    return null;
  }

  try {
    return parseDate(value);
  } catch {
    return null;
  }
};

export const AddTaskModal = ({
  isOpen,
  onOpenChange,
  onSubmit,
  projectOptions,
  users,
}: AddTaskModalProps) => {
  const [submitError, setSubmitError] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const todayString = useMemo(() => getToday(), []);
  const todayValue = useMemo(() => today(getLocalTimeZone()), []);
  const {
    control,
    watch,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddTaskFormValues>({
    defaultValues: {
      assigneeId: "",
      description: "",
      dueDate: "",
      projectId: "",
      startDate: "",
      status: "TODO",
      taskName: "",
    },
    mode: "onBlur",
  });
  const startDate = watch("startDate");
  const startDateValue = toCalendarDate(startDate);
  const minDueDateValue =
    startDateValue && startDateValue.compare(todayValue) > 0
      ? startDateValue
      : todayValue;
  const filteredUsers = useMemo(() => {
    const normalized = assigneeSearch.trim().toLowerCase();

    if (!normalized) {
      return users;
    }

    return users.filter((user) => user.name.toLowerCase().includes(normalized));
  }, [assigneeSearch, users]);

  const closeModal = () => {
    onOpenChange(false);
    reset();
    clearErrors();
    setSubmitError("");
    setAssigneeSearch("");
  };

  const submitTask = async (values: AddTaskFormValues) => {
    clearErrors();
    setSubmitError("");

    try {
      const validatedValues = await addTaskSchema.validate(values, {
        abortEarly: false,
      });

      await onSubmit(validatedValues);
      closeModal();
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof AddTaskFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      setSubmitError(
        error instanceof Error ? error.message : "Failed to add task.",
      );
    }
  };

  return (
    <Modal
      hideCloseButton
      isDismissable={false}
      isOpen={isOpen}
      size="xl"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between border-b border-default-200">
          <h2 className="text-lg font-semibold text-[#111827]">Add Task</h2>
          <Button
            isIconOnly
            radius="full"
            size="sm"
            variant="light"
            onPress={closeModal}
          >
            <X size={20} />
          </Button>
        </ModalHeader>
        <ModalBody className="space-y-4 py-5">
          {submitError ? (
            <p className="text-sm text-danger">{submitError}</p>
          ) : null}
          <div>
            <p className={labelClassName}>Task name</p>
            <Controller
              control={control}
              name="taskName"
              render={({ field }) => (
                <Input
                  errorMessage={errors.taskName?.message}
                  isInvalid={!!errors.taskName}
                  radius="sm"
                  size="sm"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <div>
            <p className={labelClassName}>Project type</p>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select
                  errorMessage={errors.projectId?.message}
                  isInvalid={!!errors.projectId}
                  placeholder="Select project type"
                  radius="sm"
                  selectedKeys={field.value ? [field.value] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys as Set<string>)[0] ?? "";

                    field.onChange(selected);
                  }}
                >
                  {projectOptions.map((option) => (
                    <SelectItem key={option.id}>{option.label}</SelectItem>
                  ))}
                </Select>
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
                  placeholder="Select status"
                  radius="sm"
                  selectedKeys={field.value ? [field.value] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    field.onChange(Array.from(keys as Set<string>)[0] ?? "");
                  }}
                >
                  {taskStatusOptions.map((option) => (
                    <SelectItem key={option}>{option}</SelectItem>
                  ))}
                </Select>
              )}
            />
          </div>
          <div>
            <p className={labelClassName}>Description</p>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Textarea
                  errorMessage={errors.description?.message}
                  isInvalid={!!errors.description}
                  minRows={3}
                  radius="sm"
                  size="sm"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <div>
            <p className={labelClassName}>Assignee</p>
            <Controller
              control={control}
              name="assigneeId"
              render={({ field }) => (
                <Autocomplete
                  allowsCustomValue={false}
                  errorMessage={errors.assigneeId?.message}
                  inputValue={assigneeSearch}
                  isInvalid={!!errors.assigneeId}
                  items={filteredUsers}
                  menuTrigger="focus"
                  placeholder="Select assignee"
                  radius="sm"
                  selectedKey={field.value || null}
                  size="sm"
                  onInputChange={setAssigneeSearch}
                  onSelectionChange={(key) => {
                    const selected = typeof key === "string" ? key : "";
                    const selectedUser = users.find(
                      (user) => user.id === selected,
                    );

                    field.onChange(selected);
                    if (selectedUser) {
                      setAssigneeSearch(selectedUser.name);
                    }
                  }}
                >
                  {(item) => (
                    <AutocompleteItem key={item.id} textValue={item.name}>
                      {item.name}
                    </AutocompleteItem>
                  )}
                </Autocomplete>
              )}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className={labelClassName}>Start date</p>
              <Controller
                control={control}
                name="startDate"
                render={({ field }) => (
                  <DatePicker
                    hideTimeZone
                    errorMessage={errors.startDate?.message}
                    isInvalid={!!errors.startDate}
                    minValue={toCalendarDate(todayString) ?? todayValue}
                    radius="sm"
                    size="sm"
                    value={toCalendarDate(field.value)}
                    onChange={(value) => {
                      field.onChange(value ? value.toString() : "");
                    }}
                  />
                )}
              />
            </div>
            <div>
              <p className={labelClassName}>Due date</p>
              <Controller
                control={control}
                name="dueDate"
                render={({ field }) => (
                  <DatePicker
                    hideTimeZone
                    errorMessage={errors.dueDate?.message}
                    isInvalid={!!errors.dueDate}
                    minValue={minDueDateValue}
                    radius="sm"
                    size="sm"
                    value={toCalendarDate(field.value)}
                    onChange={(value) => {
                      field.onChange(value ? value.toString() : "");
                    }}
                  />
                )}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="border-t border-default-200">
          <Button radius="sm" variant="bordered" onPress={closeModal}>
            Cancel
          </Button>
          <Button
            className="bg-[#022279] text-white"
            isLoading={isSubmitting}
            radius="sm"
            onPress={() => {
              void handleSubmit(submitTask)();
            }}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
