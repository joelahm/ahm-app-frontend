"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import * as yup from "yup";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Select, SelectItem } from "@heroui/select";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Mail,
} from "lucide-react";

import { IntlPhoneInput } from "@/components/form/intl-phone-input";
import { useAuth } from "@/components/auth/auth-context";
import { invitationsApi } from "@/apis/invitations";
import {
  getCountryOptions,
  getDateFormatOptions,
  getTimeZoneOptions,
} from "@/components/form/location-options";

const fieldLabel = "mb-1.5 block text-xs text-[#585763]";
const sectionCard = "rounded-xl border border-default-200 bg-white";

const registerSchema = yup.object({
  country: yup.string().required("Country is required"),
  dateFormat: yup.string().required("Date format is required"),
  email: yup
    .string()
    .email("Enter a valid email")
    .required("Email is required"),
  firstName: yup.string().required("First name is required"),
  lastName: yup.string().required("Last name is required"),
  newPassword: yup
    .string()
    .required("New password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .matches(/[a-z]/, "Password must contain at least 1 lowercase letter")
    .matches(/[0-9]/, "Password must contain at least 1 number")
    .matches(
      /[!@#$%^&*()_+\[\]{}|;:,.<>?]/,
      "Password must contain at least 1 special character",
    ),
  phoneNumber: yup.string().required("Phone number is required"),
  confirmPassword: yup
    .string()
    .required("Confirm password is required")
    .oneOf([yup.ref("newPassword")], "Passwords do not match")
    .min(8, "Confirm password must be at least 8 characters"),
  timeZone: yup.string().required("Time zone is required"),
  title: yup.string().required("Title is required"),
});

type RegisterFormValues = yup.InferType<typeof registerSchema>;

interface RegisterFormProps {
  defaultEmail?: string;
  isEmailDisabled?: boolean;
  inviteToken?: string;
}

export const RegisterForm = ({
  defaultEmail = "",
  isEmailDisabled = false,
  inviteToken = "",
}: RegisterFormProps) => {
  const router = useRouter();
  const { logout } = useAuth();
  const [countrySearch, setCountrySearch] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [timeZoneSearch, setTimeZoneSearch] = useState("");
  const countryOptions = useMemo(() => getCountryOptions(), []);
  const filteredCountryOptions = useMemo(() => {
    const normalizedQuery = countrySearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return countryOptions;
    }

    return countryOptions.filter((country) =>
      country.label.toLowerCase().includes(normalizedQuery),
    );
  }, [countryOptions, countrySearch]);
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);
  const dateFormatOptions = useMemo(() => getDateFormatOptions(), []);
  const filteredTimeZoneOptions = useMemo(() => {
    const normalizedQuery = timeZoneSearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return timeZoneOptions;
    }

    return timeZoneOptions.filter((timeZone) =>
      timeZone.label.toLowerCase().includes(normalizedQuery),
    );
  }, [timeZoneOptions, timeZoneSearch]);

  const {
    control,
    clearErrors,
    handleSubmit,
    register,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      country: "",
      dateFormat: "",
      email: defaultEmail,
      firstName: "",
      lastName: "",
      newPassword: "",
      phoneNumber: "",
      confirmPassword: "",
      timeZone: "",
      title: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (values: RegisterFormValues) => {
    clearErrors();
    setSubmitError("");

    try {
      const validatedValues = await registerSchema.validate(values, {
        abortEarly: false,
      });

      if (!inviteToken) {
        throw new Error("Invalid invitation. Please use your invite link.");
      }

      await invitationsApi.register({
        confirmPassword: validatedValues.confirmPassword,
        country: validatedValues.country,
        dateFormat: validatedValues.dateFormat,
        email: validatedValues.email,
        firstName: validatedValues.firstName,
        lastName: validatedValues.lastName,
        password: validatedValues.newPassword,
        phoneNumber: validatedValues.phoneNumber,
        timezone: validatedValues.timeZone,
        title: validatedValues.title,
        token: inviteToken,
      });

      await logout();
      router.replace("/login");
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof RegisterFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to complete registration.",
      );
    }
  };

  return (
    <form
      className="mx-auto w-full max-w-3xl space-y-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#111827]">
          Complete Your Registration
        </h1>
        <p className="text-sm text-default-600">
          Please complete all required fields below to finish setting up your
          account profile. This information helps us configure your workspace
          correctly and ensures your account permissions and preferences are
          applied properly.
        </p>
        {submitError ? (
          <p className="text-sm text-danger">{submitError}</p>
        ) : null}
      </div>

      <Card className={sectionCard} shadow="none">
        <CardHeader className="border-b border-default-200 px-4 py-3">
          <h2 className="font-semibold text-[#111827]">Basic Information</h2>
        </CardHeader>
        <CardBody className="space-y-3 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className={fieldLabel}>First Name *</p>
              <Input
                {...register("firstName")}
                errorMessage={errors.firstName?.message}
                isInvalid={!!errors.firstName}
                radius="sm"
                size="sm"
              />
            </div>
            <div>
              <p className={fieldLabel}>Last Name *</p>
              <Input
                {...register("lastName")}
                errorMessage={errors.lastName?.message}
                isInvalid={!!errors.lastName}
                radius="sm"
                size="sm"
              />
            </div>
          </div>

          <div>
            <p className={fieldLabel}>Title *</p>
            <Input
              {...register("title")}
              errorMessage={errors.title?.message}
              isInvalid={!!errors.title}
              radius="sm"
              size="sm"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className={fieldLabel}>Phone Number *</p>
              <Controller
                control={control}
                name="phoneNumber"
                render={({ field }) => (
                  <IntlPhoneInput
                    errorMessage={errors.phoneNumber?.message}
                    isInvalid={!!errors.phoneNumber}
                    placeholder="Your phone number"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
            <div>
              <p className={fieldLabel}>Email Address *</p>
              <Input
                {...register("email")}
                endContent={<CheckCircle2 className="text-success" size={14} />}
                errorMessage={errors.email?.message}
                isDisabled={isEmailDisabled}
                isInvalid={!!errors.email}
                radius="sm"
                size="sm"
                startContent={<Mail className="text-default-400" size={14} />}
              />
            </div>
          </div>

          <div>
            <p className={fieldLabel}>Country *</p>
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
                    countryOptions.find(
                      (country) => country.label === field.value,
                    )?.key ?? null
                  }
                  size="sm"
                  onInputChange={(value) => {
                    setCountrySearch(value);
                  }}
                  onSelectionChange={(key) => {
                    const selectedCountry = countryOptions.find(
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

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className={fieldLabel}>Time Zone *</p>
              <Controller
                control={control}
                name="timeZone"
                render={({ field }) => (
                  <Autocomplete
                    allowsCustomValue={false}
                    errorMessage={errors.timeZone?.message}
                    inputValue={timeZoneSearch}
                    isInvalid={!!errors.timeZone}
                    items={filteredTimeZoneOptions}
                    menuTrigger="focus"
                    placeholder="Select time zone"
                    radius="sm"
                    selectedKey={
                      timeZoneOptions.find(
                        (timeZone) => timeZone.key === field.value,
                      )?.key ?? null
                    }
                    size="sm"
                    startContent={
                      <Clock3 className="text-default-400" size={14} />
                    }
                    onInputChange={(value) => {
                      setTimeZoneSearch(value);
                    }}
                    onSelectionChange={(key) => {
                      const selectedTimeZone = timeZoneOptions.find(
                        (timeZone) => timeZone.key === key,
                      );

                      field.onChange(selectedTimeZone?.key ?? "");
                      setTimeZoneSearch(selectedTimeZone?.label ?? "");
                    }}
                  >
                    {(timeZone) => (
                      <AutocompleteItem key={timeZone.key}>
                        {timeZone.label}
                      </AutocompleteItem>
                    )}
                  </Autocomplete>
                )}
              />
            </div>
            <div>
              <p className={fieldLabel}>Date Format *</p>
              <Controller
                control={control}
                name="dateFormat"
                render={({ field }) => (
                  <Select
                    endContent={
                      <CalendarDays className="text-default-400" size={14} />
                    }
                    errorMessage={errors.dateFormat?.message}
                    isInvalid={!!errors.dateFormat}
                    placeholder="Select date format"
                    radius="sm"
                    selectedKeys={field.value ? [field.value] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const first = Array.from(keys as Set<string>)[0] ?? "";

                      field.onChange(first);
                    }}
                  >
                    {dateFormatOptions.map((format) => (
                      <SelectItem key={format.key}>{format.label}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className={sectionCard} shadow="none">
        <CardHeader className="border-b border-default-200 px-4 py-3">
          <h2 className="font-semibold text-[#111827]">Password</h2>
        </CardHeader>
        <CardBody className="space-y-3 px-4 py-4">
          <div>
            <p className={fieldLabel}>New Password *</p>
            <Input
              {...register("newPassword")}
              endContent={
                <Button
                  isIconOnly
                  size="sm"
                  type="button"
                  variant="light"
                  onPress={() => {
                    setShowNewPassword((value) => !value);
                  }}
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
              }
              errorMessage={errors.newPassword?.message}
              isInvalid={!!errors.newPassword}
              radius="sm"
              size="sm"
              type={showNewPassword ? "text" : "password"}
            />
          </div>
          <div>
            <p className={fieldLabel}>Confirm Password *</p>
            <Input
              {...register("confirmPassword")}
              endContent={
                <Button
                  isIconOnly
                  size="sm"
                  type="button"
                  variant="light"
                  onPress={() => {
                    setShowConfirmPassword((value) => !value);
                  }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={14} />
                  ) : (
                    <Eye size={14} />
                  )}
                </Button>
              }
              errorMessage={errors.confirmPassword?.message}
              isInvalid={!!errors.confirmPassword}
              radius="sm"
              size="sm"
              type={showConfirmPassword ? "text" : "password"}
            />
          </div>
        </CardBody>
      </Card>

      <div className="pt-2 flex justify-end">
        <Button
          className="bg-primary text-white"
          isLoading={isSubmitting}
          radius="md"
          type="submit"
        >
          Complete Registration
        </Button>
      </div>
    </form>
  );
};
