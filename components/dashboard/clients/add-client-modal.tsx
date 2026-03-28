"use client";

import { useMemo, useState } from "react";
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
import { X } from "lucide-react";

import { useDropdownData } from "@/components/dashboard/client-details/dropdown-data";
import { IntlPhoneInput } from "@/components/form/intl-phone-input";
import { getCountryOptions } from "@/components/form/location-options";

const addClientSchema = yup.object({
  businessName: yup.string().default(""),
  businessPhone: yup.string().default(""),
  clientName: yup.string().default(""),
  country: yup.string().default(""),
  niche: yup.string().required("Niche is required"),
  personalEmail: yup.string().email("Enter a valid email").default(""),
  practiceEmail: yup.string().email("Enter a valid email").default(""),
  website: yup.string().url("Enter a valid URL").default(""),
});

export type AddClientFormValues = yup.InferType<typeof addClientSchema>;

interface AddClientModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (payload: AddClientFormValues) => void | Promise<void>;
}

const inputLabel = "mb-1.5 block text-sm text-[#4B5563]";

export const AddClientModal = ({
  isOpen,
  onOpenChange,
  onSubmit,
}: AddClientModalProps) => {
  const { niches } = useDropdownData();
  const countries = getCountryOptions();
  const [countrySearch, setCountrySearch] = useState("");
  const [submitError, setSubmitError] = useState("");
  const filteredCountryOptions = useMemo(() => {
    const normalizedQuery = countrySearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return countries;
    }

    return countries.filter((country) =>
      country.label.toLowerCase().includes(normalizedQuery),
    );
  }, [countries, countrySearch]);
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
      country: "",
      niche: "",
      personalEmail: "",
      practiceEmail: "",
      website: "",
    },
    mode: "onBlur",
  });

  const submitClient = async (values: AddClientFormValues) => {
    clearErrors();
    setSubmitError("");

    try {
      const validatedValues = await addClientSchema.validate(values, {
        abortEarly: false,
      });

      if (onSubmit) {
        await onSubmit(validatedValues);
      }

      onOpenChange(false);
      reset();
      setCountrySearch("");
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

      setSubmitError(
        error instanceof Error ? error.message : "Failed to add client.",
      );
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
    setCountrySearch("");
    setSubmitError("");
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

        <ModalBody className="space-y-4 py-5">
          {submitError ? (
            <p className="text-sm text-danger">{submitError}</p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className={inputLabel}>Client Name (For solo practitioner)</p>
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
              <p className={inputLabel}>
                Business Name (For medical clinic / group of practice)
              </p>
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
          </div>

          <div>
            <p className={inputLabel}>Niche *</p>
            <Controller
              control={control}
              name="niche"
              render={({ field }) => (
                <Select
                  errorMessage={errors.niche?.message}
                  isInvalid={!!errors.niche}
                  placeholder="Select niche"
                  radius="sm"
                  selectedKeys={field.value ? [field.value] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys as Set<string>)[0] ?? "";

                    field.onChange(selected);
                  }}
                >
                  {niches.map((option) => (
                    <SelectItem key={option.key}>{option.label}</SelectItem>
                  ))}
                </Select>
              )}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className={inputLabel}>Personal Email Address</p>
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
              <p className={inputLabel}>Practice Email Address</p>
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
              <p className={inputLabel}>Business Phone Number</p>
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
          </div>

          <div>
            <p className={inputLabel}>Website</p>
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

          <div>
            <p className={inputLabel}>Country</p>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <Autocomplete
                  allowsCustomValue={false}
                  errorMessage={errors.country?.message}
                  inputValue={countrySearch}
                  isInvalid={!!errors.country}
                  items={filteredCountryOptions}
                  menuTrigger="focus"
                  placeholder="Select country"
                  radius="sm"
                  selectedKey={
                    countries.find((country) => country.label === field.value)
                      ?.key ?? null
                  }
                  size="sm"
                  onInputChange={(value) => {
                    setCountrySearch(value);
                  }}
                  onSelectionChange={(key) => {
                    const selectedCountry = countries.find(
                      (country) => country.key === key,
                    );

                    field.onChange(selectedCountry?.label ?? "");
                    setCountrySearch(selectedCountry?.label ?? "");
                  }}
                >
                  {(country) => (
                    <AutocompleteItem key={country.key}>
                      {country.label}
                    </AutocompleteItem>
                  )}
                </Autocomplete>
              )}
            />
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
