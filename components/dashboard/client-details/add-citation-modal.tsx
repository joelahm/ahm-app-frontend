"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
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
import { CheckCircle2, Eye, RotateCw, X } from "lucide-react";

const citationStatusOptions = [
  "Not Synced",
  "Live Citation",
  "Pending",
  "Rejected",
  "In Review",
] as const;

const addCitationSchema = yup.object({
  notes: yup.string().default(""),
  password: yup.string().default(""),
  profileUrl: yup
    .string()
    .url("Enter a valid profile URL")
    .required("Link to profile is required"),
  status: yup
    .string()
    .oneOf(citationStatusOptions)
    .required("Status is required"),
  username: yup.string().default(""),
});

export type AddCitationFormValues = yup.InferType<typeof addCitationSchema>;

interface AddCitationModalProps {
  citationDetails?: {
    address?: string | null;
    businessName?: string | null;
    phone?: string | null;
    zipCode?: string | null;
  };
  initialValues?: Partial<AddCitationFormValues>;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit?: (payload: AddCitationFormValues) => void | Promise<void>;
}

type CitationComparisonItem = {
  id: string;
  label: string;
  status: "Match" | "Incorrect" | "Not Synced";
  value: string;
};

const labelClassName = "mb-1.5 block text-sm text-[#4B5563]";

const getDetailBadgeClassName = (status: CitationComparisonItem["status"]) =>
  status === "Match"
    ? "bg-[#DCFCE7] text-[#16A34A]"
    : status === "Not Synced"
      ? "bg-[#EEF2FF] text-[#4338CA]"
      : "bg-[#FEE2E2] text-[#EF4444]";

