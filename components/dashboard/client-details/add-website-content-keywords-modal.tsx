"use client";

import { useEffect, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalFooter,
} from "@heroui/modal";
import { X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";

import {
  keywordResearchApi,
  type KeywordResearchCountryOption,
  type KeywordResearchLanguageOption,
} from "@/apis/keyword-research";
import { useAuth } from "@/components/auth/auth-context";

const DEFAULT_COUNTRY_OPTION: KeywordResearchCountryOption = {
  key: "GB",
  label: "United Kingdom",
  locationCode: 2826,
  value: "GB",
};

const DEFAULT_LANGUAGE_OPTION: KeywordResearchLanguageOption = {
  key: "en",
  label: "English",
  value: "en",
};

const stepCards = [
  { key: 1, subtitle: "Double check your keywords", title: "Add Keywords" },
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
] as const;

const schema = yup.object({
  audience: yup.string().trim().default(""),
  country: yup.string().trim().required("Country is required"),
  enableContentClustering: yup.boolean().required(),
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
  topic: yup.string().trim().default(""),
});

type FormValues = yup.InferType<typeof schema>;

export interface AddWebsiteContentKeywordsPayload {
  audience: string;
  country: string;
  countryIsoCode: string;
  enableContentClustering: boolean;
  keywords: string[];
  languageCode: string;
  language: string;
  locationCode?: number;
  topic: string;
}

interface AddWebsiteContentKeywordsModalProps {
  isOpen: boolean;
  onNext: (payload: AddWebsiteContentKeywordsPayload) => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
}

export const AddWebsiteContentKeywordsModal = ({
  isOpen,
  onNext,
  onOpenChange,
}: AddWebsiteContentKeywordsModalProps) => {
  const { getValidAccessToken, session } = useAuth();
  const [activeStep] = useState<1 | 2 | 3>(1);
  const [countryOptions, setCountryOptions] = useState<
    KeywordResearchCountryOption[]
  >([DEFAULT_COUNTRY_OPTION]);
  const [languageOptions, setLanguageOptions] = useState<
    KeywordResearchLanguageOption[]
  >([DEFAULT_LANGUAGE_OPTION]);
  const [countrySearch, setCountrySearch] = useState("");
  const [languageSearch, setLanguageSearch] = useState("");
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const {
    control,
    clearErrors,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      audience: "",
      country: "",
      enableContentClustering: false,
      keywords: "",
      language: "",
      topic: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset({
      audience: "",
      country: "",
      enableContentClustering: false,
      keywords: "",
      language: "",
      topic: "",
    });
    setCountrySearch("");
    setLanguageSearch("");
    setSubmitError("");
    clearErrors();
  }, [clearErrors, isOpen, reset]);

  useEffect(() => {
    if (!isOpen || !session?.accessToken) {
      return;
    }

    let isMounted = true;

    const loadOptions = async () => {
      try {
        setIsLoadingOptions(true);
        const accessToken = await getValidAccessToken();
        const [countriesResponse, languagesResponse] = await Promise.all([
          keywordResearchApi.getCountries(accessToken),
          keywordResearchApi.getLanguages(accessToken),
        ]);

        if (!isMounted) {
          return;
        }

        const resolvedCountries = countriesResponse.countries.length
          ? countriesResponse.countries
          : [DEFAULT_COUNTRY_OPTION];
        const resolvedLanguages = languagesResponse.languages.length
          ? languagesResponse.languages
          : [DEFAULT_LANGUAGE_OPTION];

        setCountryOptions(resolvedCountries);
        setLanguageOptions(resolvedLanguages);

        const defaultCountry =
          resolvedCountries.find((item) => item.value.toUpperCase() === "GB") ??
          resolvedCountries[0];
        const defaultLanguage =
          resolvedLanguages.find((item) => item.value === "en") ??
          resolvedLanguages[0];

        if (defaultCountry) {
          setValue("country", defaultCountry.label);
          setCountrySearch(defaultCountry.label);
        }

        if (defaultLanguage) {
          setValue("language", defaultLanguage.label);
          setLanguageSearch(defaultLanguage.label);
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setCountryOptions([DEFAULT_COUNTRY_OPTION]);
        setLanguageOptions([DEFAULT_LANGUAGE_OPTION]);
        setValue("country", DEFAULT_COUNTRY_OPTION.label);
        setCountrySearch(DEFAULT_COUNTRY_OPTION.label);
        setValue("language", DEFAULT_LANGUAGE_OPTION.label);
        setLanguageSearch(DEFAULT_LANGUAGE_OPTION.label);
        setSubmitError("");
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false);
        }
      }
    };

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, isOpen, session?.accessToken, setValue]);

  const closeModal = () => {
    setSubmitError("");
    onOpenChange(false);
  };

  const handleNext = handleSubmit(async (values) => {
    setSubmitError("");
    clearErrors();

    try {
      const validated = await schema.validate(values, { abortEarly: false });
      const parsedKeywords = validated.keywords
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);

      await onNext({
        audience: validated.audience?.trim() ?? "",
        country: validated.country,
        countryIsoCode:
          countryOptions.find((item) => item.label === validated.country)
            ?.value ??
          (validated.country === DEFAULT_COUNTRY_OPTION.label
            ? DEFAULT_COUNTRY_OPTION.value
            : ""),
        enableContentClustering: validated.enableContentClustering,
        keywords: parsedKeywords,
        languageCode:
          languageOptions.find((item) => item.label === validated.language)
            ?.value ??
          (validated.language === DEFAULT_LANGUAGE_OPTION.label
            ? DEFAULT_LANGUAGE_OPTION.value
            : DEFAULT_LANGUAGE_OPTION.value),
        language: validated.language,
        locationCode:
          countryOptions.find((item) => item.label === validated.country)
            ?.locationCode ??
          (validated.country === DEFAULT_COUNTRY_OPTION.label
            ? DEFAULT_COUNTRY_OPTION.locationCode
            : undefined),
        topic: validated.topic?.trim() ?? "",
      });
    } catch (error) {
      if (!(error instanceof yup.ValidationError)) {
        setSubmitError(
          error instanceof Error ? error.message : "Failed to proceed.",
        );

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
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
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
                      className={`flex h-10 w-10 items-center justify-center rounded-md text-lg font-semibold ${
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
                      <p className="text-xs text-[#6B7280]">{step.subtitle}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#111827]">
              Add Keywords
            </h3>
            <p className="text-xs text-[#6B7280]">One keyword per line.</p>
          </div>

          {submitError ? (
            <p className="text-sm text-danger">{submitError}</p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <Autocomplete
                  allowsCustomValue={false}
                  aria-label="Country"
                  errorMessage={errors.country?.message}
                  inputValue={countrySearch}
                  isDisabled={isLoadingOptions}
                  isInvalid={!!errors.country}
                  items={countryOptions}
                  label="Country"
                  labelPlacement="outside"
                  placeholder="Select country"
                  selectedKey={field.value || null}
                  onBlur={() => {
                    const selectedOption =
                      countryOptions.find(
                        (item) => item.label === field.value,
                      ) ?? null;

                    setCountrySearch(selectedOption?.label ?? "");
                  }}
                  onInputChange={(value) => {
                    setCountrySearch(value);
                    if (!value) {
                      field.onChange("");
                    }
                  }}
                  onSelectionChange={(key) => {
                    const selectedKey = key ? String(key) : "";
                    const selectedOption =
                      countryOptions.find(
                        (item) => item.label === selectedKey,
                      ) ?? null;

                    field.onChange(selectedKey);
                    setCountrySearch(selectedOption?.label ?? "");
                  }}
                >
                  {(item) => (
                    <AutocompleteItem key={item.label} textValue={item.label}>
                      {item.label}
                    </AutocompleteItem>
                  )}
                </Autocomplete>
              )}
            />

            <Controller
              control={control}
              name="language"
              render={({ field }) => (
                <Autocomplete
                  allowsCustomValue={false}
                  aria-label="Language"
                  errorMessage={errors.language?.message}
                  inputValue={languageSearch}
                  isDisabled={isLoadingOptions}
                  isInvalid={!!errors.language}
                  items={languageOptions}
                  label="Language"
                  labelPlacement="outside"
                  placeholder="Select language"
                  selectedKey={field.value || null}
                  onBlur={() => {
                    const selectedOption =
                      languageOptions.find(
                        (item) => item.label === field.value,
                      ) ?? null;

                    setLanguageSearch(selectedOption?.label ?? "");
                  }}
                  onInputChange={(value) => {
                    setLanguageSearch(value);
                    if (!value) {
                      field.onChange("");
                    }
                  }}
                  onSelectionChange={(key) => {
                    const selectedKey = key ? String(key) : "";
                    const selectedOption =
                      languageOptions.find(
                        (item) => item.label === selectedKey,
                      ) ?? null;

                    field.onChange(selectedKey);
                    setLanguageSearch(selectedOption?.label ?? "");
                  }}
                >
                  {(item) => (
                    <AutocompleteItem key={item.label} textValue={item.label}>
                      {item.label}
                    </AutocompleteItem>
                  )}
                </Autocomplete>
              )}
            />
          </div>

          <Controller
            control={control}
            name="keywords"
            render={({ field }) => (
              <Textarea
                aria-label="Keywords"
                errorMessage={errors.keywords?.message}
                isInvalid={!!errors.keywords}
                label="Keywords"
                labelPlacement="outside"
                minRows={8}
                placeholder="Enter keywords"
                value={field.value ?? ""}
                onValueChange={field.onChange}
              />
            )}
          />

          <ul className="list-disc space-y-1 pl-5 text-sm text-[#6B7280]">
            <li>Do not leave empty lines.</li>
            <li>Do not add symbols or any special characters.</li>
          </ul>
        </ModalBody>
        <ModalFooter className="border-t border-default-200">
          <div className="flex justify-between pt-2 w-full">
            <Button className="px-10" variant="bordered" onPress={closeModal}>
              Cancel
            </Button>
            <Button
              className="bg-[#022279] px-10 text-white"
              isDisabled={isLoadingOptions}
              isLoading={isSubmitting}
              onPress={() => {
                void handleNext();
              }}
            >
              {isSubmitting ? "Fetching..." : "Next"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
