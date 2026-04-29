"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import * as yup from "yup";
import { Trash2, X } from "lucide-react";

import { manusApi } from "@/apis/manus";
import { useAuth } from "@/components/auth/auth-context";
import { useAiHubPromptTemplate } from "@/hooks/use-ai-hub-prompt-template";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  buildAiPromptTemplateValues,
  resolveAiPromptTemplate,
} from "@/lib/ai-prompt-template";

const contentTypeOptions = [
  "Homepage",
  "Treatment Page",
  "Condition Page",
  "Blog Page",
  "Press Release",
];

const TITLE_GENERATION_MODEL = "claude-3-5-haiku-20241022";

const websiteContentSchema = yup.object({
  audience: yup.string().trim().default(""),
  enableContentClustering: yup.boolean().required(),
  keywords: yup
    .array()
    .of(
      yup.object({
        contentType: yup.string().trim().default(""),
        cpc: yup.number().nullable().default(null),
        id: yup.string().trim().required(),
        intent: yup.string().nullable().default(null),
        kd: yup.number().nullable().default(null),
        keyword: yup.string().trim().required(),
        searchVolume: yup.number().nullable().default(null),
        title: yup
          .string()
          .trim()
          .max(55, "Title must be 55 characters or fewer")
          .default(""),
      }),
    )
    .min(1, "At least one keyword is required")
    .required(),
  topic: yup.string().trim().default(""),
});

type WebsiteContentFormValues = yup.InferType<typeof websiteContentSchema>;
type WebsiteContentTableRow = WebsiteContentKeywordItem & {
  fieldKey: string;
  rowIndex: number;
};
export type { WebsiteContentFormValues };

export interface WebsiteContentKeywordItem {
  cpc: number | null;
  id: string;
  intent: string | null;
  kd: number | null;
  keyword: string;
  searchVolume: number | null;
}

interface WebsiteContentKeywordsModalProps {
  isOpen: boolean;
  keywords: WebsiteContentKeywordItem[];
  selectedClientId?: string;
  selectedLocation?: string;
  onPrevStep?: () => void;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (payload: WebsiteContentFormValues) => void | Promise<void>;
}

const formatMetric = (value: number | null) =>
  value === null ? "-" : new Intl.NumberFormat("en-US").format(value);

const buildDefaultValues = (
  keywords: WebsiteContentKeywordItem[],
): WebsiteContentFormValues => ({
  audience: "",
  enableContentClustering: false,
  keywords: keywords.map((item) => ({
    contentType: "",
    cpc: item.cpc,
    id: item.id,
    intent: item.intent,
    kd: item.kd,
    keyword: item.keyword,
    searchVolume: item.searchVolume,
    title: "",
  })),
  topic: "",
});

const stepCards = [
  {
    key: 1,
    subtitle: "Double check your keywords",
    title: "Add Keywords",
  },
  {
    key: 2,
    subtitle: "Confirm keywords and set content type",
    title: "Keywords & Type of content",
  },
  {
    key: 3,
    subtitle: "Finalise your titles",
    title: "Generate Content Titles",
  },
];

const sectionHeadingByStep = {
  2: {
    subtitle: "Confirm keywords and set content type",
    title: "Keywords & Type of content",
  },
  3: {
    subtitle: "Confirm content titles",
    title: "Generate Content Titles",
  },
} as const;

