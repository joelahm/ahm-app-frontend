"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import { X } from "lucide-react";

import { TokenInputField } from "@/components/form/token-input-field";

const dependencyRemapOptions = ["After Blocked Task", "After trigger date"];
const taskStatusOptions = ["Draft", "Publish"];

const addProjectTemplateTaskSchema = yup.object({
  assigneeId: yup.string().required("Assignee is required"),
  blockedTaskId: yup.string().when("enableDependency", {
    is: true,
    otherwise: (schema) => schema.default("").notRequired(),
    then: (schema) => schema.required("Blocked task is required"),
  }),
  dependencyType: yup.string().when("enableDependency", {
    is: true,
    otherwise: (schema) => schema.default("").notRequired(),
    then: (schema) => schema.required("Dependency type is required"),
  }),
  enableDependency: yup.boolean().default(false).required(),
  labels: yup
    .array()
    .of(yup.string().trim().required())
    .min(1, "At least one label is required")
    .required("At least one label is required"),
  parentTaskId: yup.string().default(""),
  description: yup.string().default(""),
  remapDays: yup
    .string()
    .matches(/^\d+$/, "Days must be a number")
    .default("0")
    .required("Days is required"),
  status: yup.string().required("Status is required"),
  taskTitle: yup.string().required("Task title is required"),
});

export type AddProjectTemplateTaskFormValues = yup.InferType<
  typeof addProjectTemplateTaskSchema
>;

interface AddProjectTemplateTaskModalProps {
  blockedTaskOptions: Array<{ id: string; label: string }>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: AddProjectTemplateTaskFormValues) => void | Promise<void>;
  parentTaskOptions: Array<{ id: string; label: string }>;
  users: Array<{ id: string; name: string }>;
}

const labelClassName = "mb-1.5 block text-sm text-[#4B5563]";

export const AddProjectTemplateTaskModal = ({
  blockedTaskOptions,
  isOpen,
  onOpenChange,
  onSubmit,
  parentTaskOptions,
  users,
}: AddProjectTemplateTaskModalProps) => {
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [submitError, setSubmitError] = useState("");
  const {
    control,
    clearErrors,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddProjectTemplateTaskFormValues>({
    defaultValues: {
      assigneeId: "",
      blockedTaskId: "",
      description: "",
      dependencyType: "",
      enableDependency: false,
      labels: [],
      parentTaskId: "",
      remapDays: "0",
      status: "Draft",
      taskTitle: "",
    },
    mode: "onBlur",
  });
  const assigneeId = watch("assigneeId");
  const enableDependency = watch("enableDependency");

  const filteredUsers = useMemo(() => {
    const normalized = assigneeSearch.trim().toLowerCase();

    if (!normalized) {
      return users;
    }

    return users.filter((user) => user.name.toLowerCase().includes(normalized));
  }, [assigneeSearch, users]);

  useEffect(() => {
    if (!isOpen) {
      setAssigneeSearch("");

      return;
    }

    if (!assigneeId) {
      setAssigneeSearch("");

      return;
    }

    const selectedUser = users.find((user) => user.id === assigneeId);

    setAssigneeSearch(selectedUser?.name ?? "");
  }, [assigneeId, isOpen, users]);

  const closeModal = () => {
    onOpenChange(false);
    reset();
    clearErrors();
    setSubmitError("");
    setAssigneeSearch("");
  };

  const submitTask = async (values: AddProjectTemplateTaskFormValues) => {
    clearErrors();
    setSubmitError("");

    try {
      const validatedValues = await addProjectTemplateTaskSchema.validate(
        values,
        {
          abortEarly: false,
        },
      );

      await onSubmit(validatedValues);
      closeModal();
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof AddProjectTemplateTaskFormValues, {
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
      scrollBehavior="inside"
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
            <p className={labelClassName}>Task title</p>
            <Controller
              control={control}
              name="taskTitle"
              render={({ field }) => (
                <Input
                  errorMessage={errors.taskTitle?.message}
                  isInvalid={!!errors.taskTitle}
                  radius="sm"
                  size="sm"
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                />
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
                  minRows={4}
                  radius="sm"
                  size="sm"
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
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
                    const selected = key ? String(key) : "";
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

          <div className="grid gap-4 md:grid-cols-2">
            <div>
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
                      const selected = Array.from(keys as Set<string>)[0] ?? "";

                      field.onChange(selected);
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
              <p className={labelClassName}>Parent task</p>
              <Controller
                control={control}
                name="parentTaskId"
                render={({ field }) => (
                  <Select
                    placeholder="No parent task"
                    radius="sm"
                    selectedKeys={field.value ? [field.value] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys as Set<string>)[0] ?? "";

                      field.onChange(selected);
                    }}
                  >
                    {parentTaskOptions.map((option) => (
                      <SelectItem key={option.id}>{option.label}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
          </div>

          <div>
            <Controller
              control={control}
              name="labels"
              render={({ field }) => (
                <TokenInputField
                  errorMessage={errors.labels?.message}
                  label="Labels"
                  placeholder="Add Labels"
                  tokens={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="rounded-xl border border-default-200 px-4 py-3">
            <Controller
              control={control}
              name="enableDependency"
              render={({ field }) => (
                <Switch
                  isSelected={field.value}
                  size="sm"
                  onValueChange={field.onChange}
                >
                  Enable dependency
                </Switch>
              )}
            />
          </div>

          {enableDependency ? (
            <>
              <div>
                <p className={labelClassName}>Blocked Task</p>
                <Controller
                  control={control}
                  name="blockedTaskId"
                  render={({ field }) => (
                    <Select
                      errorMessage={errors.blockedTaskId?.message}
                      isInvalid={!!errors.blockedTaskId}
                      placeholder="Select blocked task"
                      radius="sm"
                      selectedKeys={field.value ? [field.value] : []}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const selected =
                          Array.from(keys as Set<string>)[0] ?? "";

                        field.onChange(selected);
                      }}
                    >
                      {blockedTaskOptions.map((option) => (
                        <SelectItem key={option.id}>{option.label}</SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>

              <div>
                <p className={labelClassName}>Re-map due date</p>
                <div className="grid gap-4 md:grid-cols-[130px_1fr]">
                  <Controller
                    control={control}
                    name="remapDays"
                    render={({ field }) => (
                      <Input
                        errorMessage={errors.remapDays?.message}
                        isInvalid={!!errors.remapDays}
                        placeholder="Days"
                        radius="sm"
                        size="sm"
                        value={field.value}
                        onBlur={field.onBlur}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="dependencyType"
                    render={({ field }) => (
                      <Select
                        errorMessage={errors.dependencyType?.message}
                        isInvalid={!!errors.dependencyType}
                        placeholder="Select rule"
                        radius="sm"
                        selectedKeys={field.value ? [field.value] : []}
                        size="sm"
                        onSelectionChange={(keys) => {
                          const selected =
                            Array.from(keys as Set<string>)[0] ?? "";

                          field.onChange(selected);
                        }}
                      >
                        {dependencyRemapOptions.map((option) => (
                          <SelectItem key={option}>{option}</SelectItem>
                        ))}
                      </Select>
                    )}
                  />
                </div>
              </div>
            </>
          ) : null}
        </ModalBody>
        <ModalFooter className="border-t border-default-200">
          <Button radius="md" variant="bordered" onPress={closeModal}>
            Cancel
          </Button>
          <Button
            className="bg-[#022279] text-white"
            isLoading={isSubmitting}
            radius="md"
            onPress={() => void handleSubmit(submitTask)()}
          >
            Save Task
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
