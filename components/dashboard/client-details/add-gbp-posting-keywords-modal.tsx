"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Trash2, X } from "lucide-react";
import * as yup from "yup";

import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import {
  keywordResearchApi,
  type KeywordResearchLanguageOption,
} from "@/apis/keyword-research";
import { useAuth } from "@/components/auth/auth-context";
import { useAppToast } from "@/hooks/use-app-toast";

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
] as const;

const POST_TYPE_OPTIONS = ["Update", "Event", "Offer"] as const;

type GbpPostingKeywordItem = {
  contentType: string;
  keyword: string;
  numberOfPosts: number;
};

const schema = yup.object({
  audience: yup.string().trim().default(""),
  items: yup
    .array()
    .of(
      yup.object({
        contentType: yup.string().trim().required("Content type is required."),
        keyword: yup.string().trim().required("Keyword is required."),
        numberOfPosts: yup
          .number()
          .integer()
          .min(1, "Number of posts must be at least 1")
          .required(),
      }),
    )
    .min(1, "Add at least one keyword.")
    .required(),
  keywords: yup
    .string()
    .trim()
    .required("Keywords are required")
    .test("keywords-lines", "Enter at least one keyword per line.", (value) =>
      Boolean(
        value
          ?.split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean).length,
      ),
    ),
  language: yup.string().trim().required("Language is required"),
});

const stepOneSchema = yup.object({
  audience: yup.string().trim().default(""),
  keywords: yup
    .string()
    .trim()
    .required("Keywords are required")
    .test("keywords-lines", "Enter at least one keyword per line.", (value) =>
      Boolean(
        value
          ?.split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean).length,
      ),
    ),
  language: yup.string().trim().required("Language is required"),
});

type FormValues = yup.InferType<typeof schema>;

interface AddGbpPostingKeywordsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    audience: string;
    languageCode: string;
    language: string;
    items: GbpPostingKeywordItem[];
  }) => void | Promise<void>;
}