export const AddCitationModal = ({
  citationDetails,
  initialValues,
  isOpen,
  onOpenChange,
  onSubmit,
}: AddCitationModalProps) => {
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const {
    control,
    handleSubmit,
    clearErrors,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddCitationFormValues>({
    defaultValues: {
      notes: "",
      password: "",
      profileUrl: "",
      status: "Not Synced",
      username: "",
    },
    mode: "onBlur",
  });
  const comparisonItems = useMemo(
    () => [
      {
        id: "business-name",
        label: "Business Name",
        status: "Not Synced" as const,
        value: citationDetails?.businessName?.trim() || "-",
      },
      {
        id: "address",
        label: "Address",
        status: "Not Synced" as const,
        value: citationDetails?.address?.trim() || "-",
      },
      {
        id: "phone",
        label: "Phone",
        status: "Not Synced" as const,
        value: citationDetails?.phone?.trim() || "-",
      },
      {
        id: "zip-code",
        label: "Zip Code",
        status: "Not Synced" as const,
        value: citationDetails?.zipCode?.trim() || "-",
      },
    ],
    [citationDetails],
  );
  const profileUrlValue = watch("profileUrl");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset({
      notes: initialValues?.notes ?? "",
      password: initialValues?.password ?? "",
      profileUrl: initialValues?.profileUrl ?? "",
      status: initialValues?.status ?? "Not Synced",
      username: initialValues?.username ?? "",
    });
    clearErrors();
    setSubmitError("");
    setShowPassword(false);
  }, [clearErrors, initialValues, isOpen, reset]);

  const closeModal = () => {
    onOpenChange(false);
    reset({
      notes: "",
      password: "",
      profileUrl: "",
      status: "Not Synced",
      username: "",
    });
    clearErrors();
    setSubmitError("");
    setShowPassword(false);
  };

  const submitCitation = async (values: AddCitationFormValues) => {
    clearErrors();
    setSubmitError("");

    try {
      const validatedValues = await addCitationSchema.validate(values, {
        abortEarly: false,
      });

      await onSubmit?.(validatedValues);
      closeModal();
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof AddCitationFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      setSubmitError(
        error instanceof Error ? error.message : "Failed to save citation.",
      );
    }
  };

  const handleSyncProfile = async () => {
    clearErrors("profileUrl");
    setSubmitError("");

    try {
      const validatedProfileUrl = await yup
        .string()
        .url("Enter a valid profile URL")
        .required("Link to profile is required")
        .validate(profileUrlValue);

      setIsSyncingProfile(true);
      setValue("profileUrl", validatedProfileUrl.trim(), {
        shouldDirty: true,
        shouldValidate: true,
      });

      await new Promise((resolve) => {
        window.setTimeout(resolve, 450);
      });
    } catch (error) {
      const message =
        error instanceof yup.ValidationError
          ? error.message
          : "Unable to sync profile.";

      setError("profileUrl", {
        message,
        type: "manual",
      });
    } finally {
      setIsSyncingProfile(false);
    }
  };

  const handleViewProfile = async () => {
    clearErrors("profileUrl");
    setSubmitError("");

    try {
      const validatedProfileUrl = await yup
        .string()
        .url("Enter a valid profile URL")
        .required("Link to profile is required")
        .validate(profileUrlValue);

      window.open(validatedProfileUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message =
        error instanceof yup.ValidationError
          ? error.message
          : "Unable to open profile URL.";

      setError("profileUrl", {
        message,
        type: "manual",
      });
    }
  };

  return (
    <Modal
      hideCloseButton
      isDismissable={false}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="5xl"
      onOpenChange={onOpenChange}
    >
      <ModalContent className="max-h-[88vh] overflow-hidden">
        <ModalHeader className="flex items-center justify-between border-b border-default-200">
          <div className="flex items-center gap-3">
            <h2 className="text-[18px] font-semibold text-[#111827]">
              Add Citation
            </h2>
          </div>
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
        <ModalBody className="max-h-[calc(88vh-148px)] space-y-6 overflow-y-auto py-5">
          {submitError ? (
            <p className="text-sm text-danger">{submitError}</p>
          ) : null}

          <div className="space-y-3">
            <h3 className="text-[18px] font-semibold text-[#111827]">
              Citation Status
            </h3>
            <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
              <div>
                <p className={labelClassName}>Status</p>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      disallowEmptySelection
                      errorMessage={errors.status?.message}
                      isInvalid={!!errors.status}
                      radius="sm"
                      selectedKeys={field.value ? [field.value] : []}
                      size="lg"
                      onSelectionChange={(keys) => {
                        const selected =
                          Array.from(keys as Set<string>)[0] ?? "";

                        field.onChange(selected);
                      }}
                    >
                      {citationStatusOptions.map((option) => (
                        <SelectItem key={option}>{option}</SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>
              <div>
                <p className={labelClassName}>Link to Profile</p>
                <Controller
                  control={control}
                  name="profileUrl"
                  render={({ field }) => (
                    <Input
                      endContent={
                        <div className="flex items-center gap-2 pr-1">
                          <button
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#EEF2FF] text-[#1E3A8A]"
                            disabled={isSyncingProfile}
                            type="button"
                            onClick={() => {
                              void handleSyncProfile();
                            }}
                          >
                            <RotateCw
                              className={isSyncingProfile ? "animate-spin" : ""}
                              size={16}
                            />
                          </button>
                          <button
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#EEF2FF] text-[#1E3A8A]"
                            type="button"
                            onClick={() => {
                              void handleViewProfile();
                            }}
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      }
                      errorMessage={errors.profileUrl?.message}
                      isInvalid={!!errors.profileUrl}
                      radius="sm"
                      size="lg"
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[18px] font-semibold text-[#111827]">
              Citation Details
            </h3>
            <div className="overflow-hidden rounded-[22px] border border-default-200 bg-white">
              <div className="grid gap-4 bg-[#F9FAFB] px-5 py-4 text-sm font-semibold text-[#374151] md:grid-cols-4">
                {comparisonItems.map((item) => (
                  <div key={`head-${item.id}`}>{item.label}</div>
                ))}
              </div>
              <div className="grid gap-4 px-5 py-5 md:grid-cols-4">
                {comparisonItems.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <p className="text-[15px] font-medium text-[#111827]">
                      {item.value}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getDetailBadgeClassName(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[18px] font-semibold text-[#111827]">Access</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className={labelClassName}>User Name</p>
                <Controller
                  control={control}
                  name="username"
                  render={({ field }) => (
                    <Input
                      radius="sm"
                      size="lg"
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div>
                <p className={labelClassName}>Password</p>
                <Controller
                  control={control}
                  name="password"
                  render={({ field }) => (
                    <Input
                      endContent={
                        <button
                          className="pr-1 text-default-500"
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                        >
                          <Eye size={18} />
                        </button>
                      }
                      radius="sm"
                      size="lg"
                      type={showPassword ? "text" : "password"}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
            <div>
              <p className={labelClassName}>Notes</p>
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <Textarea
                    minRows={6}
                    radius="sm"
                    size="lg"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="border-t border-default-200">
          <div className="flex w-full items-center justify-end gap-4">
            <Button
              className="min-w-48 bg-[#022279] text-white"
              isLoading={isSubmitting}
              radius="sm"
              startContent={
                !isSubmitting ? <CheckCircle2 size={16} /> : undefined
              }
              onPress={() => {
                void handleSubmit(submitCitation)();
              }}
            >
              Save
            </Button>
            <Button
              className="min-w-48"
              radius="sm"
              variant="bordered"
              onPress={closeModal}
            >
              Cancel
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
