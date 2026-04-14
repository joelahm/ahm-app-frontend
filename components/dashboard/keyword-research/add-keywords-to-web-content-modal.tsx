"use client";

import type { ClientApiItem } from "@/apis/clients";

import { useEffect, useMemo, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";

const locationOptions = ["Website Content", "Local Rankings"];

const schema = yup.object({
  clientId: yup.string().trim().required("Client is required"),
  location: yup.string().trim().required("Location is required"),
});

type FormValues = yup.InferType<typeof schema>;

const labelClassName = "mb-2 block text-sm font-medium text-[#4B5563]";

interface AddKeywordsToWebContentModalProps {
  clients: ClientApiItem[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (payload: FormValues) => void | Promise<void>;
}

export const AddKeywordsToWebContentModal = ({
  clients,
  isOpen,
  onOpenChange,
  onSubmit,
}: AddKeywordsToWebContentModalProps) => {
  const [clientSearch, setClientSearch] = useState("");
  const [submitError, setSubmitError] = useState("");
  const {
    control,
    clearErrors,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      clientId: "",
      location: "Website Content",
    },
  });

  const clientOptions = useMemo(
    () =>
      clients.map((item) => ({
        id: String(item.id),
        label:
          item.businessName || item.clientName || `Client ${String(item.id)}`,
      })),
    [clients],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset({
      clientId: "",
      location: "Website Content",
    });
    setClientSearch("");
    setSubmitError("");
    clearErrors();
  }, [clearErrors, isOpen, reset]);

  const closeModal = () => {
    setSubmitError("");
    onOpenChange(false);
  };

  const submitForm = handleSubmit(async (values) => {
    setSubmitError("");
    clearErrors();

    try {
      const validatedValues = await schema.validate(values, {
        abortEarly: false,
      });

      if (onSubmit) {
        await onSubmit(validatedValues);
      }

      closeModal();
    } catch (error) {
      if (!(error instanceof yup.ValidationError)) {
        setSubmitError(
          error instanceof Error ? error.message : "Failed to add keywords.",
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
      size="lg"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between border-b border-default-200 px-6">
          <h2 className="text-lg font-semibold leading-none text-[#111827]">
            Add Keywords to web content
          </h2>
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

        <ModalBody className="space-y-2 px-6 py-4">
          {submitError ? (
            <p className="text-sm text-danger">{submitError}</p>
          ) : null}

          <div>
            <p className={labelClassName}>Add keyword list to client</p>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Autocomplete
                  allowsCustomValue={false}
                  aria-label="Choose client name"
                  classNames={{
                    base: "w-full min-h-[42px]",
                  }}
                  errorMessage={errors.clientId?.message}
                  inputValue={clientSearch}
                  isInvalid={!!errors.clientId}
                  items={clientOptions}
                  placeholder="choose client name"
                  selectedKey={field.value || null}
                  onInputChange={(value) => {
                    setClientSearch(value);
                    if (!value) {
                      field.onChange("");
                    }
                  }}
                  onSelectionChange={(key) => {
                    const selectedKey = key ? String(key) : "";
                    const selectedOption =
                      clientOptions.find((item) => item.id === selectedKey) ??
                      null;

                    field.onChange(selectedKey);
                    setClientSearch(selectedOption?.label ?? "");
                  }}
                >
                  {(item) => (
                    <AutocompleteItem key={item.id} textValue={item.label}>
                      {item.label}
                    </AutocompleteItem>
                  )}
                </Autocomplete>
              )}
            />
          </div>

          <div>
            <p className={labelClassName}>Location</p>
            <Controller
              control={control}
              name="location"
              render={({ field }) => (
                <Select
                  aria-label="Location"
                  errorMessage={errors.location?.message}
                  isInvalid={!!errors.location}
                  items={locationOptions.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  placeholder="Select location"
                  selectedKeys={field.value ? [field.value] : []}
                  onSelectionChange={(keys) => {
                    const [selectedKey] =
                      keys === "all" ? [] : Array.from(keys);

                    field.onChange(selectedKey ? String(selectedKey) : "");
                  }}
                >
                  {(item) => (
                    <SelectItem key={item.value}>{item.label}</SelectItem>
                  )}
                </Select>
              )}
            />
          </div>
        </ModalBody>

        <ModalFooter className="justify-between px-8 pb-8 pt-0">
          <Button
            className="w-full border border-default-300 text-[#111827]"
            variant="bordered"
            onPress={closeModal}
          >
            Cancel
          </Button>
          <Button
            className="w-full bg-[#022279] text-white"
            isLoading={isSubmitting}
            onPress={() => void submitForm()}
          >
            Add
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
