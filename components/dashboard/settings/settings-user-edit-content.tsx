"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Alert } from "@heroui/alert";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { CloudUpload, Eye, EyeOff, Mail, UserCircle2 } from "lucide-react";

import { IntlPhoneInput } from "@/components/form/intl-phone-input";
import { usersApi } from "@/apis/users";
import { departmentOptions } from "@/components/form/department-options";
import { getCountryOptions } from "@/components/form/location-options";
import { useAuth } from "@/components/auth/auth-context";

const fieldLabel = "mb-1.5 block text-xs text-[#585763]";
const sectionCard = "rounded-xl border border-default-200 bg-white";

const settingsProfileSchema = yup.object({
  country: yup.string().required("Country is required"),
  currentPassword: yup.string().default(""),
  department: yup.string().required("Department is required"),
  email: yup
    .string()
    .email("Enter a valid email")
    .required("Email is required"),
  firstName: yup.string().required("First name is required"),
  lastName: yup.string().required("Last name is required"),
  newPassword: yup
    .string()
    .default("")
    .test(
      "new-password-min-length",
      "Password must be at least 8 characters",
      (value) => {
        const password = value?.trim() ?? "";

        if (!password) {
          return true;
        }

        return password.length >= 8;
      },
    )
    .test(
      "new-password-uppercase",
      "Password must contain at least 1 uppercase letter",
      (value) => {
        const password = value?.trim() ?? "";

        if (!password) {
          return true;
        }

        return /[A-Z]/.test(password);
      },
    )
    .test(
      "new-password-lowercase",
      "Password must contain at least 1 lowercase letter",
      (value) => {
        const password = value?.trim() ?? "";

        if (!password) {
          return true;
        }

        return /[a-z]/.test(password);
      },
    )
    .test(
      "new-password-number",
      "Password must contain at least 1 number",
      (value) => {
        const password = value?.trim() ?? "";

        if (!password) {
          return true;
        }

        return /[0-9]/.test(password);
      },
    )
    .test(
      "new-password-special",
      "Password must contain at least 1 special character",
      (value) => {
        const password = value?.trim() ?? "";

        if (!password) {
          return true;
        }

        return /[!@#$%^&*()_+\[\]{}|;:,.<>?]/.test(password);
      },
    ),
  phoneNumber: yup.string().required("Phone number is required"),
  confirmPassword: yup
    .string()
    .default("")
    .test("confirm-password-match", "Passwords do not match", function (value) {
      const newPassword = this.parent.newPassword?.trim() ?? "";
      const confirmPassword = value?.trim() ?? "";

      if (!newPassword && !confirmPassword) {
        return true;
      }

      return newPassword === confirmPassword;
    }),
  title: yup.string().required("Title is required"),
});

type SettingsProfileFormValues = yup.InferType<typeof settingsProfileSchema>;

interface SettingsUserEditContentProps {
  userId: string;
}

export const SettingsUserEditContent = ({
  userId,
}: SettingsUserEditContentProps) => {
  const { getValidAccessToken, session } = useAuth();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>(
    undefined,
  );
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [countrySearch, setCountrySearch] = useState("");
  const [memberId, setMemberId] = useState<string>("-");
  const [profileError, setProfileError] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [displayName, setDisplayName] = useState<string>("");

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

  const {
    control,
    clearErrors,
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SettingsProfileFormValues>({
    defaultValues: {
      country: "",
      currentPassword: "",
      department: "",
      email: "",
      firstName: "",
      lastName: "",
      newPassword: "",
      phoneNumber: "",
      confirmPassword: "",
      title: "",
    },
    mode: "onBlur",
  });

  const loadUserFromList = async (accessToken: string) => {
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const response = await usersApi.getUsers(accessToken, {
        limit: 100,
        page,
      });
      const matchedUser = (response.users ?? []).find(
        (candidate) => String(candidate.id) === String(userId),
      );

      if (matchedUser) {
        return {
          avatarUrl: matchedUser.avatarUrl ?? null,
          country: matchedUser.country ?? null,
          createdAt: matchedUser.createdAt,
          department: matchedUser.department ?? null,
          email: matchedUser.email,
          firstName: matchedUser.firstName ?? null,
          id: matchedUser.id,
          isActive: matchedUser.isActive,
          lastName: matchedUser.lastName ?? null,
          phoneNumber: matchedUser.phoneNumber ?? null,
          role: matchedUser.role,
          status: matchedUser.status,
          title: matchedUser.title ?? null,
          updatedAt: matchedUser.updatedAt,
        };
      }

      hasNext = Boolean(response.pagination?.hasNext);
      page += 1;
    }

    throw new Error("User not found.");
  };

  useEffect(() => {
    if (!session?.accessToken || !userId) {
      return;
    }

    let isMounted = true;

    const hydrateProfile = async () => {
      setProfileError("");

      try {
        const accessToken = await getValidAccessToken();
        const profile = await loadUserFromList(accessToken);

        if (!isMounted) {
          return;
        }

        const resolvedCountry = profile.country ?? "";
        const resolvedCountryLabel = countryOptions.find(
          (country) => country.label === resolvedCountry,
        )?.label;

        reset({
          confirmPassword: "",
          country: resolvedCountryLabel ?? resolvedCountry,
          currentPassword: "",
          department: profile.department ?? "",
          email: profile.email,
          firstName: profile.firstName ?? "",
          lastName: profile.lastName ?? "",
          newPassword: "",
          phoneNumber: profile.phoneNumber ?? "",
          title: profile.title ?? "",
        });

        setDisplayName(
          [profile.firstName, profile.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() || profile.email,
        );
        setCountrySearch(resolvedCountryLabel ?? resolvedCountry);
        setMemberId(String(profile.id));

        if (profile.avatarUrl) {
          const isAbsolute = /^https?:\/\//i.test(profile.avatarUrl);
          const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
          const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
          const normalizedPath = profile.avatarUrl.replace(/^\/+/, "");

          setAvatarUrl(
            isAbsolute || !normalizedBaseUrl
              ? profile.avatarUrl
              : `${normalizedBaseUrl}/${normalizedPath}`,
          );
        } else {
          setAvatarUrl(undefined);
        }

        setAvatarFile(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setProfileError(
          error instanceof Error ? error.message : "Failed to load profile.",
        );
      }
    };

    void hydrateProfile();

    return () => {
      isMounted = false;
    };
  }, [
    countryOptions,
    getValidAccessToken,
    reset,
    session?.accessToken,
    userId,
  ]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const onAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];

    if (!allowedTypes.includes(selectedFile.type)) {
      setAvatarError("Please upload a JPG, PNG, or GIF image.");
      event.target.value = "";

      return;
    }

    setAvatarError("");
    setAvatarFile(selectedFile);
    const previewUrl = URL.createObjectURL(selectedFile);

    setAvatarPreviewUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }

      return previewUrl;
    });
    event.target.value = "";
  };

  const onSubmit = async (values: SettingsProfileFormValues) => {
    clearErrors();
    setSubmitMessage("");
    setProfileError("");

    try {
      const validatedValues = await settingsProfileSchema.validate(values, {
        abortEarly: false,
      });

      if (!session?.accessToken) {
        throw new Error("Your session has expired. Please login again.");
      }

      const accessToken = await getValidAccessToken();

      const basicInformationPayload = {
        country: validatedValues.country,
        department: validatedValues.department,
        email: validatedValues.email,
        firstName: validatedValues.firstName,
        lastName: validatedValues.lastName,
        phoneNumber: validatedValues.phoneNumber,
        title: validatedValues.title,
      };
      const profilePayload = avatarFile
        ? (() => {
            const formData = new FormData();

            formData.append("country", basicInformationPayload.country);
            formData.append("department", basicInformationPayload.department);
            formData.append("email", basicInformationPayload.email);
            formData.append("firstName", basicInformationPayload.firstName);
            formData.append("lastName", basicInformationPayload.lastName);
            formData.append("phoneNumber", basicInformationPayload.phoneNumber);
            formData.append("title", basicInformationPayload.title);
            formData.append("avatar", avatarFile);

            return formData;
          })()
        : basicInformationPayload;

      await usersApi.updateUserById(accessToken, userId, profilePayload);

      const currentPassword = validatedValues.currentPassword.trim();
      const newPassword = validatedValues.newPassword.trim();
      const confirmPassword = validatedValues.confirmPassword.trim();
      const shouldChangePassword =
        !!currentPassword || !!newPassword || !!confirmPassword;

      if (shouldChangePassword) {
        await usersApi.updateUserPasswordById(accessToken, userId, {
          confirmPassword,
          currentPassword,
          newPassword,
        });
      }

      const refreshedProfile = await loadUserFromList(accessToken);
      const refreshedAvatarUrl = (() => {
        if (!refreshedProfile.avatarUrl) {
          return undefined;
        }

        if (/^https?:\/\//i.test(refreshedProfile.avatarUrl)) {
          return refreshedProfile.avatarUrl;
        }

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
        const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
        const normalizedPath = refreshedProfile.avatarUrl.replace(/^\/+/, "");

        return normalizedBaseUrl
          ? `${normalizedBaseUrl}/${normalizedPath}`
          : refreshedProfile.avatarUrl;
      })();

      setAvatarUrl(refreshedAvatarUrl);
      setAvatarPreviewUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }

        return undefined;
      });
      setAvatarFile(null);
      reset({
        ...validatedValues,
        confirmPassword: "",
        currentPassword: "",
        newPassword: "",
      });
      setSubmitMessage("User updated successfully.");
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof SettingsProfileFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      setProfileError(
        error instanceof Error ? error.message : "Failed to update profile.",
      );
    }
  };

  return (
    <form
      className="grid gap-4 xl:grid-cols-[1fr_320px]"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="space-y-4">
        <Card className={sectionCard} shadow="none">
          <CardHeader className="border-b border-default-200 px-4 py-3">
            <h2 className="font-semibold text-[#111827]">Basic Information</h2>
          </CardHeader>
          <CardBody className="space-y-3 px-4 py-4">
            {profileError ? (
              <Alert
                color="danger"
                description={profileError}
                title="Failed to update user"
                variant="flat"
              />
            ) : null}
            {submitMessage ? (
              <Alert
                color="success"
                description={submitMessage}
                title="User updated"
                variant="flat"
              />
            ) : null}
            <div className="flex items-center gap-2">
              <UserCircle2 className="text-[#0568C9]" size={16} />
              <p className="text-sm text-[#4B5563]">Member ID</p>
              <span className="text-sm font-semibold text-[#111827]">
                {memberId}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className={fieldLabel}>First Name *</p>
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field }) => (
                    <Input
                      errorMessage={errors.firstName?.message}
                      isInvalid={!!errors.firstName}
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
                <p className={fieldLabel}>Last Name *</p>
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field }) => (
                    <Input
                      errorMessage={errors.lastName?.message}
                      isInvalid={!!errors.lastName}
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
              <p className={fieldLabel}>Title *</p>
              <Controller
                control={control}
                name="title"
                render={({ field }) => (
                  <Input
                    errorMessage={errors.title?.message}
                    isInvalid={!!errors.title}
                    radius="sm"
                    size="sm"
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
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
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <Input
                      errorMessage={errors.email?.message}
                      isInvalid={!!errors.email}
                      radius="sm"
                      size="sm"
                      startContent={
                        <Mail className="text-default-400" size={14} />
                      }
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
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
                <p className={fieldLabel}>Department *</p>
                <Controller
                  control={control}
                  name="department"
                  render={({ field }) => (
                    <Select
                      errorMessage={errors.department?.message}
                      isInvalid={!!errors.department}
                      placeholder="Select department"
                      radius="sm"
                      selectedKeys={field.value ? [field.value] : []}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const first = Array.from(keys as Set<string>)[0] ?? "";

                        field.onChange(first);
                      }}
                    >
                      {departmentOptions.map((department) => (
                        <SelectItem key={department}>{department}</SelectItem>
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
            <div className="flex w-full items-center justify-between">
              <h2 className="font-semibold text-[#111827]">Change Password</h2>
              <Button
                radius="sm"
                size="sm"
                variant="light"
                onPress={() => router.push("/dashboard/settings")}
              >
                Back to users
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-3 px-4 py-4">
            <div>
              <p className={fieldLabel}>Current Password *</p>
              <Input
                {...register("currentPassword")}
                endContent={
                  <Button
                    isIconOnly
                    size="sm"
                    type="button"
                    variant="light"
                    onPress={() => {
                      setShowCurrentPassword((value) => !value);
                    }}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="text-default-400" size={14} />
                    ) : (
                      <Eye className="text-default-400" size={14} />
                    )}
                  </Button>
                }
                errorMessage={errors.currentPassword?.message}
                isInvalid={!!errors.currentPassword}
                radius="sm"
                size="sm"
                type={showCurrentPassword ? "text" : "password"}
              />
            </div>
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
                    {showNewPassword ? (
                      <EyeOff className="text-default-400" size={14} />
                    ) : (
                      <Eye className="text-default-400" size={14} />
                    )}
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
                      <EyeOff className="text-default-400" size={14} />
                    ) : (
                      <Eye className="text-default-400" size={14} />
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
      </div>

      <div>
        <Card className={sectionCard} shadow="none">
          <CardHeader className="border-b border-default-200 px-4 py-3">
            <h2 className="w-full text-center font-semibold text-[#111827]">
              Avatar
            </h2>
          </CardHeader>
          <CardBody className="space-y-4 px-4 py-4">
            <div className="flex justify-center">
              <Avatar
                className="w-20 h-20"
                name={displayName}
                src={avatarPreviewUrl ?? avatarUrl}
              />
            </div>
            <div className="rounded-xl border border-dashed border-default-300 p-6 text-center">
              <CloudUpload className="mx-auto mb-3 text-primary" size={30} />
              <p className="text-sm font-medium text-[#111827]">
                Drag a photo here
              </p>
              <p className="my-2 text-xs text-default-400">OR</p>
              <input
                ref={avatarInputRef}
                accept="image/jpeg,image/png,image/gif"
                className="hidden"
                type="file"
                onChange={onAvatarSelect}
              />
              <Button
                className="text-white"
                color="primary"
                radius="md"
                size="sm"
                type="button"
                onPress={() => {
                  avatarInputRef.current?.click();
                }}
              >
                Upload Photo
              </Button>
              {avatarError ? (
                <Alert
                  className="mt-2 text-left"
                  color="danger"
                  description={avatarError}
                  title="Avatar upload failed"
                  variant="flat"
                />
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          className="bg-primary text-white"
          isLoading={isSubmitting}
          radius="md"
          type="submit"
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
};
