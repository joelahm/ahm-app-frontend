"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Button } from "@heroui/button";
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
  CheckSquare,
  FileText,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { clientsApi } from "@/apis/clients";
import {
  projectTemplatesApi,
  type ProjectTemplateTaskAttachment,
  type ProjectTemplateTaskChecklist,
} from "@/apis/project-templates";
import { useAuth } from "@/components/auth/auth-context";
import {
  RichTextEditor,
  buildDocFromPlainText,
  type JSONContent,
} from "@/components/dashboard/client-details/task-panel/editor/rich-text-editor";
import { resolveServerAssetUrl } from "@/components/dashboard/client-details/task-panel/task-panel-utils";
import { TokenInputField } from "@/components/form/token-input-field";
import { useAppToast } from "@/hooks/use-app-toast";
import { TASK_STATUS_OPTIONS } from "@/lib/task-statuses";

const dependencyRemapOptions = ["After Blocked Task", "After trigger date"];

const addProjectTemplateTaskSchema = yup.object({
  assigneeId: yup.string().required("Assignee is required"),
  blockedTaskId: yup.string().when("dependencyType", {
    is: "After Blocked Task",
    otherwise: (schema) => schema.default("").notRequired(),
    then: (schema) => schema.required("Blocked task is required"),
  }),
  dependencyType: yup
    .string()
    .oneOf(dependencyRemapOptions)
    .default("After trigger date")
    .required("Dependency type is required"),
  enableDependency: yup.boolean().default(false),
  labels: yup.array().of(yup.string().trim().required()).default([]).required(),
  parentTaskId: yup.string().default(""),
  description: yup.string().default(""),
  remapDays: yup
    .string()
    .matches(/^\d+$/, "Days must be a number")
    .default("0")
    .required("Days is required"),
  status: yup
    .string()
    .oneOf([...TASK_STATUS_OPTIONS], "Please select a valid status")
    .required("Status is required"),
  taskTitle: yup.string().required("Task title is required"),
});

export type AddProjectTemplateTaskFormValues = yup.InferType<
  typeof addProjectTemplateTaskSchema
>;

export interface AddProjectTemplateTaskRichValues {
  attachments: ProjectTemplateTaskAttachment[];
  checklists: ProjectTemplateTaskChecklist[];
  descriptionJson: JSONContent | null;
}

export type AddProjectTemplateTaskSubmitPayload =
  AddProjectTemplateTaskFormValues & AddProjectTemplateTaskRichValues;

interface AddProjectTemplateTaskModalProps {
  blockedTaskOptions: Array<{ id: string; label: string }>;
  initialRich?: Partial<AddProjectTemplateTaskRichValues> | null;
  initialValues?: Partial<AddProjectTemplateTaskFormValues> | null;
  isOpen: boolean;
  mode?: "add" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    payload: AddProjectTemplateTaskSubmitPayload,
  ) => void | Promise<void>;
  parentTaskOptions: Array<{ id: string; label: string }>;
  users: Array<{ id: string; name: string }>;
}

const labelClassName = "mb-1.5 block text-sm text-[#4B5563]";

