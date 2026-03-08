"use client";

import type { ReactNode } from "react";

import Chart from "chart.js/auto";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import {
  Beaker,
  Briefcase,
  BriefcaseMedical,
  Copy,
  FileText,
  Globe,
  ListChecks,
  Pipette,
  Stethoscope,
  TestTubeDiagonal,
  Upload,
} from "lucide-react";

import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";
import { useDropdownData } from "@/components/dashboard/client-details/dropdown-data";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const sectionCard = "rounded-xl border border-default-200 bg-white";
const fieldLabel = "mb-1.5 block text-xs text-[#585763]";

const clientDetailsSchema = yup.object({
  clientName: yup.string().required("Client name is required"),
  businessName: yup.string().required("Business name is required"),
  niche: yup.string().required("Niche is required"),
  personalEmail: yup
    .string()
    .email("Enter a valid email")
    .required("Personal email is required"),
  practiceEmail: yup
    .string()
    .email("Enter a valid email")
    .required("Practice email is required"),
  businessPhone: yup.string().required("Business phone number is required"),
  website: yup
    .string()
    .url("Enter a valid URL")
    .required("Website is required"),
  country: yup.string().required("Country is required"),
  typeOfPractice: yup.string().required("Type of practice is required"),
  profession: yup.string().required("Profession is required"),
  addressLine1: yup.string().required("Address line 1 is required"),
  addressLine2: yup.string().default(""),
  cityState: yup.string().required("City/State is required"),
  visibleArea: yup
    .string()
    .required("1 Area You Want to Be Visible in is required"),
  postCode: yup.string().required("Post code is required"),
  gbpLink: yup.string().default(""),
  facebook: yup.string().default(""),
  instagram: yup.string().default(""),
  linkedin: yup.string().default(""),
  websiteLoginLink: yup.string().default(""),
  websiteUsername: yup.string().default(""),
  websitePassword: yup.string().default(""),
  googleAnalytics: yup.string().default(""),
  googleSearchConsole: yup.string().default(""),
});

type ClientDetailsFormValues = yup.InferType<typeof clientDetailsSchema>;

const DetailSection = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => {
  return (
    <Card className={sectionCard} shadow="none">
      <CardHeader className="flex items-center justify-between border-b border-default-200 px-4 py-3">
        <h3 className="text-base font-semibold text-[#111827]">{title}</h3>
      </CardHeader>
      <CardBody className="space-y-3 px-4 py-4">{children}</CardBody>
    </Card>
  );
};

const UploadField = ({ label }: { label: string }) => {
  return (
    <div>
      <p className={fieldLabel}>{label}</p>
      <div className="rounded-lg border border-dashed border-[#D1D5DB] p-6 text-center bg-[#F9FAFB]">
        <FileText className="mx-auto mb-2 text-primary" size={26} />
        <p className="text-xs text-default-500">
          PNG, JPG or PDF, smaller than 15MB
        </p>
        <p className="mt-3 text-sm text-default-700">
          Drag and Drop your file here or
        </p>
        <Button
          className="mt-2"
          color="primary"
          radius="full"
          size="sm"
          type="button"
        >
          Choose File
        </Button>
      </div>
    </div>
  );
};

const TagRow = ({
  label,
  placeholder,
  tags,
  startContent = <ListChecks size={14} className="text-default-400" />,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  startContent?: ReactNode;
}) => {
  return (
    <div>
      <p className={fieldLabel}>{label}</p>
      <Input
        placeholder={placeholder}
        radius="sm"
        size="sm"
        startContent={startContent}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Chip
            key={`${label}-${tag}`}
            classNames={{ base: "bg-[#EEF2FF]", content: "text-[#022279]" }}
            size="sm"
            variant="flat"
          >
            {tag}
          </Chip>
        ))}
      </div>
    </div>
  );
};