export const AddGbpPostingKeywordsModal = ({
  isOpen,
  onOpenChange,
  onSubmit,
}: AddGbpPostingKeywordsModalProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [languageOptions, setLanguageOptions] = useState<
    KeywordResearchLanguageOption[]
  >([
    {
      key: "en",
      label: "English",
      value: "en",
    },
  ]);
  const {
    control,
    clearErrors,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      audience: "",
      items: [],
      keywords: "",
      language: "en",
    },
  });

  const { fields, remove, replace, update } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const rows = useMemo(
    () =>
      fields.map((field, index) => ({
        ...field,
        contentType: watchedItems?.[index]?.contentType ?? "",
        keyword: watchedItems?.[index]?.keyword ?? "",
        numberOfPosts: watchedItems?.[index]?.numberOfPosts ?? 1,
        rowIndex: index,
      })),
    [fields, watchedItems],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset({
      audience: "",
      items: [],
      keywords: "",
      language: "en",
    });
    setActiveStep(1);
    clearErrors();
  }, [clearErrors, isOpen, reset]);

  useEffect(() => {
    if (!isOpen || !session?.accessToken) {
      return;
    }

    let isMounted = true;

    const loadLanguages = async () => {
      try {
        setIsLoadingLanguages(true);
        const accessToken = await getValidAccessToken();
        const response = await keywordResearchApi.getLanguages(accessToken);

        if (!isMounted) {
          return;
        }

        const nextLanguages = response.languages.length
          ? response.languages
          : [
              {
                key: "en",
                label: "English",
                value: "en",
              },
            ];

        setLanguageOptions(nextLanguages);

        const defaultLanguage =
          nextLanguages.find((language) => language.value === "en") ??
          nextLanguages[0];

        if (defaultLanguage) {
          setValue("language", defaultLanguage.value);
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setLanguageOptions([
          {
            key: "en",
            label: "English",
            value: "en",
          },
        ]);
        setValue("language", "en");
      } finally {
        if (isMounted) {
          setIsLoadingLanguages(false);
        }
      }
    };

    void loadLanguages();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, isOpen, session?.accessToken, setValue]);

  const closeModal = () => {
    onOpenChange(false);
  };

  const handleNext = handleSubmit(async (values) => {
    clearErrors();

    try {
      const validated = await stepOneSchema.validate(values, {
        abortEarly: false,
      });
      const parsedKeywords = validated.keywords
        .split(/\r?\n/)
        .map((keyword) => keyword.trim())
        .filter(Boolean);

      replace(
        parsedKeywords.map((keyword) => ({
          contentType: "Update",
          keyword,
          numberOfPosts: 1,
        })),
      );
      setActiveStep(2);
    } catch (error) {
      if (!(error instanceof yup.ValidationError)) {
        toast.danger("Failed to proceed.", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });

        return;
      }

      error.inner.forEach((issue) => {
        if (!issue.path) {
          return;
        }

        setError(issue.path as keyof FormValues, {
          message: issue.message,
          type: "manual",
        });
      });
    }
  });

  const handleGenerate = handleSubmit(async (values) => {
    clearErrors();

    try {
      const validated = await schema.validate(values, { abortEarly: false });

      await onSubmit({
        audience: validated.audience?.trim() ?? "",
        languageCode: validated.language,
        language:
          languageOptions.find((option) => option.value === validated.language)
            ?.label ?? validated.language,
        items: validated.items.map((item) => ({
          contentType: item.contentType,
          keyword: item.keyword,
          numberOfPosts: item.numberOfPosts,
        })),
      });

      closeModal();
    } catch (error) {
      if (!(error instanceof yup.ValidationError)) {
        toast.danger("Failed to generate GBP posts.", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });

        return;
      }

      error.inner.forEach((issue) => {
        if (!issue.path) {
          return;
        }

        setError(issue.path as keyof FormValues, {
          message: issue.message,
          type: "manual",
        });
      });

      toast.warning("Please check the highlighted fields.");
    }
  });

  const stepTwoColumns = useMemo<
    DashboardDataTableColumn<(typeof rows)[number]>[]
  >(
    () => [
      {
        className: "bg-[#F9FAFB] text-[#111827]",
        key: "keyword",
        label: "Keyword",
        renderCell: (item) => (
          <span className="text-sm text-[#111827]">{item.keyword}</span>
        ),
      },
      {
        className: "bg-[#F9FAFB] text-[#111827]",
        key: "numberOfPosts",
        label: "Number of posts",
        renderCell: (item) => (
          <div className="flex w-[128px] items-center justify-between rounded-xl border border-default-300 px-3 py-1">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => {
                update(item.rowIndex, {
                  ...item,
                  numberOfPosts: Math.max(1, item.numberOfPosts - 1),
                });
              }}
            >
              -
            </Button>
            <span className="text-sm font-semibold">{item.numberOfPosts}</span>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => {
                update(item.rowIndex, {
                  ...item,
                  numberOfPosts: item.numberOfPosts + 1,
                });
              }}
            >
              +
            </Button>
          </div>
        ),
      },
      {
        className: "bg-[#F9FAFB] text-[#111827]",
        key: "contentType",
        label: "Content Type",
        renderCell: (item) => (
          <Controller
            control={control}
            name={`items.${item.rowIndex}.contentType`}
            render={({ field }) => (
              <Select
                disallowEmptySelection
                selectedKeys={field.value ? [field.value] : []}
                size="sm"
                onSelectionChange={(keys) => {
                  const selectedKey =
                    keys === "all" ? null : (keys.currentKey ?? null);

                  field.onChange(selectedKey ? String(selectedKey) : "");
                }}
              >
                {POST_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option}>{option}</SelectItem>
                ))}
              </Select>
            )}
          />
        ),
      },
      {
        className: "bg-[#F9FAFB] text-right text-[#111827]",
        key: "action",
        label: "Action",
        renderCell: (item) => (
          <div className="flex justify-end">
            <Button
              isIconOnly
              className="text-danger"
              radius="sm"
              size="sm"
              variant="light"
              onPress={() => {
                remove(item.rowIndex);
              }}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ),
      },
    ],
    [control, remove, update],
  );

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
            <X className="text-[#6B7280]" size={24} />
          </Button>
        </ModalHeader>
        <ModalBody className="space-y-4 px-6 py-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {stepCards.map((step) => {
              const isActive = step.key === activeStep;

              return (
                <div
                  key={step.key}
                  className={`rounded-md border p-3 ${
                    isActive
                      ? "border-[#022279] bg-[#EEF2FF]"
                      : "border-default-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold ${
                        isActive
                          ? "bg-[#022279] text-white"
                          : "bg-default-100 text-default-400"
                      }`}
                    >
                      {step.key}
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-semibold text-[#202223]">
                        {step.title}
                      </h3>
                      <p className="text-xs text-[#6B7280]">{step.subtitle}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {activeStep === 1 ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[#202223]">
                  Add Keywords
                </h3>
                <p className="text-sm text-[#6B7280]">One keyword per line.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                  control={control}
                  name="audience"
                  render={({ field }) => (
                    <Input
                      errorMessage={errors.audience?.message}
                      isInvalid={!!errors.audience}
                      label="Audience"
                      labelPlacement="outside"
                      placeholder="Enter Audience"
                      radius="sm"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="language"
                  render={({ field }) => (
                    <Select
                      disallowEmptySelection
                      errorMessage={errors.language?.message}
                      isDisabled={isLoadingLanguages}
                      isInvalid={!!errors.language}
                      isLoading={isLoadingLanguages}
                      label="Language"
                      labelPlacement="outside"
                      radius="sm"
                      selectedKeys={field.value ? [field.value] : []}
                      onSelectionChange={(keys) => {
                        const selectedKey =
                          keys === "all" ? null : (keys.currentKey ?? null);

                        field.onChange(selectedKey ? String(selectedKey) : "");
                      }}
                    >
                      {languageOptions.map((item) => (
                        <SelectItem key={item.value}>{item.label}</SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>

              <Controller
                control={control}
                name="keywords"
                render={({ field }) => (
                  <Textarea
                    errorMessage={errors.keywords?.message}
                    isInvalid={!!errors.keywords}
                    label="Keywords"
                    labelPlacement="outside"
                    minRows={8}
                    placeholder="Enter one keyword per line"
                    radius="sm"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />

              <ul className="list-disc space-y-1 pl-5 text-sm text-[#6B7280]">
                <li>Do not leave empty lines.</li>
                <li>Do not add symbols or any special characters.</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[#202223]">
                  Keywords &amp; Type of content
                </h3>
                <p className="text-sm text-[#6B7280]">
                  Confirm keywords and set content type
                </p>
              </div>

              <DashboardDataTable
                ariaLabel="GBP posting keywords table"
                columns={stepTwoColumns}
                getRowKey={(item) => item.id}
                rows={rows}
                title="Selected Keywords"
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter className="justify-between border-t border-default-200 px-6 py-4">
          {activeStep === 1 ? (
            <>
              <Button
                className="min-w-[210px]"
                radius="sm"
                variant="bordered"
                onPress={closeModal}
              >
                Cancel
              </Button>
              <Button
                className="min-w-[210px] bg-[#022279] text-white"
                isLoading={isSubmitting}
                radius="sm"
                onPress={() => {
                  void handleNext();
                }}
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button
                className="min-w-[210px]"
                radius="sm"
                variant="bordered"
                onPress={() => {
                  setActiveStep(1);
                }}
              >
                Prev
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  className="min-w-[210px] bg-[#022279] text-white"
                  isLoading={isSubmitting}
                  radius="sm"
                  onPress={() => {
                    void handleGenerate();
                  }}
                >
                  Generate Content
                </Button>
              </div>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
