"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
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
import { X } from "lucide-react";

const labelClassName = "mb-1.5 block text-sm text-[#4B5563]";

const citationTypeOptions = ["General Directory", "Medical Directory"];
const paymentOptions = ["Free", "Paid"];

const addSingleCitationSchema = yup.object({
  da: yup
    .string()
    .matches(/^\d+$/, "Domain Authority must be a number")
    .required("Domain Authority is required"),
  name: yup.string().trim().required("Name is required"),
  niche: yup.string().trim().required("Niche is required"),
  payment: yup.string().required("Payment is required"),
  type: yup.string().required("Type is required"),
  validationLink: yup.string().trim().required("Validation link is required"),
});

export type AddSingleCitationFormValues = yup.InferType<
  typeof addSingleCitationSchema
>;

interface AddSingleCitationModalProps {
  initialValues?: Partial<AddSingleCitationFormValues> | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: AddSingleCitationFormValues) => void | Promise<void>;
  submitLabel?: string;
  title?: string;
}

export const AddSingleCitationModal = ({
  initialValues,
  isOpen,
  onOpenChange,
  onSubmit,
  submitLabel = "Save",
  title = "Add Single Citation to Database",
}: AddSingleCitationModalProps) => {
  const [submitError, setSubmitError] = useState("");
  const {
    control,
    clearErrors,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
  } = useForm<AddSingleCitationFormValues>({
    defaultValues: {
      da: "99",
      name: "",
      niche: "",
      payment: "Free",
      type: "General Directory",
      validationLink: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset({
      da: initialValues?.da ?? "99",
      name: initialValues?.name ?? "",
      niche: initialValues?.niche ?? "",
      payment: initialValues?.payment ?? "Free",
      type: initialValues?.type ?? "General Directory",
      validationLink: initialValues?.validationLink ?? "",
    });
    setSubmitError("");
    clearErrors();
  }, [clearErrors, initialValues, isOpen, reset]);

  const closeModal = () => {
    onOpenChange(false);
    setSubmitError("");
    reset();
    clearErrors();
  };

  const submitCitation = async (values: AddSingleCitationFormValues) => {
    clearErrors();
    setSubmitError("");

    try {
      const validatedValues = await addSingleCitationSchema.validate(values, {
        abortEarly: false,
      });

      await onSubmit(validatedValues);
      closeModal();
    } catch (error) {
      if (!(error instanceof yup.ValidationError)) {
        setSubmitError(
          error instanceof Error ? error.message : "Failed to save citation.",
        );

        return;
      }

      error.inner.forEach((issue) => {
        if (!issue.path) {
          return;
        }

        setError(issue.path as keyof AddSingleCitationFormValues, {
          message: issue.message,
          type: "manual",
        });
      });
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
          <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
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
            <p className={labelClassName}>Name</p>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  errorMessage={errors.name?.message}
                  isInvalid={!!errors.name}
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
            <p className={labelClassName}>Type</p>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  errorMessage={errors.type?.message}
                  isInvalid={!!errors.type}
                  radius="sm"
                  selectedKeys={field.value ? [field.value] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const selectedKey =
                      keys === "all" ? null : (keys.currentKey ?? null);

                    field.onChange(selectedKey ? String(selectedKey) : "");
                  }}
                >
                  {citationTypeOptions.map((option) => (
                    <SelectItem key={option}>{option}</SelectItem>
                  ))}
                </Select>
              )}
            />
          </div>

          <div>
            <p className={labelClassName}>Niche</p>
            <Controller
              control={control}
              name="niche"
              render={({ field }) => (
                <Input
                  errorMessage={errors.niche?.message}
                  isInvalid={!!errors.niche}
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
            <p className={labelClassName}>Link Validation</p>
            <Controller
              control={control}
              name="validationLink"
              render={({ field }) => (
                <Input
                  errorMessage={errors.validationLink?.message}
                  isInvalid={!!errors.validationLink}
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
            <p className={labelClassName}>Domain Authority</p>
            <Controller
              control={control}
              name="da"
              render={({ field }) => (
                <Input
                  errorMessage={errors.da?.message}
                  isInvalid={!!errors.da}
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
            <p className={labelClassName}>Payment</p>
            <Controller
              control={control}
              name="payment"
              render={({ field }) => (
                <Select
                  errorMessage={errors.payment?.message}
                  isInvalid={!!errors.payment}
                  radius="sm"
                  selectedKeys={field.value ? [field.value] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const selectedKey =
                      keys === "all" ? null : (keys.currentKey ?? null);

                    field.onChange(selectedKey ? String(selectedKey) : "");
                  }}
                >
                  {paymentOptions.map((option) => (
                    <SelectItem key={option}>{option}</SelectItem>
                  ))}
                </Select>
              )}
            />
          </div>
        </ModalBody>

        <ModalFooter className="border-t border-default-200">
          <Button radius="sm" variant="bordered" onPress={closeModal}>
            Cancel
          </Button>
          <Button
            className="bg-primary px-8 text-white"
            isLoading={isSubmitting}
            radius="sm"
            onPress={() => {
              void handleSubmit(submitCitation)();
            }}
          >
            {submitLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