const DayHourRow = ({ day }: { day: string }) => {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-default-200 p-2">
      <Switch
        defaultSelected={day !== "Sunday" && day !== "Saturday"}
        size="sm"
      />
      <p className="min-w-20 text-sm text-[#111827]">{day}</p>
      <Input className="max-w-20" defaultValue="09:00" radius="sm" size="sm" />
      <Select
        className="max-w-16"
        defaultSelectedKeys={["am"]}
        radius="sm"
        size="sm"
      >
        <SelectItem key="am">AM</SelectItem>
        <SelectItem key="pm">PM</SelectItem>
      </Select>
      <Input className="max-w-20" defaultValue="06:00" radius="sm" size="sm" />
      <Select
        className="max-w-16"
        defaultSelectedKeys={["pm"]}
        radius="sm"
        size="sm"
      >
        <SelectItem key="am">AM</SelectItem>
        <SelectItem key="pm">PM</SelectItem>
      </Select>
    </div>
  );
};

const CompletionDoughnut = ({ percentage }: { percentage: number }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const chart = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        datasets: [
          {
            backgroundColor: ["#022279", "#E5E7EB"],
            borderWidth: 0,
            data: [percentage, Math.max(0, 100 - percentage)],
          },
        ],
      },
      options: {
        animation: false,
        cutout: "78%",
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        responsive: false,
      },
    });

    return () => {
      chart.destroy();
    };
  }, [percentage]);

  return (
    <div className="relative grid h-11 w-11 place-items-center">
      <canvas ref={canvasRef} height={44} width={44} />
      <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-1/2 text-[10px] min-w-fit font-semibold text-[#022279]">
        {percentage}%
      </span>
    </div>
  );
};

