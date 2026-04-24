"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { ArrowLeft, FileText, Paperclip, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { aiPromptsApi } from "@/apis/ai-prompts";
import { clientsApi } from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { DynamicValuePillsPicker } from "@/components/dashboard/settings/dynamic-value-pills-picker";
import { useAppToast } from "@/hooks/use-app-toast";
import { getDynamicPromptValuesByPostType } from "@/lib/ai-prompt-dynamic-values";

const labelClassName = "mb-1.5 block text-sm text-[#4B5563]";

const typeOfPostOptions = [
  "GBP Update",
  "GBP Offer",
  "GBP Event",
  "Service Page",
  "Meta Title",
  "Homepage",
  "Treatment Page",
  "Condition Page",
  "Blog Page",
  "Press Release",
  "Guest Post",
];

const statusOptions = ["Active", "Draft"] as const;

const aiPromptSchema = yup.object({
  clientId: yup.string().required("Client name is required"),
  maxCharacter: yup
    .string()
    .trim()
    .required("Max character is required")
    .matches(/^\d+$/, "Max character must be a number")
    .test(
      "positive-max-character",
      "Max character must be greater than 0",
      (value) => Number(value ?? "0") > 0,
    ),
  prompt: yup.string().trim().required("Prompt is required"),
  status: yup
    .string()
    .oneOf([...statusOptions])
    .required("Status is required"),
  typeOfPost: yup.string().required("Type of post is required"),
  uniqueId: yup.string().required("Unique ID Prompt is required"),
});

type AiPromptFormValues = yup.InferType<typeof aiPromptSchema>;

type AttachmentItem = {
  id: string;
  name: string;
  size: number;
  type: string;
};

interface SettingsAIPromptEditorContentProps {
  mode?: "create" | "edit";
  promptId?: string;
}