export const WebsiteContentKeywordsModal = ({
  isOpen,
  keywords,
  selectedClientId,
  selectedLocation,
  onPrevStep,
  onOpenChange,
  onSubmit,
}: WebsiteContentKeywordsModalProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [activeStep, setActiveStep] = useState<2 | 3>(2);
  const [generatingRowIndex, setGeneratingRowIndex] = useState<number | null>(
    null,
  );
  const isGeneratingTitleRef = useRef(false);
  const {
    control,
    clearErrors,
    formState: { isSubmitting },
    handleSubmit,
    reset,
    setError,
    watch,
  } = useForm<WebsiteContentFormValues>({
    defaultValues: buildDefaultValues(keywords),
  });

  const { fields, remove } = useFieldArray({
    control,
    name: "keywords",
  });

  const watchedKeywords = watch("keywords");
  const { clientDetails, promptTemplate: metaTitlePromptTemplate } =
    useAiHubPromptTemplate({
      accessToken: session?.accessToken,
      clientId: selectedClientId,
      isEnabled: isOpen,
      typeOfPost: "Meta Title",
    });
  const effectiveClientId = clientDetails?.id
    ? String(clientDetails.id)
    : selectedClientId;
  const tableRows = useMemo<WebsiteContentTableRow[]>(
    () =>
      fields.reduce<WebsiteContentTableRow[]>((rows, field, index) => {
        const keywordRow = watchedKeywords?.[index];

        if (!keywordRow) {
          return rows;
        }

        rows.push({
          ...keywordRow,
          fieldKey: field.id,
          rowIndex: index,
        });

        return rows;
      }, []),
    [fields, watchedKeywords],
  );
  const isGeneratingTitles = generatingRowIndex !== null;
  const showErrorToast = (message: string) => {
    toast.danger(message);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset(buildDefaultValues(keywords));
    setActiveStep(2);
    setGeneratingRowIndex(null);
    clearErrors();
  }, [clearErrors, isOpen, keywords, reset]);

  const closeModal = () => {
    setGeneratingRowIndex(null);
    onOpenChange(false);
  };

  const handleGenerateTitle = async (index: number) => {
    if (isGeneratingTitleRef.current) {
      return;
    }

    const keyword = watchedKeywords?.[index]?.keyword?.trim() ?? "";

    if (!keyword) {
      return;
    }

    const row = watchedKeywords?.[index];
    const currentContentType = row?.contentType?.trim() ?? "";

    if (!currentContentType) {
      setError(`keywords.${index}.contentType`, {
        message: "Content type is required before generating title.",
        type: "manual",
      });
      showErrorToast("Select content type before generating title.");

      return;
    }
    clearErrors(`keywords.${index}.contentType`);
    const topic = watch("topic")?.trim() ?? "";
    const audience = watch("audience")?.trim() ?? "";
    const inferredLocation =
      selectedLocation?.trim() ||
      clientDetails?.cityState?.trim() ||
      clientDetails?.country?.trim() ||
      "";
    const maxCharacters = "55";

    const promptTemplate = metaTitlePromptTemplate?.trim() ?? "";

    if (!promptTemplate) {
      showErrorToast(
        "Meta Title prompt template is not configured for this client in AI Hub.",
      );

      return;
    }

    let resolvedPrompt = "";

    try {
      resolvedPrompt = promptTemplate
        ? resolveAiPromptTemplate({
            template: promptTemplate,
            values: buildAiPromptTemplateValues({
              audience,
              brandName: clientDetails?.businessName?.trim() || "",
              businessName: clientDetails?.businessName?.trim() || "",
              clientDetails,
              contentTitle: title,
              contentType: currentContentType,
              intent: row?.intent?.trim() || "",
              keyword,
              location: inferredLocation,
              maxCharacter: maxCharacters,
              pageType: currentContentType,
              requireClient: true,
              searchVolume:
                typeof row?.searchVolume === "number"
                  ? String(row.searchVolume)
                  : "",
              topic,
              url: clientDetails?.website?.trim() || "",
            }),
          })
        : "";
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : "Client is required before generating title.",
      );

      return;
    }

    resolvedPrompt = resolvedPrompt.trim();
    if (!resolvedPrompt) {
      showErrorToast(
        "Resolved prompt is empty. Check your AI Hub template placeholders.",
      );

      return;
    }

    let generatedTitle = "";
    let generationFailed = false;

    try {
      if (!session?.accessToken) {
        throw new Error("Session is missing. Please sign in again.");
      }

      isGeneratingTitleRef.current = true;
      setGeneratingRowIndex(index);
      const accessToken = await getValidAccessToken();
      const response = await manusApi.generateText(accessToken, {
        clientId: effectiveClientId,
        maxCharacters: Number(maxCharacters),
        model: TITLE_GENERATION_MODEL,
        prompt: resolvedPrompt,
        provider: "ANTHROPIC",
      });

      generatedTitle = response.text.trim();
    } catch (error) {
      generationFailed = true;
      showErrorToast(
        error instanceof Error
          ? error.message
          : "Failed to generate title using Manus.",
      );
    } finally {
      isGeneratingTitleRef.current = false;
      setGeneratingRowIndex(null);
    }

    if (generationFailed) {
      return;
    }

    const title = generatedTitle.trim().slice(0, Number(maxCharacters));

    if (!title) {
      showErrorToast("Manus returned an empty title.");

      return;
    }
    const nextValues = [...(watch("keywords") ?? [])];

    nextValues[index] = {
      ...nextValues[index],
      title,
    };

    reset({
      ...watch(),
      keywords: nextValues,
    });
  };

  const handleRemoveKeyword = (index: number) => {
    remove(index);
  };

  const currentHeading = sectionHeadingByStep[activeStep];

  const submitFinal = handleSubmit(async (values) => {
    clearErrors();

    try {
      const validatedValues = await websiteContentSchema.validate(values, {
        abortEarly: false,
      });

      if (onSubmit) {
        await onSubmit(validatedValues);
      }

      closeModal();
    } catch (error) {
      if (!(error instanceof yup.ValidationError)) {
        showErrorToast(
          error instanceof Error
            ? error.message
            : "Failed to save website content keywords.",
        );

        return;
      }

      showErrorToast(error.inner[0]?.message || error.message);
      error.inner.forEach((issue) => {
        if (!issue.path) {
          return;
        }

        setError(issue.path as keyof WebsiteContentFormValues, {
          message: issue.message,
          type: "manual",
        });
      });
    }
  });

  const canGoNext = useMemo(() => fields.length > 0, [fields.length]);

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
        <ModalHeader className="flex items-center justify-between border-b border-default-200 px-6">
          <h2 className="text-lg font-semibold text-[#111827]">Keywords</h2>
          <Button
            isIconOnly
            radius="full"
            size="sm"
            variant="light"
            onPress={closeModal}
          >
            <X className="text-[#6B7280]" size={28} />
          </Button>
        </ModalHeader>

        <ModalBody className="space-y-2 px-6 py-6">
          {isGeneratingTitles ? (
            <div className="flex items-center gap-2 text-xs text-[#4B5563]">
              <Spinner size="sm" />
              <span>Generating title...</span>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            {stepCards.map((step) => {
              const isActive = step.key === activeStep;

              return (
                <div
                  key={step.key}
                  className={`rounded-lg border px-3 py-3 ${
                    isActive
                      ? "border-[#1E40AF] bg-[#EEF2FF]"
                      : "border-default-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-lg text-lg font-semibold ${
                        isActive
                          ? "bg-[#022279] text-white"
                          : "bg-[#F3F4F6] text-[#9CA3AF]"
                      }`}
                    >
                      {step.key}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">
                        {step.title}
                      </p>
                      <p className="mt-1 text-xs text-[#6B7280]">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#111827]">
                {currentHeading.title}
              </h3>
              <p className="mt-1 text-xs text-[#6B7280]">
                {currentHeading.subtitle}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-default-200">
            {activeStep === 3 ? (
              <div className="max-h-[280px] overflow-y-auto">
                <Table
                  removeWrapper
                  aria-label="Website content keywords titles"
                  classNames={{
                    table: "border-collapse border-spacing-0",
                    tbody:
                      "[&_tr]:border-b [&_tr]:border-default-200 [&_tr:nth-child(even)]:bg-[#FCFCFD]",
                    td: "px-4 py-3 text-xs text-[#111827]",
                    th: "!rounded-none bg-[#F9FAFB] px-4 py-4 text-xs font-medium uppercase tracking-[0.02em] text-[#111827]",
                  }}
                >
                  <TableHeader>
                    <TableColumn>Keyword</TableColumn>
                    <TableColumn>Search Volume</TableColumn>
                    <TableColumn>Intent</TableColumn>
                    <TableColumn>KD</TableColumn>
                    <TableColumn>Content Type</TableColumn>
                    <TableColumn>Title (Max 55 characters)</TableColumn>
                    <TableColumn>Action</TableColumn>
                    <TableColumn>Action</TableColumn>
                  </TableHeader>
                  <TableBody
                    emptyContent="No keywords selected."
                    items={tableRows}
                  >
                    {(item) => (
                      <TableRow key={item.fieldKey}>
                        <TableCell>{item.keyword}</TableCell>
                        <TableCell>{formatMetric(item.searchVolume)}</TableCell>
                        <TableCell>{item.intent ?? "-"}</TableCell>
                        <TableCell>{formatMetric(item.kd)}</TableCell>
                        <TableCell>
                          <Controller
                            control={control}
                            name={`keywords.${item.rowIndex}.contentType`}
                            render={({ field }) => (
                              <Select
                                aria-label={`Content type for ${item.keyword}`}
                                className="min-w-[160px]"
                                classNames={{
                                  trigger: "min-h-9 text-xs",
                                  value: "text-xs",
                                }}
                                items={contentTypeOptions.map((option) => ({
                                  label: option,
                                  value: option,
                                }))}
                                placeholder="Select Type"
                                selectedKeys={field.value ? [field.value] : []}
                                size="sm"
                                variant="bordered"
                                onSelectionChange={(keys) => {
                                  const [selectedKey] =
                                    keys === "all" ? [] : Array.from(keys);

                                  field.onChange(
                                    selectedKey ? String(selectedKey) : "",
                                  );
                                }}
                              >
                                {(option) => (
                                  <SelectItem key={option.value}>
                                    {option.label}
                                  </SelectItem>
                                )}
                              </Select>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            control={control}
                            name={`keywords.${item.rowIndex}.title`}
                            render={({ field }) => (
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                aria-label={`Title for ${item.keyword}`}
                                className="min-h-[58px] min-w-[220px] rounded-md border border-default-200 px-3 py-2 text-xs leading-5 outline-none transition-colors empty:before:text-default-400 empty:before:content-[attr(data-placeholder)] focus:border-primary"
                                data-placeholder="Enter title"
                                role="textbox"
                                tabIndex={0}
                                onBlur={field.onBlur}
                                onInput={(event) => {
                                  const element = event.currentTarget;
                                  const nextValue = element.textContent ?? "";
                                  const limitedValue = nextValue.slice(0, 55);

                                  if (nextValue !== limitedValue) {
                                    element.textContent = limitedValue;
                                  }

                                  field.onChange(limitedValue);
                                }}
                              >
                                {field.value ?? ""}
                              </div>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            className="h-9 min-w-[120px] text-xs"
                            isDisabled={isGeneratingTitles}
                            isLoading={isGeneratingTitles}
                            radius="md"
                            size="sm"
                            variant="bordered"
                            onPress={() =>
                              void handleGenerateTitle(item.rowIndex)
                            }
                          >
                            Generate Title
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            isIconOnly
                            aria-label={`Remove ${item.keyword}`}
                            className="h-9 min-w-9"
                            radius="md"
                            size="sm"
                            variant="bordered"
                            onPress={() => handleRemoveKeyword(item.rowIndex)}
                          >
                            <Trash2 className="text-danger" size={18} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="h-8" />
              </div>
            ) : (
              <div className="max-h-[280px] overflow-y-auto">
                <Table
                  removeWrapper
                  aria-label="Website content keywords"
                  classNames={{
                    table: "border-collapse border-spacing-0",
                    tbody:
                      "[&_tr]:border-b [&_tr]:border-default-200 [&_tr:nth-child(even)]:bg-[#FCFCFD]",
                    td: "px-4 py-3 text-xs text-[#111827]",
                    th: "!rounded-none bg-[#F9FAFB] px-4 py-4 text-xs font-medium uppercase tracking-[0.02em] text-[#111827]",
                  }}
                >
                  <TableHeader>
                    <TableColumn>Keyword</TableColumn>
                    <TableColumn>Search Volume</TableColumn>
                    <TableColumn>Intent</TableColumn>
                    <TableColumn>KD</TableColumn>
                    <TableColumn>Content Type</TableColumn>
                    <TableColumn>Action</TableColumn>
                  </TableHeader>
                  <TableBody
                    emptyContent="No keywords selected."
                    items={tableRows}
                  >
                    {(item) => (
                      <TableRow key={item.fieldKey}>
                        <TableCell>{item.keyword}</TableCell>
                        <TableCell>{formatMetric(item.searchVolume)}</TableCell>
                        <TableCell>{item.intent ?? "-"}</TableCell>
                        <TableCell>{formatMetric(item.kd)}</TableCell>
                        <TableCell>
                          <Controller
                            control={control}
                            name={`keywords.${item.rowIndex}.contentType`}
                            render={({ field }) => (
                              <Select
                                aria-label={`Content type for ${item.keyword}`}
                                className="min-w-[160px]"
                                classNames={{
                                  trigger: "min-h-9 text-xs",
                                  value: "text-xs",
                                }}
                                items={contentTypeOptions.map((option) => ({
                                  label: option,
                                  value: option,
                                }))}
                                placeholder="Select Type"
                                selectedKeys={field.value ? [field.value] : []}
                                size="sm"
                                variant="bordered"
                                onSelectionChange={(keys) => {
                                  const [selectedKey] =
                                    keys === "all" ? [] : Array.from(keys);

                                  field.onChange(
                                    selectedKey ? String(selectedKey) : "",
                                  );
                                }}
                              >
                                {(option) => (
                                  <SelectItem key={option.value}>
                                    {option.label}
                                  </SelectItem>
                                )}
                              </Select>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            isIconOnly
                            aria-label={`Remove ${item.keyword}`}
                            className="h-9 min-w-9"
                            radius="md"
                            size="sm"
                            variant="bordered"
                            onPress={() => handleRemoveKeyword(item.rowIndex)}
                          >
                            <Trash2 className="text-danger" size={18} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="h-8" />
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter className="justify-between px-6 pb-6 pt-0">
          <Button
            className="min-w-[210px] border border-default-300 text-[#111827]"
            radius="lg"
            variant="bordered"
            onPress={() => {
              if (activeStep === 2) {
                onPrevStep?.();

                return;
              }

              setActiveStep(2);
            }}
          >
            Prev
          </Button>

          <div className="flex items-center gap-4">
            {activeStep === 2 ? (
              <>
                <Button
                  className="min-w-[210px] bg-[#022279] text-white"
                  isDisabled={!canGoNext}
                  isLoading={isGeneratingTitles}
                  radius="lg"
                  onPress={() => {
                    setActiveStep(3);
                  }}
                >
                  Next
                </Button>
              </>
            ) : (
              <Button
                className="min-w-[210px] bg-[#022279] text-white"
                isDisabled={isGeneratingTitles}
                isLoading={isSubmitting}
                radius="lg"
                onPress={() => void submitFinal()}
              >
                Save
              </Button>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