export const ClientDetailsScreen = ({ slug }: { slug: string }) => {
  const { countries, cityStates, niches, practiceTypes } = useDropdownData();
  const [saveMessage, setSaveMessage] = useState("");
  const {
    control,
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClientDetailsFormValues>({
    defaultValues: {
      clientName: "Mr Ricardo Campodon",
      businessName: "RCG Health",
      niche: "General Surgeon and Upper GI",
      personalEmail: "info@rcghealth.co.uk",
      practiceEmail: "info@rcghealth.co.uk",
      businessPhone: "",
      website: "www.rcghealth.co.uk",
      country: "United Kingdom",
      typeOfPractice: "Solo Practice",
      profession: "RCG Health",
      addressLine1: "Building name / Room #",
      addressLine2: "Street",
      cityState: "Birmingham",
      visibleArea: "Birmingham",
      postCode: "4Y687G",
      gbpLink: "",
      facebook: "https://facebook.com/username",
      instagram: "https://instagram.com/username",
      linkedin: "https://linkedin.com/username",
      websiteLoginLink: "",
      websiteUsername: "",
      websitePassword: "",
      googleAnalytics: "",
      googleSearchConsole: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (values: ClientDetailsFormValues) => {
    clearErrors();

    try {
      await clientDetailsSchema.validate(values, { abortEarly: false });
      setSaveMessage("Client details saved.");
    } catch (error) {
      setSaveMessage("");

      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof ClientDetailsFormValues, {
            message: issue.message,
            type: "manual",
          });
        });
      }
    }
  };

  return (
    <section className="space-y-4 pl-64 relative">
      <ClientProfileAside activeKey="details" slug={slug} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4 pl-6">
          <Card className={sectionCard} shadow="none">
            <CardBody className="flex flex-row items-center justify-between px-4 py-3">
              <h3 className="text-base font-semibold text-[#111827]">
                Client Details
              </h3>
              <div className="flex items-center gap-2 text-xs text-default-500">
                <span>25% Completed</span>
                <CompletionDoughnut percentage={25} />
              </div>
            </CardBody>
          </Card>

          <DetailSection title="Client Information">
            <div className="flex flex-row items-center">
              <Briefcase color="#022279" size={20} />
              <p className={fieldLabel + " !mb-0 mr-2 ml-1"}>Client ID</p>
              <span className="text-sm font-semibold text-[#111827]">
                123456
              </span>
              <Button
                isIconOnly
                size="sm"
                startContent={<Copy size={14} />}
                variant="light"
                onPress={() => {
                  navigator.clipboard.writeText("123456");
                }}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className={fieldLabel}>
                  Client Name (For solo practitioner)
                </p>
                <Input
                  {...register("clientName")}
                  errorMessage={errors.clientName?.message}
                  isInvalid={!!errors.clientName}
                  radius="sm"
                  size="sm"
                />
              </div>
              <div>
                <p className={fieldLabel}>
                  Business Name (For medical clinic / group of practice)
                </p>
                <Input
                  {...register("businessName")}
                  errorMessage={errors.businessName?.message}
                  isInvalid={!!errors.businessName}
                  radius="sm"
                  size="sm"
                />
              </div>
            </div>
            <div>
              <p className={fieldLabel}>
                Niche <span className="text-danger">*</span>
              </p>
              <Controller
                control={control}
                name="niche"
                render={({ field }) => (
                  <Select
                    errorMessage={errors.niche?.message}
                    isInvalid={!!errors.niche}
                    radius="sm"
                    selectedKeys={[field.value]}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const first = Array.from(keys as Set<string>)[0] ?? "";

                      field.onChange(first);
                    }}
                  >
                    {niches.map((niche) => (
                      <SelectItem key={niche.key}>{niche.label}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className={fieldLabel}>Personal Email Address</p>
                <Input
                  {...register("personalEmail")}
                  errorMessage={errors.personalEmail?.message}
                  isInvalid={!!errors.personalEmail}
                  radius="sm"
                  size="sm"
                />
              </div>
              <div>
                <p className={fieldLabel}>Practice Email Address</p>
                <Input
                  {...register("practiceEmail")}
                  errorMessage={errors.practiceEmail?.message}
                  isInvalid={!!errors.practiceEmail}
                  radius="sm"
                  size="sm"
                />
              </div>
              <div>
                <p className={fieldLabel}>Business Phone Number</p>
                <Input
                  {...register("businessPhone")}
                  errorMessage={errors.businessPhone?.message}
                  isInvalid={!!errors.businessPhone}
                  placeholder="Your phone number"
                  radius="sm"
                  size="sm"
                />
              </div>
            </div>
            <div>
              <p className={fieldLabel}>Website</p>
              <Input
                {...register("website")}
                errorMessage={errors.website?.message}
                isInvalid={!!errors.website}
                radius="sm"
                size="sm"
                startContent={
                  <div className="pointer-events-none flex items-center">
                    <span className="text-default-400 text-small">
                      https://
                    </span>
                  </div>
                }
              />
            </div>
            <div>
              <p className={fieldLabel}>Country</p>
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <Select
                    errorMessage={errors.country?.message}
                    isInvalid={!!errors.country}
                    radius="sm"
                    selectedKeys={[field.value]}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const first = Array.from(keys as Set<string>)[0] ?? "";

                      field.onChange(first);
                    }}
                  >
                    {countries.map((country) => (
                      <SelectItem key={country.key}>{country.label}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
          </DetailSection>

          <DetailSection title="Accelerator Onboarding Details">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className={fieldLabel}>Type of Practice</p>
                <Controller
                  control={control}
                  name="typeOfPractice"
                  render={({ field }) => (
                    <Select
                      errorMessage={errors.typeOfPractice?.message}
                      isInvalid={!!errors.typeOfPractice}
                      radius="sm"
                      selectedKeys={[field.value]}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const first = Array.from(keys as Set<string>)[0] ?? "";

                        field.onChange(first);
                      }}
                    >
                      {practiceTypes.map((practiceType) => (
                        <SelectItem key={practiceType.key}>
                          {practiceType.label}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>
              <div>
                <p className={fieldLabel}>Profession / Title</p>
                <Input
                  {...register("profession")}
                  errorMessage={errors.profession?.message}
                  isInvalid={!!errors.profession}
                  radius="sm"
                  size="sm"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TagRow
                label="Top 3 Medical Specialties"
                placeholder="Add top 3 medical specialties"
                tags={["Specialties", "Specialties"]}
                startContent={<Stethoscope size={18} />}
              />
              <TagRow
                label="Other Medical Specialty"
                placeholder="Add other medical specialty(s)"
                tags={["Other Specialties", "Other Specialties"]}
                startContent={<BriefcaseMedical size={18} />}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TagRow
                label="Sub-specialty"
                placeholder="Add sub-specialty"
                tags={["Specialties", "Specialties"]}
                startContent={<TestTubeDiagonal size={18} />}
              />
              <TagRow
                label="Top 5 Special Interests You Would Like to Be Known For"
                placeholder="Add top 5 special interests"
                tags={["Other Specialties", "Other Specialties"]}
                startContent={<Beaker size={18} />}
              />
            </div>

            <TagRow
              label="Top 3 Treatments You Want To Be Visible For"
              placeholder="Add top 3 treatments"
              tags={["Treatments", "Treatments"]}
              startContent={<Pipette size={18} />}
            />

            <div>
              <p className={fieldLabel}>Practice Introduction</p>
              <Textarea
                defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
                minRows={2}
                radius="sm"
              />
            </div>
            <div>
              <p className={fieldLabel}>What makes your pratice unique to competitors *</p>
              <Textarea
                defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
                minRows={3}
                radius="sm"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <UploadField label="High Quality Headshot" />
              <UploadField label="Your CV" />
              <UploadField label="Practice Location Interior Photo" />
              <UploadField label="Practice Location Exterior Photo" />
            </div>

            <div className="grid gap-3 md:grid-cols-1">
              <div>
                <p className={fieldLabel}>Address Line 1</p>
                <Input
                  {...register("addressLine1")}
                  errorMessage={errors.addressLine1?.message}
                  isInvalid={!!errors.addressLine1}
                  radius="sm"
                  size="sm"
                />
              </div>
              <div>
                <p className={fieldLabel}>Address Line 2</p>
                <Input {...register("addressLine2")} radius="sm" size="sm" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className={fieldLabel}>Country</p>
                <Controller
                  control={control}
                  name="country"
                  render={({ field }) => (
                    <Select
                      errorMessage={errors.country?.message}
                      isInvalid={!!errors.country}
                      radius="sm"
                      selectedKeys={[field.value]}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const first = Array.from(keys as Set<string>)[0] ?? "";

                        field.onChange(first);
                      }}
                    >
                      {countries.map((country) => (
                        <SelectItem key={country.key}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>
              <div>
                <p className={fieldLabel}>City/State</p>
                <Controller
                  control={control}
                  name="cityState"
                  render={({ field }) => (
                    <Select
                      errorMessage={errors.cityState?.message}
                      isInvalid={!!errors.cityState}
                      radius="sm"
                      selectedKeys={[field.value]}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const first = Array.from(keys as Set<string>)[0] ?? "";

                        field.onChange(first);
                      }}
                    >
                      {cityStates.map((cityState) => (
                        <SelectItem key={cityState.key}>
                          {cityState.label}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>
              <div>
                <p className={fieldLabel}>Post Code</p>
                <Input
                  {...register("postCode")}
                  errorMessage={errors.postCode?.message}
                  isInvalid={!!errors.postCode}
                  radius="sm"
                  size="sm"
                />
              </div>
              <div className="md:col-span-2">
                <p className={fieldLabel}>1 Area You Want to Be Visible in</p>
                <Controller
                  control={control}
                  name="visibleArea"
                  render={({ field }) => (
                    <Select
                      errorMessage={errors.visibleArea?.message}
                      isInvalid={!!errors.visibleArea}
                      radius="sm"
                      selectedKeys={[field.value]}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const first = Array.from(keys as Set<string>)[0] ?? "";

                        field.onChange(first);
                      }}
                    >
                      {cityStates.map((cityState) => (
                        <SelectItem key={cityState.key}>
                          {cityState.label}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>
            </div>

            <div>
              <p className={fieldLabel}>Practice Hours</p>
              <div className="grid gap-2 md:grid-cols-2">
                {days.map((day) => (
                  <DayHourRow key={day} day={day} />
                ))}
              </div>
            </div>

            <div>
              <p className={fieldLabel}>Link to Google Business Profile</p>
              <Input
                {...register("gbpLink")}
                errorMessage={errors.gbpLink?.message}
                isInvalid={!!errors.gbpLink}
                placeholder="https://business.google.com/..."
                radius="sm"
                size="sm"
              />
            </div>

            <div>
              <p className={fieldLabel}>Social Media Links</p>
              <div className="space-y-2">
                <Input
                  {...register("facebook")}
                  errorMessage={errors.facebook?.message}
                  isInvalid={!!errors.facebook}
                  radius="sm"
                  size="sm"
                  startContent={
                    <div className="pointer-events-none flex items-center border-r-1 border-default-300 pr-2 min-w-20">
                      <span className="text-default-400 text-small">Facebook</span>
                    </div>
                  }
                />
                <Input
                  {...register("instagram")}
                  errorMessage={errors.instagram?.message}
                  isInvalid={!!errors.instagram}
                  radius="sm"
                  size="sm"
                  startContent={
                    <div className="pointer-events-none flex items-center border-r-1 border-default-300 pr-2 min-w-20">
                      <span className="text-default-400 text-small">Instagram</span>
                    </div>
                  }
                />
                <Input
                  {...register("linkedin")}
                  errorMessage={errors.linkedin?.message}
                  isInvalid={!!errors.linkedin}
                  radius="sm"
                  size="sm"
                  startContent={
                    <div className="pointer-events-none flex items-center border-r-1 border-default-300 pr-2 min-w-20">
                      <span className="text-default-400 text-small">LinkedIn</span>
                    </div>
                  }
                />
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Website Details">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className={fieldLabel}>Website Login Link</p>
                <Input
                  {...register("websiteLoginLink")}
                  radius="sm"
                  size="sm"
                />
              </div>
              <div>
                <p className={fieldLabel}>Username</p>
                <Input {...register("websiteUsername")} radius="sm" size="sm" />
              </div>
              <div>
                <p className={fieldLabel}>Password</p>
                <Input
                  {...register("websitePassword")}
                  radius="sm"
                  size="sm"
                  type="password"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className={fieldLabel}>Google Analytics</p>
                <Input {...register("googleAnalytics")} radius="sm" size="sm" />
              </div>
              <div>
                <p className={fieldLabel}>Google Search Console</p>
                <Input
                  {...register("googleSearchConsole")}
                  radius="sm"
                  size="sm"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <UploadField label="Color Guide" />
              <UploadField label="Logo" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TagRow
                label="List of treatment and services to be included (maximum 10)"
                placeholder="Add sub-specialty"
                tags={["Specialties", "Specialties"]}
                startContent={<Stethoscope size={18} />}
              />
              <TagRow
                label="Conditions treated (maximum 10)"
                placeholder="Add top 5 special interests"
                tags={["Other Specialties", "Other Specialties"]}
                startContent={<BriefcaseMedical size={18} />}
              />
            </div>
          </DetailSection>

          <Divider />

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-success">{saveMessage}</p>
            <div className="flex gap-2">
              <Button radius="sm" type="button" variant="light">
                Cancel
              </Button>
              <Button
                color="primary"
                isLoading={isSubmitting}
                radius="sm"
                type="submit"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
};