export const AddProjectTemplateTaskModal = ({
  blockedTaskOptions,
  initialRich,
  initialValues,
  isOpen,
  mode = "add",
  onOpenChange,
  onSubmit,
  parentTaskOptions,
  users,
}: AddProjectTemplateTaskModalProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [descriptionJson, setDescriptionJson] = useState<JSONContent | null>(
    null,
  );
  const [checklists, setChecklists] = useState<ProjectTemplateTaskChecklist[]>(
    [],
  );
  const [attachments, setAttachments] = useState<
    ProjectTemplateTaskAttachment[]
  >([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
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
      dependencyType: "After trigger date",
      enableDependency: false,
      labels: [],
      parentTaskId: "",
      remapDays: "0",
      status: TASK_STATUS_OPTIONS[0],
      taskTitle: "",
    },
    mode: "onBlur",
  });
  const assigneeId = watch("assigneeId");
  const dependencyType = watch("dependencyType");
  const isEditing = mode === "edit";
  const isBlockedTaskRule = dependencyType === "After Blocked Task";

  const filteredUsers = useMemo(() => {
    const normalized = assigneeSearch.trim().toLowerCase();

    if (!normalized) {
      return users;
    }

    return users.filter((user) => user.name.toLowerCase().includes(normalized));
  }, [assigneeSearch, users]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset({
      assigneeId: initialValues?.assigneeId ?? "",
      blockedTaskId: initialValues?.blockedTaskId ?? "",
      description: initialValues?.description ?? "",
      dependencyType: initialValues?.dependencyType ?? "After trigger date",
      enableDependency: initialValues?.dependencyType === "After Blocked Task",
      labels: initialValues?.labels ?? [],
      parentTaskId: initialValues?.parentTaskId ?? "",
      remapDays: initialValues?.remapDays ?? "0",
      status: initialValues?.status ?? TASK_STATUS_OPTIONS[0],
      taskTitle: initialValues?.taskTitle ?? "",
    });

    setDescriptionJson(
      initialRich?.descriptionJson ??
        (initialValues?.description && initialValues.description !== "-"
          ? buildDocFromPlainText(initialValues.description)
          : null),
    );
    setChecklists(initialRich?.checklists ?? []);
    setAttachments(initialRich?.attachments ?? []);
  }, [initialRich, initialValues, isOpen, reset]);

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

  const updateChecklist = (
    checklistId: string | undefined,
    updater: (
      checklist: ProjectTemplateTaskChecklist,
    ) => ProjectTemplateTaskChecklist,
  ) => {
    setChecklists((current) =>
      current.map((checklist) =>
        checklist.id === checklistId ? updater(checklist) : checklist,
      ),
    );
  };

  const handleAddChecklist = () => {
    setChecklists((current) => [
      ...current,
      {
        id: `checklist-${Date.now()}`,
        title: `Checklist ${current.length + 1}`,
        items: [],
      },
    ]);
  };

  const handleRemoveChecklist = (checklistId?: string) => {
    setChecklists((current) =>
      current.filter((checklist) => checklist.id !== checklistId),
    );
  };

  const handleAddChecklistItem = (
    checklistId: string | undefined,
    text: string,
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    updateChecklist(checklistId, (checklist) => ({
      ...checklist,
      items: [
        ...checklist.items,
        { id: `item-${Date.now()}`, text: trimmed, isComplete: false },
      ],
    }));
  };

  const handleRemoveChecklistItem = (
    checklistId: string | undefined,
    itemId: string | undefined,
  ) => {
    updateChecklist(checklistId, (checklist) => ({
      ...checklist,
      items: checklist.items.filter((item) => item.id !== itemId),
    }));
  };

  const handleUploadAttachment = async (file: File) => {
    if (!session?.accessToken) {
      toast.danger("You must be signed in to upload attachments.");
      return;
    }

    try {
      setIsUploadingAttachment(true);
      const accessToken = await getValidAccessToken();
      const attachment = await projectTemplatesApi.uploadAttachment(
        accessToken,
        file,
      );

      setAttachments((current) => [...current, attachment]);
    } catch (error) {
      toast.danger("Failed to upload attachment.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleRemoveAttachment = (attachmentId?: string) => {
    setAttachments((current) =>
      current.filter((item) => item.id !== attachmentId),
    );
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

      await onSubmit({
        ...validatedValues,
        attachments,
        checklists,
        descriptionJson,
      });
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
          <h2 className="text-lg font-semibold text-[#111827]">
            {isEditing ? "Edit Task" : "Add Task"}
          </h2>
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
            <RichTextEditor
              placeholder="Describe the task…"
              value={descriptionJson}
              onChange={(json) => setDescriptionJson(json)}
              onFetchUrlPreview={async (url) => {
                const accessToken = await getValidAccessToken();
                return clientsApi.getUrlPreview(accessToken, url);
              }}
              onUploadError={(message) =>
                toast.danger("Image upload failed", { description: message })
              }
              onUploadImage={async (file) => {
                const accessToken = await getValidAccessToken();
                const attachment = await projectTemplatesApi.uploadAttachment(
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

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className={labelClassName}>Checklists</p>
              <Button
                radius="sm"
                size="sm"
                startContent={<Plus size={14} />}
                variant="bordered"
                onPress={handleAddChecklist}
              >
                Add checklist
              </Button>
            </div>
            {checklists.length === 0 ? (
              <p className="rounded-lg border border-dashed border-default-200 px-3 py-4 text-center text-xs text-default-500">
                No checklists yet.
              </p>
            ) : (
              <div className="space-y-3">
                {checklists.map((checklist) => (
                  <div
                    key={checklist.id ?? checklist.title}
                    className="rounded-lg border border-default-200 p-3"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <CheckSquare className="text-[#022279]" size={14} />
                      <Input
                        placeholder="Checklist title"
                        radius="sm"
                        size="sm"
                        value={checklist.title}
                        onValueChange={(value) =>
                          updateChecklist(checklist.id, (item) => ({
                            ...item,
                            title: value,
                          }))
                        }
                      />
                      <Button
                        isIconOnly
                        radius="sm"
                        size="sm"
                        variant="light"
                        onPress={() => handleRemoveChecklist(checklist.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {checklist.items.map((item) => (
                        <div
                          key={item.id ?? item.text}
                          className="flex items-center gap-2"
                        >
                          <span className="h-3 w-3 flex-none rounded-sm border border-default-300" />
                          <span className="flex-1 text-sm text-default-700">
                            {item.text}
                          </span>
                          <button
                            aria-label="Remove item"
                            className="text-default-400 hover:text-default-700"
                            type="button"
                            onClick={() =>
                              handleRemoveChecklistItem(checklist.id, item.id)
                            }
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <ChecklistItemInput
                        onAdd={(value) =>
                          handleAddChecklistItem(checklist.id, value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className={labelClassName}>Attachments</p>
              <Button
                isLoading={isUploadingAttachment}
                radius="sm"
                size="sm"
                startContent={<Upload size={14} />}
                variant="bordered"
                onPress={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleUploadAttachment(file);
                  }
                  event.target.value = "";
                }}
              />
            </div>
            {attachments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-default-200 px-3 py-4 text-center text-xs text-default-500">
                No attachments yet.
              </p>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id ?? attachment.url}
                    className="flex items-center gap-3 rounded-lg border border-default-200 px-3 py-2 text-sm"
                  >
                    {attachment.mimeType?.startsWith("image/") ? (
                      <Paperclip size={14} />
                    ) : (
                      <FileText size={14} />
                    )}
                    <a
                      className="flex-1 truncate text-[#022279] hover:underline"
                      href={attachment.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {attachment.filename}
                    </a>
                    <button
                      aria-label="Remove attachment"
                      className="text-default-400 hover:text-default-700"
                      type="button"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                    {TASK_STATUS_OPTIONS.map((option) => (
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
                        Array.from(keys as Set<string>)[0] ??
                        "After trigger date";

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

          {isBlockedTaskRule ? (
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
                      const selected = Array.from(keys as Set<string>)[0] ?? "";

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
            {isEditing ? "Update Task" : "Save Task"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};


interface ChecklistItemInputProps {
  onAdd: (value: string) => void;
}

const ChecklistItemInput = ({ onAdd }: ChecklistItemInputProps) => {
  const [value, setValue] = useState("");

  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 flex-none rounded-sm border border-default-300" />
      <Input
        placeholder="Add an item — Enter to confirm"
        radius="sm"
        size="sm"
        value={value}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (value.trim()) {
              onAdd(value);
              setValue("");
            }
          }
        }}
        onValueChange={setValue}
      />
    </div>
  );
};