export const SettingsAIPromptEditorContent = ({
  mode = "create",
  promptId,
}: SettingsAIPromptEditorContentProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const toastRef = useRef(toast);
  const router = useRouter();
  const [loadError, setLoadError] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(
    null,
  );
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [clientOptions, setClientOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedCustomValues, setSelectedCustomValues] = useState<string[]>(
    [],
  );
  const [dynamicValuesSourceFilter, setDynamicValuesSourceFilter] =
    useState<string>("all");
  const [promptSelection, setPromptSelection] = useState({
    start: 0,
    end: 0,
  });
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const {
    control,
    clearErrors,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AiPromptFormValues>({
    defaultValues: {
      clientId: "",
      maxCharacter: "1500",
      prompt: "",
      status: "Draft",
      typeOfPost: typeOfPostOptions[0],
      uniqueId: "",
    },
    mode: "onBlur",
  });
  const promptValue = watch("prompt");
  const selectedTypeOfPost = watch("typeOfPost");
  const title = mode === "edit" ? "Edit Prompt" : "Add New Prompt";
  const customValueOptions = useMemo(
    () => getDynamicPromptValuesByPostType(selectedTypeOfPost),
    [selectedTypeOfPost],
  );
  const customValuesForSelectedSource = useMemo(
    () =>
      dynamicValuesSourceFilter === "all"
        ? customValueOptions
        : customValueOptions.filter(
            (option) => option.source === dynamicValuesSourceFilter,
          ),
    [customValueOptions, dynamicValuesSourceFilter],
  );
  const dynamicValueSourceFilterOptions = useMemo(
    () => [
      "all",
      "Client Details",
      "Keyword Research",
      "Web Content",
      "GBP Postings",
    ],
    [],
  );

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    let isMounted = true;

    const loadClients = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const response = await clientsApi.getClients(accessToken);

        if (!isMounted) {
          return;
        }

        const nextClients = response
          .map((client) => ({
            id: String(client.id),
            name:
              client.businessName?.trim() ||
              client.clientName?.trim() ||
              `Client ${client.id}`,
          }))
          .filter(
            (client, index, current) =>
              client.name.length > 0 &&
              current.findIndex((item) => item.id === client.id) === index,
          );

        setClientOptions(nextClients);

        if (mode === "create" && nextClients[0]) {
          setValue("clientId", nextClients[0].id, {
            shouldDirty: false,
            shouldValidate: false,
          });
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setClientOptions([]);
        toastRef.current.warning("Failed to load clients.");
      }
    };

    const loadCreateDefaults = async () => {
      try {
        setLoadError("");
        const accessToken = await getValidAccessToken();
        const response = await aiPromptsApi.reserveUniqueId(accessToken);

        if (!isMounted) {
          return;
        }

        setValue("uniqueId", response.uniqueId);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Failed to load unique prompt ID.";

        setLoadError(message);
        toastRef.current.danger("Failed to load prompt defaults.", {
          description: message,
        });
      }
    };

    const loadExistingPrompt = async () => {
      if (!promptId) {
        setLoadError("Prompt ID is missing.");

        return;
      }

      try {
        setLoadError("");
        const accessToken = await getValidAccessToken();
        const response = await aiPromptsApi.getPrompts(accessToken);
        const prompt = response.aiPrompts.find((item) => item.id === promptId);

        if (!isMounted) {
          return;
        }

        if (!prompt) {
          setLoadError("Prompt not found.");
          toastRef.current.danger("Prompt not found.");

          return;
        }

        setValue("clientId", prompt.clientId || "");
        setValue("maxCharacter", prompt.maxCharacter || "1500");
        setValue("prompt", prompt.prompt || "");
        setValue("status", prompt.status === "Active" ? "Active" : "Draft");
        setValue("typeOfPost", prompt.typeOfPost || typeOfPostOptions[0]);
        setValue("uniqueId", prompt.uniqueId || "");
        setSelectedCustomValues(prompt.customValues || []);
        setAttachments(
          (prompt.attachments || []).map((attachment) => ({
            id: attachment.id,
            name: attachment.name,
            size: attachment.size,
            type: attachment.type,
          })),
        );
        setPromptSelection({
          start: (prompt.prompt || "").length,
          end: (prompt.prompt || "").length,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to load prompt.";

        setLoadError(message);
        toastRef.current.danger("Failed to load prompt.", {
          description: message,
        });
      }
    };

    void loadClients();

    if (mode === "edit") {
      void loadExistingPrompt();
    } else {
      void loadCreateDefaults();
    }

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, mode, promptId, session?.accessToken, setValue]);

  const updatePromptSelection = () => {
    const textarea = promptRef.current;

    if (!textarea) {
      return;
    }

    setPromptSelection({
      start: textarea.selectionStart ?? promptValue.length,
      end: textarea.selectionEnd ?? promptValue.length,
    });
  };

  const handleCustomValueInsert = (token: string) => {
    if (!token) {
      return;
    }

    const start = promptSelection.start;
    const end = promptSelection.end;
    const nextPromptValue =
      promptValue.slice(0, start) + token + promptValue.slice(end);
    const nextCursorPosition = start + token.length;

    setValue("prompt", nextPromptValue, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setSelectedCustomValues((current) =>
      current.includes(token) ? current : [...current, token],
    );
    setPromptSelection({
      start: nextCursorPosition,
      end: nextCursorPosition,
    });

    requestAnimationFrame(() => {
      promptRef.current?.focus();
      promptRef.current?.setSelectionRange(
        nextCursorPosition,
        nextCursorPosition,
      );
    });
  };

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    if (size >= 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${size} B`;
  };

  const openAttachmentPicker = () => {
    attachmentInputRef.current?.click();
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setSelectedAttachment(file);
  };

  const handleAddAttachment = () => {
    if (!selectedAttachment) {
      return;
    }

    setAttachments((current) => [
      ...current,
      {
        id: `${selectedAttachment.name}-${selectedAttachment.lastModified}`,
        name: selectedAttachment.name,
        size: selectedAttachment.size,
        type: selectedAttachment.type,
      },
    ]);
    setSelectedAttachment(null);

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = (index: number) => {
    setAttachments((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const submitPrompt = async (values: AiPromptFormValues) => {
    clearErrors();

    if (!session?.accessToken) {
      toastRef.current.danger("You must be signed in to save prompts.");

      return;
    }

    try {
      const validatedValues = await aiPromptSchema.validate(values, {
        abortEarly: false,
      });

      const payload = {
        attachments: attachments.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
        clientId: validatedValues.clientId,
        customValues: selectedCustomValues,
        maxCharacter: validatedValues.maxCharacter,
        prompt: validatedValues.prompt,
        status: validatedValues.status as "Draft" | "Active",
        typeOfPost: validatedValues.typeOfPost,
        uniqueId: validatedValues.uniqueId,
      };

      const accessToken = await getValidAccessToken();

      if (mode === "edit" && promptId) {
        await aiPromptsApi.updatePrompt(accessToken, promptId, payload);
      } else {
        await aiPromptsApi.createPrompt(accessToken, payload);
      }

      toastRef.current.success("AI prompt saved.");
      router.push("/dashboard/settings/ai-hub");
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof AiPromptFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        toastRef.current.warning("Please check the highlighted fields.");

        return;
      }

      toastRef.current.danger("Failed to save prompt.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const submitEditorForm = () => {
    void handleSubmit(submitPrompt)();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="col-span-2 border border-default-200 shadow-sm">
        <CardHeader className="flex items-center justify-between gap-4 border-b border-default-200">
          <div className="flex items-center gap-3">
            <Button
              isIconOnly
              as={Link}
              href="/dashboard/settings/ai-hub"
              radius="full"
              variant="light"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="font-semibold text-[#111827]">{title}</h1>
          </div>

          <Button
            className="bg-primary px-6 text-white"
            isLoading={isSubmitting}
            radius="sm"
            onPress={submitEditorForm}
          >
            Save
          </Button>
        </CardHeader>

        <CardBody className="space-y-5 px-5 py-5">
          <div>
            <p className={labelClassName}>Unique ID Prompt</p>
            <Controller
              control={control}
              name="uniqueId"
              render={({ field }) => (
                <Input
                  isReadOnly
                  errorMessage={loadError || errors.uniqueId?.message}
                  isInvalid={!!loadError || !!errors.uniqueId}
                  radius="sm"
                  size="sm"
                  value={field.value}
                />
              )}
            />
          </div>

          <div>
            <p className={labelClassName}>Type of Post</p>
            <Controller
              control={control}
              name="typeOfPost"
              render={({ field }) => (
                <Select
                  errorMessage={errors.typeOfPost?.message}
                  isInvalid={!!errors.typeOfPost}
                  placeholder="Select type of post"
                  radius="sm"
                  selectedKeys={field.value ? [field.value] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const selectedKey =
                      keys === "all" ? null : (keys.currentKey ?? null);

                    field.onChange(selectedKey ? String(selectedKey) : "");
                  }}
                >
                  {typeOfPostOptions.map((option) => (
                    <SelectItem key={option}>{option}</SelectItem>
                  ))}
                </Select>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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
                      const selectedKey =
                        keys === "all" ? null : (keys.currentKey ?? null);

                      field.onChange(selectedKey ? String(selectedKey) : "");
                    }}
                  >
                    {statusOptions.map((option) => (
                      <SelectItem key={option}>{option}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
            <div>
              <p className={labelClassName}>Custom Values</p>
              <Select
                aria-label="Select dynamic values source"
                placeholder="Select source"
                radius="sm"
                selectedKeys={
                  dynamicValuesSourceFilter ? [dynamicValuesSourceFilter] : []
                }
                size="sm"
                onSelectionChange={(keys) => {
                  const selectedKey =
                    keys === "all" ? null : (keys.currentKey ?? null);

                  setDynamicValuesSourceFilter(
                    selectedKey ? String(selectedKey) : "all",
                  );
                }}
              >
                {dynamicValueSourceFilterOptions.map((option) => (
                  <SelectItem key={option}>
                    {option === "all" ? "All Sources" : option}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <p className={labelClassName}>Max Character</p>
              <Controller
                control={control}
                name="maxCharacter"
                render={({ field }) => (
                  <Input
                    errorMessage={errors.maxCharacter?.message}
                    isInvalid={!!errors.maxCharacter}
                    min={1}
                    placeholder="Enter max character"
                    radius="sm"
                    size="sm"
                    type="number"
                    value={field.value}
                    onBlur={field.onBlur}
                    onValueChange={(value) => {
                      const normalizedValue = value.replace(/\D/g, "");

                      field.onChange(normalizedValue);
                    }}
                  />
                )}
              />
            </div>
          </div>

          <div>
            <p className={labelClassName}>Mapped Keys</p>
            <div className="rounded-xl border border-default-200 bg-default-100 p-3">
              <DynamicValuePillsPicker
                items={customValuesForSelectedSource}
                pillsContainerClassName="max-h-44 overflow-y-auto rounded-lg bg-default-100 p-1"
                selectedSourceFilter={dynamicValuesSourceFilter}
                showSourceSelect={false}
                sourceFilterOptions={dynamicValueSourceFilterOptions}
                onSourceFilterChange={setDynamicValuesSourceFilter}
                onTokenClick={handleCustomValueInsert}
              />
            </div>
          </div>

          <div>
            <p className={labelClassName}>Prompt</p>
            <div className="rounded-2xl border border-default-200 bg-[#F9FAFB] p-1">
              <Controller
                control={control}
                name="prompt"
                render={({ field }) => (
                  <Textarea
                    ref={promptRef}
                    classNames={{
                      input: "text-sm leading-7 text-[#111827]",
                      inputWrapper:
                        "border-none bg-transparent shadow-none data-[hover=true]:bg-transparent",
                    }}
                    errorMessage={errors.prompt?.message}
                    isInvalid={!!errors.prompt}
                    maxRows={20}
                    minRows={18}
                    radius="lg"
                    value={field.value}
                    onBlur={field.onBlur}
                    onClick={updatePromptSelection}
                    onKeyUp={updatePromptSelection}
                    onSelect={updatePromptSelection}
                    onValueChange={(value) => {
                      field.onChange(value);
                      clearErrors("prompt");
                    }}
                  />
                )}
              />
              <div className="flex justify-end px-3 pb-2 text-xs text-default-400">
                {promptValue.length}/{watch("maxCharacter") || "1500"}
              </div>
            </div>
          </div>

          <div>
            <p className={labelClassName}>Attachments</p>
            <div className="space-y-3">
              <input
                ref={attachmentInputRef}
                className="hidden"
                type="file"
                onChange={handleAttachmentChange}
              />
              <div className="flex gap-3">
                <Input
                  isReadOnly
                  className="flex-1"
                  placeholder="Add PDF, Document, etc"
                  radius="sm"
                  size="sm"
                  startContent={
                    <Paperclip className="text-default-400" size={16} />
                  }
                  value={selectedAttachment?.name ?? ""}
                  onClick={openAttachmentPicker}
                  onFocus={openAttachmentPicker}
                />
                <Button
                  className="bg-primary px-5 text-white"
                  isDisabled={!selectedAttachment}
                  radius="sm"
                  startContent={<Plus size={16} />}
                  onPress={handleAddAttachment}
                >
                  Add
                </Button>
              </div>

              {attachments.map((attachment, index) => (
                <div
                  key={`${attachment.id}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-default-200 px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-[#EEF2FF] p-2 text-[#6D4AFF]">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1F2937]">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-default-400">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    isIconOnly
                    className="text-danger"
                    radius="full"
                    variant="light"
                    onPress={() => handleDeleteAttachment(index)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className={labelClassName}>Client Name</p>
            <div className="flex gap-3">
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <Select
                    className="flex-1"
                    errorMessage={errors.clientId?.message}
                    isInvalid={!!errors.clientId}
                    placeholder="Select client name"
                    radius="sm"
                    selectedKeys={field.value ? [field.value] : []}
                    onSelectionChange={(keys) => {
                      const selectedKey =
                        keys === "all" ? null : (keys.currentKey ?? null);

                      field.onChange(selectedKey ? String(selectedKey) : "");
                    }}
                  >
                    {clientOptions.map((option) => (
                      <SelectItem key={option.id}>{option.name}</SelectItem>
                    ))}
                  </Select>
                )}
              />
              <Button className="bg-primary text-white" radius="sm">
                Test
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-default-200 shadow-sm">
        <CardHeader className="border-b border-default-200 px-4 py-4">
          <h2 className="font-semibold text-[#111827]">Live Preview</h2>
        </CardHeader>
        <CardBody className="px-4 py-4">
          <div className="flex min-h-[640px] items-center justify-center rounded-[20px] border border-dashed border-default-300 bg-[#FAFAFA] px-8 text-center">
            <div>
              <p className="text-base font-semibold text-[#4B5563]">
                Preview Generated
              </p>
              <p className="mt-2 text-sm text-default-400">
                Preview of generated content will appear here once you enter a
                dynamic prompt and select a client.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
