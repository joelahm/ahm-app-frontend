"use client";

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
import { X } from "lucide-react";

import { IntlPhoneInput } from "@/components/form/intl-phone-input";
import { useAppToast } from "@/hooks/use-app-toast";

const addClientSchema = yup.object({
  businessName: yup.string().trim().required("Business name is required"),
  businessPhone: yup.string().trim().required("Business phone is required"),
  clientName: yup.string().trim().required("Client name is required"),
  niche: yup.string().required("Niche is required"),
  personalEmail: yup
    .string()
    .trim()
    .email("Enter a valid email")
    .required("Personal email is required"),
  personalPhone: yup.string().trim().default(""),
  profession: yup.string().trim().default(""),
  practiceEmail: yup
    .string()
    .trim()
    .email("Enter a valid email")
    .required("Business email is required"),
  website: yup
    .string()
    .trim()
    .url("Enter a valid URL")
    .required("Website is required"),
});

export type AddClientFormValues = yup.InferType<typeof addClientSchema>;

interface AddClientModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (payload: AddClientFormValues) => void | Promise<void>;
}

const inputLabel = "mb-1.5 block text-sm text-[#4B5563]";

const FieldLabel = ({
  children,
  required = false,
}: {
  children: string;
  required?: boolean;
}) => (
  <p className={inputLabel}>
    {children}
    {required ? <span className="ml-1 text-danger">*</span> : null}
  </p>
);

export const AddClientModal = ({
  isOpen,
  onOpenChange,
  onSubmit,
}: AddClientModalProps) => {
  const toast = useAppToast();
  const {
    control,
    clearErrors,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddClientFormValues>({
    defaultValues: {
      businessName: "",
      businessPhone: "",
      clientName: "",
      niche: "",
      personalEmail: "",
      personalPhone: "",
      profession: "",
      practiceEmail: "",
      website: "",
    },
    mode: "onBlur",
  });

  const submitClient = async (values: AddClientFormValues) => {
    clearErrors();

    try {
      const validatedValues = await addClientSchema.validate(values, {
        abortEarly: false,
      });

      if (onSubmit) {
        await onSubmit(validatedValues);
      }

      onOpenChange(false);
      reset();
      toast.success("Client added successfully.", {
        description: "The client profile has been created.",
      });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof AddClientFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      toast.danger("We couldn’t add this client yet.", {
        description:
          error instanceof Error
            ? error.message
            : "Please review the details and try again.",
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Modal
      hideCloseButton
      classNames={{
        base: "max-w-5xl",
      }}
      isDismissable={false}
      isOpen={isOpen}
      scrollBehavior="inside"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between border-b border-default-200">
          <h2 className="font-medium text-[#111827]">Client Information</h2>
          <Button
            isIconOnly
            radius="full"
            size="sm"
            variant="light"
            onPress={handleClose}
          >
            <X size={20} />
          </Button>
        </ModalHeader>

        <ModalBody className="py-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>Client Title</FieldLabel>
              <Controller
                control={control}
                name="profession"
                render={({ field }) => (
                  <Input
                    radius="sm"
                    size="sm"
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div>
              <FieldLabel required>Client Name</FieldLabel>
              <Controller
                control={control}
                name="clientName"
                render={({ field }) => (
                  <Input
                    errorMessage={errors.clientName?.message}
                    isInvalid={!!errors.clientName}
                    radius="sm"
                    size="sm"
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div>
              <FieldLabel required>Business Name</FieldLabel>
              <Controller
                control={control}
                name="businessName"
                render={({ field }) => (
                  <Input
                    errorMessage={errors.businessName?.message}
                    isInvalid={!!errors.businessName}
                    radius="sm"
                    size="sm"
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div>
              <FieldLabel required>Niche</FieldLabel>
              <Controller
                control={control}
                name="niche"
                render={({ field }) => (
                  <Input
                    errorMessage={errors.niche?.message}
                    isInvalid={!!errors.niche}
                    placeholder="Enter niche"
                    radius="sm"
                    size="sm"
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
            <div>
              <FieldLabel required>Personal Email Address</FieldLabel>
              <Controller
                control={control}
                name="personalEmail"
                render={({ field }) => (
                  <Input
                    errorMessage={errors.personalEmail?.message}
                    isInvalid={!!errors.personalEmail}
                    radius="sm"
                    size="sm"
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div>
              <FieldLabel required>Business Email Address</FieldLabel>
              <Controller
                control={control}
                name="practiceEmail"
                render={({ field }) => (
                  <Input
                    errorMessage={errors.practiceEmail?.message}
                    isInvalid={!!errors.practiceEmail}
                    radius="sm"
                    size="sm"
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div>
              <FieldLabel>Personal Phone Number</FieldLabel>
              <Controller
                control={control}
                name="personalPhone"
                render={({ field }) => (
                  <IntlPhoneInput
                    errorMessage={errors.personalPhone?.message}
                    isInvalid={!!errors.personalPhone}
                    placeholder="Personal phone number"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div>
              <FieldLabel required>Business Phone Number</FieldLabel>
              <Controller
                control={control}
                name="businessPhone"
                render={({ field }) => (
                  <IntlPhoneInput
                    errorMessage={errors.businessPhone?.message}
                    isInvalid={!!errors.businessPhone}
                    placeholder="Your phone number"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div>
              <FieldLabel required>Website</FieldLabel>
              <Controller
                control={control}
                name="website"
                render={({ field }) => (
                  <Input
                    errorMessage={errors.website?.message}
                    isInvalid={!!errors.website}
                    placeholder="https://www.example.com"
                    radius="sm"
                    size="sm"
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="border-t border-default-200">
          <Button radius="sm" variant="bordered" onPress={handleClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            isLoading={isSubmitting}
            radius="sm"
            onPress={() => {
              void handleSubmit(submitClient)();
            }}
          >
            Add Client
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
