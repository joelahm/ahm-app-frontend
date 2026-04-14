"use client";

import type { Dispatch, SetStateAction } from "react";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import * as yup from "yup";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { useRouter } from "next/navigation";
import { Select, SelectItem } from "@heroui/select";
import { Textarea } from "@heroui/input";
import {
  BriefcaseMedical,
  Copy,
  Download,
  Home,
  MapPin,
  Clock3,
  Trash2,
} from "lucide-react";

import { clientsApi, type ClientApiItem } from "@/apis/clients";
import {
  generatedSchemasApi,
  type GeneratedSchemaPageType,
  type SaveGeneratedSchemaRequestBody,
} from "@/apis/generated-schemas";
import { AutocompleteTokenField } from "@/components/form/autocomplete-token-field";
import {
  schemaGeneratorSettingsApi,
  type SchemaMedicalSpecialtyOption,
  type SchemaServiceTypeOption,
  type SchemaTypeOption,
} from "@/apis/schema-generator-settings";
import { useAuth } from "@/components/auth/auth-context";
import { getCountryOptions } from "@/components/form/location-options";

type SchemaPageType = "homepage" | "treatment-page" | "location-page";

interface BusinessHoursEntry {
  closeHour: string;
  closeMinute: string;
  openHour: string;
  openMinute: string;
  status: "open" | "closed";
}

type WeeklyBusinessHours = Record<string, BusinessHoursEntry>;

interface SchemaHospitalAffiliation {
  businessHours: WeeklyBusinessHours;
  city: string;
  countryCode: string;
  hasMapUrl: string;
  latitude: string;
  longitude: string;
  name: string;
  postalCode: string;
  region: string;
  streetAddress: string;
  telephone: string;
  url: string;
}

interface SchemaGeneratorFormValues {
  businessName: string;
  clientId: string;
  countryCode: string;
  description: string;
  email: string;
  hasMapUrl: string;
  medicalSpecialties: string[];
  hospitalAffiliations: SchemaHospitalAffiliation[];
  latitude: string;
  locality: string;
  logoUrl: string;
  longitude: string;
  phone: string;
  postalCode: string;
  region: string;
  serviceAreas: Array<{ value: string }>;
  services: Array<{ link: string; name: string; type: string }>;
  socialProfiles: Array<{ value: string }>;
  streetAddress: string;
  type: string;
  websiteDescription: string;
  websiteName: string;
  websiteUrl: string;
}

const businessHoursRows = [
  { day: "Sunday", isOpen: false, key: "sunday" },
  { day: "Monday", isOpen: true, key: "monday" },
  { day: "Tuesday", isOpen: true, key: "tuesday" },
  { day: "Wednesday", isOpen: true, key: "wednesday" },
  { day: "Thursday", isOpen: false, key: "thursday" },
  { day: "Friday", isOpen: true, key: "friday" },
  { day: "Saturday", isOpen: true, key: "saturday" },
] as const;

function createWeeklyBusinessHours(): WeeklyBusinessHours {
  return Object.fromEntries(
    businessHoursRows.map((row) => [
      row.key,
      {
        closeHour: "12",
        closeMinute: "00",
        openHour: "12",
        openMinute: "00",
        status: row.isOpen ? "open" : "closed",
      },
    ]),
  ) as WeeklyBusinessHours;
}

const buildEmptyHospitalAffiliation = (): SchemaHospitalAffiliation => ({
  businessHours: createWeeklyBusinessHours(),
  city: "",
  countryCode: "",
  hasMapUrl: "",
  latitude: "",
  longitude: "",
  name: "",
  postalCode: "",
  region: "",
  streetAddress: "",
  telephone: "",
  url: "",
});

const countryCodeOptions = getCountryOptions();
const countryCodeValues = countryCodeOptions.map((option) => option.key);

const phoneRegExp = /^\+[1-9]\d{6,14}$/;
const latitudeRegExp = /^-?(?:90(?:\.0+)?|[1-8]?\d(?:\.\d+)?)$/;
const longitudeRegExp =
  /^-?(?:180(?:\.0+)?|1[0-7]\d(?:\.\d+)?|[1-9]?\d(?:\.\d+)?)$/;

const normalizeCountryCode = (value?: string | null) => {
  const normalized = value?.trim();

  if (!normalized) {
    return "";
  }

  const directMatch = countryCodeOptions.find(
    (option) => option.key.toLowerCase() === normalized.toLowerCase(),
  );

  if (directMatch) {
    return directMatch.key;
  }

  const labelMatch = countryCodeOptions.find(
    (option) => option.label.toLowerCase() === normalized.toLowerCase(),
  );

  return labelMatch?.key ?? normalized.toUpperCase();
};

const schemaGeneratorSchema = yup.object({
  businessName: yup.string().required("Business name is required"),
  countryCode: yup
    .string()
    .oneOf(countryCodeValues, "Select a valid ISO country code")
    .required("Country code is required"),
  description: yup
    .string()
    .max(160, "Business description must be 160 characters or fewer")
    .required("Business description is required"),
  email: yup
    .string()
    .email("Enter a valid email")
    .required("Email is required"),
  hasMapUrl: yup.string().url("Enter a valid URL").default(""),
  medicalSpecialties: yup
    .array()
    .of(yup.string().trim().required())
    .max(3, "Medical specialty supports up to 3 items")
    .default([]),
  hospitalAffiliations: yup
    .array()
    .of(
      yup.object({
        businessHours: yup
          .object()
          .required("Hospital business hours are required"),
        city: yup.string().required("Hospital city is required"),
        countryCode: yup
          .string()
          .oneOf(countryCodeValues, "Select a valid ISO country code")
          .required("Hospital country code is required"),
        hasMapUrl: yup.string().url("Enter a valid URL").default(""),
        latitude: yup
          .string()
          .test(
            "latitude-format",
            "Enter a valid latitude between -90 and 90",
            (value) => !value?.trim() || latitudeRegExp.test(value.trim()),
          )
          .default(""),
        longitude: yup
          .string()
          .test(
            "longitude-format",
            "Enter a valid longitude between -180 and 180",
            (value) => !value?.trim() || longitudeRegExp.test(value.trim()),
          )
          .default(""),
        name: yup.string().required("Hospital name is required"),
        postalCode: yup.string().required("Hospital postal code is required"),
        region: yup.string().default(""),
        streetAddress: yup
          .string()
          .required("Hospital street address is required"),
        telephone: yup
          .string()
          .test(
            "hospital-phone-format",
            "Enter a valid phone in international format, for example +447823701873",
            (value) => !value?.trim() || phoneRegExp.test(value.trim()),
          )
          .default(""),
        url: yup
          .string()
          .url("Enter a valid URL")
          .required("Hospital URL is required"),
      }),
    )
    .min(1, "At least one hospital affiliation is required")
    .default([buildEmptyHospitalAffiliation()]),
  latitude: yup
    .string()
    .test(
      "latitude-format",
      "Enter a valid latitude between -90 and 90",
      (value) => !value?.trim() || latitudeRegExp.test(value.trim()),
    )
    .default(""),
  locality: yup.string().required("Locality is required"),
  logoUrl: yup.string().url("Enter a valid URL").default(""),
  longitude: yup
    .string()
    .test(
      "longitude-format",
      "Enter a valid longitude between -180 and 180",
      (value) => !value?.trim() || longitudeRegExp.test(value.trim()),
    )
    .default(""),
  phone: yup
    .string()
    .matches(
      phoneRegExp,
      "Enter a valid phone in international format, for example +447823701873",
    )
    .required("Phone is required"),
  postalCode: yup.string().required("Postal code is required"),
  region: yup.string().required("Region is required"),
  serviceAreas: yup
    .array()
    .of(
      yup.object({
        value: yup.string().default(""),
      }),
    )
    .default([{ value: "" }]),
  services: yup
    .array()
    .of(
      yup.object({
        link: yup.string().default(""),
        name: yup.string().default(""),
        type: yup.string().default("MedicalProcedure"),
      }),
    )
    .default([{ link: "", name: "", type: "MedicalProcedure" }]),
  socialProfiles: yup
    .array()
    .of(
      yup.object({
        value: yup.string().default(""),
      }),
    )
    .default([{ value: "" }]),
  streetAddress: yup.string().required("Street address is required"),
  type: yup.string().required("Type is required"),
  websiteDescription: yup.string().required("Website description is required"),
  websiteName: yup.string().required("Website name is required"),
  websiteUrl: yup
    .string()
    .url("Enter a valid URL")
    .required("Website URL is required"),
});

const stepCards = [
  {
    description: "Type of schema",
    title: "Page Type",
  },
  {
    description: "Map columns to field",
    title: "Business Information",
  },
  {
    description: "Generate and save your schema",
    title: "Review & Generate",
  },
] as const;

const pageTypeCards: Array<{
  description: string;
  icon: typeof Home;
  isDisabled?: boolean;
  key: SchemaPageType;
  title: string;
}> = [
  {
    description: "Main business schema for the homepage",
    icon: Home,
    key: "homepage",
    title: "Homepage",
  },
  {
    description: "For specific treatment such as imaging, colonoscopy, etc.",
    icon: BriefcaseMedical,
    isDisabled: true,
    key: "treatment-page",
    title: "Treatment Page",
  },
  {
    description:
      "For local landing pages targeting a city, clinic, clinic branch, or service areas.",
    icon: MapPin,
    isDisabled: true,
    key: "location-page",
    title: "Location Page",
  },
];

const stepCardClasses = (isActive: boolean) =>
  [
    "rounded-lg border p-2 transition-colors",
    isActive ? "border-primary bg-[#EEF0FF]" : "border-default-200 bg-white",
  ].join(" ");

const stepBadgeClasses = (isActive: boolean) =>
  [
    "flex h-8 w-8 items-center justify-center rounded-lg text-lg font-semibold",
    isActive ? "bg-primary text-white" : "bg-default-100 text-default-400",
  ].join(" ");

const fieldLabelClassName = "mb-1.5 block text-sm text-[#4B5563]";

const defaultBusinessHoursValues = Object.fromEntries(
  businessHoursRows.map((row) => [
    row.day,
    {
      closeHour: "12",
      closeMinute: "00",
      openHour: "12",
      openMinute: "00",
    },
  ]),
) as Record<
  string,
  {
    closeHour: string;
    closeMinute: string;
    openHour: string;
    openMinute: string;
  }
>;

const createBusinessHoursStatus = () =>
  Object.fromEntries(
    businessHoursRows.map((row) => [row.day, row.isOpen ? "open" : "closed"]),
  ) as Record<string, "open" | "closed">;

const createBusinessHoursValues = () =>
  structuredClone(
    defaultBusinessHoursValues,
  ) as typeof defaultBusinessHoursValues;

const mergeWeeklyBusinessHoursIntoUiState = (
  hours?: WeeklyBusinessHours,
): {
  status: Record<string, "open" | "closed">;
  values: typeof defaultBusinessHoursValues;
} => {
  const fallback = createWeeklyBusinessHours();

  return {
    status: Object.fromEntries(
      businessHoursRows.map((row) => [
        row.day,
        hours?.[row.key]?.status ?? fallback[row.key].status,
      ]),
    ) as Record<string, "open" | "closed">,
    values: Object.fromEntries(
      businessHoursRows.map((row) => [
        row.day,
        {
          closeHour: hours?.[row.key]?.closeHour ?? fallback[row.key].closeHour,
          closeMinute:
            hours?.[row.key]?.closeMinute ?? fallback[row.key].closeMinute,
          openHour: hours?.[row.key]?.openHour ?? fallback[row.key].openHour,
          openMinute:
            hours?.[row.key]?.openMinute ?? fallback[row.key].openMinute,
        },
      ]),
    ) as typeof defaultBusinessHoursValues,
  };
};

const buildWeeklyBusinessHoursFromUiState = (
  hourStatus: Record<string, "open" | "closed">,
  hourValues: typeof defaultBusinessHoursValues,
): WeeklyBusinessHours =>
  Object.fromEntries(
    businessHoursRows.map((row) => [
      row.key,
      {
        closeHour: hourValues[row.day].closeHour,
        closeMinute: hourValues[row.day].closeMinute,
        openHour: hourValues[row.day].openHour,
        openMinute: hourValues[row.day].openMinute,
        status: hourStatus[row.day] ?? (row.isOpen ? "open" : "closed"),
      },
    ]),
  ) as WeeklyBusinessHours;

export const SchemaGeneratorScreen = ({
  mode = "create",
  schemaId,
}: {
  mode?: "create" | "edit";
  schemaId?: string;
}) => {
  const router = useRouter();
  const { session } = useAuth();
  const [businessHoursStatus, setBusinessHoursStatus] = useState<
    Record<string, "open" | "closed">
  >(createBusinessHoursStatus);
  const [businessHoursValues, setBusinessHoursValues] = useState(
    createBusinessHoursValues,
  );
  const [medicalSpecialtyOptions, setMedicalSpecialtyOptions] = useState<
    SchemaMedicalSpecialtyOption[]
  >([]);
  const [serviceTypeOptions, setServiceTypeOptions] = useState<
    SchemaServiceTypeOption[]
  >([]);
  const [schemaTypeOptions, setSchemaTypeOptions] = useState<
    SchemaTypeOption[]
  >([]);
  const renderBusinessHoursRows = (
    hourStatus: Record<string, "open" | "closed">,
    setHourStatus: Dispatch<SetStateAction<Record<string, "open" | "closed">>>,
    hourValues: typeof defaultBusinessHoursValues,
    setHourValues: Dispatch<SetStateAction<typeof defaultBusinessHoursValues>>,
  ) => (
    <div className="space-y-1.5 pb-3">
      {businessHoursRows.map((row) => (
        <div key={row.day} className="flex items-center justify-between gap-4">
          <div className="w-[200px] flex items-center justify-between gap-2">
            <span className="text-sm text-[#111827]">{row.day}</span>
            <Select
              aria-label={`${row.day} status`}
              classNames={{
                base: "w-24",
                trigger:
                  hourStatus[row.day] === "open"
                    ? "min-h-9 border-0 bg-[#ECFDF3] text-[#12B76A] shadow-none"
                    : "min-h-9 border-0 bg-[#FEF3F2] text-[#D92D20] shadow-none",
                value: "text-sm",
              }}
              radius="full"
              selectedKeys={[hourStatus[row.day]]}
              size="sm"
              onSelectionChange={(keys) => {
                const selectedKey =
                  keys === "all" ? null : (keys.currentKey ?? null);

                setHourStatus((current) => ({
                  ...current,
                  [row.day]: selectedKey === "closed" ? "closed" : "open",
                }));
              }}
            >
              <SelectItem key="open">Open</SelectItem>
              <SelectItem key="closed">Closed</SelectItem>
            </Select>
          </div>

          {hourStatus[row.day] === "open" ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`${row.day} opening hour`}
                  classNames={{
                    base: "w-[50px]",
                    input: "text-center text-base font-medium text-primary",
                    inputWrapper:
                      "h-12 min-h-12 rounded-lg border-0 bg-[#EEF0FF] shadow-none",
                  }}
                  inputMode="numeric"
                  maxLength={2}
                  radius="sm"
                  value={hourValues[row.day].openHour}
                  onValueChange={(value) =>
                    setHourValues((current) => ({
                      ...current,
                      [row.day]: {
                        ...current[row.day],
                        openHour: value.replace(/\D/g, "").slice(0, 2),
                      },
                    }))
                  }
                />
                <span className="text-lg font-semibold text-[#111827]">:</span>
                <Input
                  aria-label={`${row.day} opening minute`}
                  classNames={{
                    base: "w-[50px]",
                    input: "text-center text-base font-medium text-[#111827]",
                    inputWrapper:
                      "h-12 min-h-12 rounded-lg border border-default-200 bg-white shadow-none",
                  }}
                  inputMode="numeric"
                  maxLength={2}
                  radius="sm"
                  value={hourValues[row.day].openMinute}
                  onValueChange={(value) =>
                    setHourValues((current) => ({
                      ...current,
                      [row.day]: {
                        ...current[row.day],
                        openMinute: value.replace(/\D/g, "").slice(0, 2),
                      },
                    }))
                  }
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px w-[30px] border-t border-dashed border-[#98A2B3]" />
                <div className="flex items-center justify-center text-primary">
                  <Clock3 size={18} />
                </div>
                <div className="h-px w-[30px] border-t border-dashed border-[#98A2B3]" />
              </div>

              <div className="flex items-center gap-2">
                <Input
                  aria-label={`${row.day} closing hour`}
                  classNames={{
                    base: "w-[50px]",
                    input: "text-center text-base font-medium text-primary",
                    inputWrapper:
                      "h-12 min-h-12 rounded-lg border-0 bg-[#EEF0FF] shadow-none",
                  }}
                  inputMode="numeric"
                  maxLength={2}
                  radius="sm"
                  value={hourValues[row.day].closeHour}
                  onValueChange={(value) =>
                    setHourValues((current) => ({
                      ...current,
                      [row.day]: {
                        ...current[row.day],
                        closeHour: value.replace(/\D/g, "").slice(0, 2),
                      },
                    }))
                  }
                />
                <span className="text-lg font-semibold text-[#111827]">:</span>
                <Input
                  aria-label={`${row.day} closing minute`}
                  classNames={{
                    base: "w-[50px]",
                    input: "text-center text-base font-medium text-[#111827]",
                    inputWrapper:
                      "h-12 min-h-12 rounded-lg border border-default-200 bg-white shadow-none",
                  }}
                  inputMode="numeric"
                  maxLength={2}
                  radius="sm"
                  value={hourValues[row.day].closeMinute}
                  onValueChange={(value) =>
                    setHourValues((current) => ({
                      ...current,
                      [row.day]: {
                        ...current[row.day],
                        closeMinute: value.replace(/\D/g, "").slice(0, 2),
                      },
                    }))
                  }
                />
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>
      ))}
    </div>
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [clientOptions, setClientOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedPageType, setSelectedPageType] =
    useState<SchemaPageType>("homepage");
  const [previewActionMessage, setPreviewActionMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSchema, setIsLoadingSchema] = useState(mode === "edit");

  const {
    clearErrors,
    control,
    formState: { errors },
    handleSubmit,
    setValue,
    setError,
    watch,
  } = useForm<SchemaGeneratorFormValues>({
    defaultValues: {
      businessName: "",
      clientId: "",
      countryCode: "",
      description: "",
      email: "",
      hasMapUrl: "",
      hospitalAffiliations: [buildEmptyHospitalAffiliation()],
      medicalSpecialties: [],
      latitude: "",
      locality: "",
      logoUrl: "",
      longitude: "",
      phone: "",
      postalCode: "",
      region: "",
      serviceAreas: [{ value: "" }],
      services: [{ link: "", name: "", type: "MedicalProcedure" }],
      socialProfiles: [{ value: "" }],
      streetAddress: "",
      type: "",
      websiteDescription: "",
      websiteName: "",
      websiteUrl: "",
    },
  });
  const {
    append: appendSocialProfile,
    fields: socialProfileFields,
    remove: removeSocialProfile,
  } = useFieldArray({
    control,
    name: "socialProfiles",
  });
  const {
    append: appendServiceArea,
    fields: serviceAreaFields,
    remove: removeServiceArea,
  } = useFieldArray({
    control,
    name: "serviceAreas",
  });
  const {
    append: appendService,
    fields: serviceFields,
    remove: removeService,
  } = useFieldArray({
    control,
    name: "services",
  });
  const {
    append: appendHospitalAffiliation,
    fields: hospitalAffiliationFields,
    remove: removeHospitalAffiliation,
  } = useFieldArray({
    control,
    name: "hospitalAffiliations",
  });

  const watchedValues = watch();
  const selectedClientId = watch("clientId");
  const specialtyLabelToSchemaUrl = useMemo(
    () =>
      Object.fromEntries(
        medicalSpecialtyOptions.map((option) => [
          option.label,
          option.value.startsWith("https://schema.org/")
            ? option.value
            : `https://schema.org/${option.label.replace(/\s+/g, "")}`,
        ]),
      ) as Record<string, string>,
    [medicalSpecialtyOptions],
  );
  const countryAutocompleteItems = useMemo(
    () =>
      countryCodeOptions.map((option) => ({
        key: option.key,
        label: `${option.label} (${option.key})`,
      })),
    [],
  );

  useEffect(() => {
    if (!session?.accessToken) {
      setSchemaTypeOptions([]);

      return;
    }

    let isMounted = true;

    const loadSchemaTypes = async () => {
      try {
        const [typesResponse, specialtiesResponse, serviceTypesResponse] =
          await Promise.all([
            schemaGeneratorSettingsApi.getSchemaTypes(session.accessToken),
            schemaGeneratorSettingsApi.getMedicalSpecialties(
              session.accessToken,
            ),
            schemaGeneratorSettingsApi.getServiceTypes(session.accessToken),
          ]);

        if (!isMounted) {
          return;
        }

        setSchemaTypeOptions(typesResponse.types);
        setMedicalSpecialtyOptions(specialtiesResponse.medicalSpecialties);
        setServiceTypeOptions(serviceTypesResponse.serviceTypes);
      } catch {
        if (!isMounted) {
          return;
        }

        setSchemaTypeOptions([]);
        setMedicalSpecialtyOptions([]);
        setServiceTypeOptions([]);
      }
    };

    void loadSchemaTypes();

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) {
      setClientOptions([]);

      return;
    }

    let isMounted = true;

    const loadClients = async () => {
      try {
        const response = await clientsApi.getClients(session.accessToken);

        if (!isMounted) {
          return;
        }

        const nextClients = response
          .map((client: ClientApiItem) => ({
            id: String(client.id),
            name:
              client.businessName?.trim() ||
              client.clientName?.trim() ||
              `Client ${client.id}`,
          }))
          .filter(
            (client, index, current) =>
              client.name.length > 0 &&
              current.findIndex((item) => item.id === client.id) === index,
          );

        setClientOptions(nextClients);
      } catch {
        if (!isMounted) {
          return;
        }

        setClientOptions([]);
      }
    };

    void loadClients();

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (mode === "edit" || !session?.accessToken || !selectedClientId) {
      return;
    }

    let isMounted = true;

    const loadClientDetails = async () => {
      try {
        const client = await clientsApi.getClientById(
          session.accessToken,
          selectedClientId,
        );

        if (!isMounted) {
          return;
        }

        const serviceName =
          client.treatmentAndServices[0] ||
          client.topTreatments[0] ||
          client.topMedicalSpecialties[0] ||
          "";

        setValue("clientId", String(client.id), { shouldDirty: true });
        setValue(
          "businessName",
          client.businessName || client.clientName || "",
          { shouldDirty: true },
        );
        setValue("websiteUrl", client.website || "", { shouldDirty: true });
        setValue("phone", client.businessPhone || "", { shouldDirty: true });
        setValue(
          "description",
          client.practiceIntroduction || client.profession || "",
          {
            shouldDirty: true,
          },
        );
        setValue("email", client.practiceEmail || client.personalEmail || "", {
          shouldDirty: true,
        });
        setValue("streetAddress", client.addressLine1 || "", {
          shouldDirty: true,
        });
        setValue("locality", client.cityState || "", { shouldDirty: true });
        setValue("region", client.cityState || "", { shouldDirty: true });
        setValue("postalCode", client.postCode || "", { shouldDirty: true });
        setValue("countryCode", normalizeCountryCode(client.country) || "GB", {
          shouldDirty: true,
        });
        setValue("latitude", "", { shouldDirty: true });
        setValue("longitude", "", { shouldDirty: true });
        setValue("hasMapUrl", client.gbpLink || "", { shouldDirty: true });
        setValue("type", "Physician", { shouldDirty: true });
        setValue(
          "websiteName",
          client.businessName || client.clientName || "",
          { shouldDirty: true },
        );
        setValue(
          "websiteDescription",
          client.practiceIntroduction || client.profession || "",
          {
            shouldDirty: true,
          },
        );
        setValue(
          "medicalSpecialties",
          client.topMedicalSpecialties?.slice(0, 3) ||
            (serviceName ? [serviceName] : []),
          {
            shouldDirty: true,
          },
        );
        setValue("serviceAreas", [{ value: client.cityState || "" }], {
          shouldDirty: true,
        });
        setValue(
          "services",
          [
            {
              link: client.website || "",
              name: serviceName,
              type: "MedicalProcedure",
            },
          ],
          { shouldDirty: true },
        );
        setValue(
          "logoUrl",
          client.highQualityHeadshot[0] ||
            client.practiceLocationExteriorPhoto[0] ||
            "",
          {
            shouldDirty: true,
          },
        );
        setValue(
          "socialProfiles",
          [
            {
              value:
                client.facebook || client.instagram || client.linkedin || "",
            },
          ],
          {
            shouldDirty: true,
          },
        );
        setValue(
          "hospitalAffiliations",
          [
            {
              businessHours: createWeeklyBusinessHours(),
              city: client.cityState || "",
              countryCode: normalizeCountryCode(client.country) || "GB",
              hasMapUrl: client.gbpLink || "",
              latitude: "",
              longitude: "",
              name: client.businessName || client.clientName || "",
              postalCode: client.postCode || "",
              region: client.cityState || "",
              streetAddress: client.addressLine1 || "",
              telephone: client.businessPhone || "",
              url: client.website || "",
            },
          ],
          { shouldDirty: true },
        );
      } catch {
        if (!isMounted) {
          return;
        }
      }
    };

    void loadClientDetails();

    return () => {
      isMounted = false;
    };
  }, [mode, selectedClientId, session?.accessToken, setValue]);

  useEffect(() => {
    if (mode !== "edit" || !schemaId || !session?.accessToken) {
      return;
    }

    let isMounted = true;

    const loadGeneratedSchema = async () => {
      try {
        setIsLoadingSchema(true);
        setSaveError("");

        const response = await generatedSchemasApi.getGeneratedSchema(
          session.accessToken,
          schemaId,
        );

        if (!isMounted) {
          return;
        }

        const schema = response.generatedSchema;
        const mergedHours = mergeWeeklyBusinessHoursIntoUiState(
          schema.businessHours,
        );

        setCurrentStep(3);
        setSelectedPageType(schema.schemaType as SchemaPageType);
        setValue("clientId", schema.clientId, { shouldDirty: false });
        setValue("businessName", schema.formValues.businessName, {
          shouldDirty: false,
        });
        setValue("countryCode", schema.formValues.countryCode, {
          shouldDirty: false,
        });
        setValue("description", schema.formValues.description, {
          shouldDirty: false,
        });
        setValue("email", schema.formValues.email, { shouldDirty: false });
        setValue("hasMapUrl", schema.formValues.hasMapUrl, {
          shouldDirty: false,
        });
        setValue(
          "medicalSpecialties",
          schema.formValues.medicalSpecialties ?? [],
          { shouldDirty: false },
        );
        setValue(
          "hospitalAffiliations",
          schema.formValues.hospitalAffiliations?.length
            ? schema.formValues.hospitalAffiliations
            : [buildEmptyHospitalAffiliation()],
          { shouldDirty: false },
        );
        setValue("latitude", schema.formValues.latitude, {
          shouldDirty: false,
        });
        setValue("locality", schema.formValues.locality, {
          shouldDirty: false,
        });
        setValue("logoUrl", schema.formValues.logoUrl, {
          shouldDirty: false,
        });
        setValue("longitude", schema.formValues.longitude, {
          shouldDirty: false,
        });
        setValue("phone", schema.formValues.phone, { shouldDirty: false });
        setValue("postalCode", schema.formValues.postalCode, {
          shouldDirty: false,
        });
        setValue("region", schema.formValues.region, { shouldDirty: false });
        setValue(
          "serviceAreas",
          schema.formValues.serviceAreas?.length
            ? schema.formValues.serviceAreas
            : [{ value: "" }],
          { shouldDirty: false },
        );
        setValue(
          "services",
          schema.formValues.services?.length
            ? schema.formValues.services
            : [{ link: "", name: "", type: "MedicalProcedure" }],
          { shouldDirty: false },
        );
        setValue(
          "socialProfiles",
          schema.formValues.socialProfiles?.length
            ? schema.formValues.socialProfiles
            : [{ value: "" }],
          { shouldDirty: false },
        );
        setValue("streetAddress", schema.formValues.streetAddress, {
          shouldDirty: false,
        });
        setValue("type", schema.formValues.type, { shouldDirty: false });
        setValue("websiteDescription", schema.formValues.websiteDescription, {
          shouldDirty: false,
        });
        setValue("websiteName", schema.formValues.websiteName, {
          shouldDirty: false,
        });
        setValue("websiteUrl", schema.formValues.websiteUrl, {
          shouldDirty: false,
        });
        setBusinessHoursStatus(mergedHours.status);
        setBusinessHoursValues(mergedHours.values);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSaveError(
          error instanceof Error ? error.message : "Failed to load schema.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingSchema(false);
        }
      }
    };

    void loadGeneratedSchema();

    return () => {
      isMounted = false;
    };
  }, [mode, schemaId, session?.accessToken, setValue]);

  const previewJson = useMemo(() => {
    const pageTypeMap: Record<SchemaPageType, string> = {
      homepage: "Physician",
      "location-page": "MedicalClinic",
      "treatment-page": "MedicalProcedure",
    };

    const slugify = (value: string, fallback: string) => {
      const next = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      return next || fallback;
    };

    const withTrailingSlash = (value: string) => {
      if (!value) {
        return "https://www.example.com/";
      }

      return value.endsWith("/") ? value : `${value}/`;
    };

    const websiteUrl = withTrailingSlash(watchedValues.websiteUrl);
    const physicianId = `${websiteUrl}#${slugify(
      watchedValues.type || pageTypeMap[selectedPageType],
      "physician",
    )}`;
    const buildHasMapUrl = (
      address: string,
      city: string,
      postalCode: string,
      fallbackUrl?: string,
    ) => {
      if (fallbackUrl?.trim()) {
        return fallbackUrl.trim();
      }

      const query = [address, city, postalCode].filter(Boolean).join(" ");

      if (!query) {
        return "";
      }

      return `https://www.google.com/maps?q=${encodeURIComponent(query)}`;
    };
    const dayMap: Record<string, string> = {
      Friday: "Fr",
      Monday: "Mo",
      Saturday: "Sa",
      Sunday: "Su",
      Thursday: "Th",
      Tuesday: "Tu",
      Wednesday: "We",
    };
    const daySchemaMap: Record<string, string> = {
      Friday: "https://schema.org/Friday",
      Monday: "https://schema.org/Monday",
      Saturday: "https://schema.org/Saturday",
      Sunday: "https://schema.org/Sunday",
      Thursday: "https://schema.org/Thursday",
      Tuesday: "https://schema.org/Tuesday",
      Wednesday: "https://schema.org/Wednesday",
    };
    const buildOpeningHours = (
      status: Record<string, "open" | "closed">,
      values: typeof defaultBusinessHoursValues,
    ) =>
      businessHoursRows
        .filter((row) => status[row.day] === "open")
        .map((row) => {
          const dayValues = values[row.day];

          return {
            closes: `${dayValues.closeHour}:${dayValues.closeMinute}`,
            day: row.day,
            opens: `${dayValues.openHour}:${dayValues.openMinute}`,
            shortDay: dayMap[row.day] || row.day.slice(0, 2),
          };
        });
    const buildOpeningHoursFromForm = (hours: WeeklyBusinessHours) =>
      businessHoursRows
        .filter((row) => hours[row.key]?.status === "open")
        .map((row) => {
          const dayValues = hours[row.key];

          return {
            closes: `${dayValues.closeHour}:${dayValues.closeMinute}`,
            day: row.day,
            opens: `${dayValues.openHour}:${dayValues.openMinute}`,
            shortDay: dayMap[row.day] || row.day.slice(0, 2),
          };
        });

    const physicianOpeningHours = buildOpeningHours(
      businessHoursStatus,
      businessHoursValues,
    );
    const physicianHospitalRefs = watchedValues.hospitalAffiliations.map(
      (hospital) => ({
        "@id": `${websiteUrl}#${slugify(hospital.name, "hospital")}`,
      }),
    );
    const physicianAvailableServices = watchedValues.services
      .filter((service) => service.name.trim() || service.link.trim())
      .map((service) => ({
        "@type": service.type || "MedicalProcedure",
        name: service.name,
        url: service.link,
      }));
    const physicianSocialProfiles = watchedValues.socialProfiles
      .map((profile) => profile.value.trim())
      .filter(Boolean);
    const medicalSpecialtyValues = watchedValues.medicalSpecialties
      .map((item) => item.trim())
      .filter(Boolean)
      .map(
        (item) =>
          specialtyLabelToSchemaUrl[item] ??
          `https://schema.org/${item.replace(/\s+/g, "")}`,
      );
    const physicianNode = {
      "@type": pageTypeMap[selectedPageType],
      "@id": physicianId,
      name: watchedValues.businessName,
      url: websiteUrl,
      description: watchedValues.description,
      telephone: watchedValues.phone,
      email: watchedValues.email,
      medicalSpecialty:
        medicalSpecialtyValues.length <= 1
          ? medicalSpecialtyValues[0] || undefined
          : medicalSpecialtyValues,
      logo: watchedValues.logoUrl || undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: watchedValues.streetAddress,
        addressLocality: watchedValues.locality,
        postalCode: watchedValues.postalCode,
        addressCountry: watchedValues.countryCode,
      },
      geo:
        watchedValues.latitude && watchedValues.longitude
          ? {
              "@type": "GeoCoordinates",
              latitude: Number(watchedValues.latitude),
              longitude: Number(watchedValues.longitude),
            }
          : undefined,
      hasMap: buildHasMapUrl(
        watchedValues.streetAddress,
        watchedValues.locality,
        watchedValues.postalCode,
        watchedValues.hasMapUrl,
      ),
      openingHours:
        physicianOpeningHours.length > 0
          ? physicianOpeningHours.map(
              (item) => `${item.shortDay} ${item.opens}-${item.closes}`,
            )
          : undefined,
      sameAs: physicianSocialProfiles.length
        ? physicianSocialProfiles
        : undefined,
      availableService:
        physicianAvailableServices.length > 0
          ? physicianAvailableServices
          : undefined,
      hospitalAffiliation:
        physicianHospitalRefs.length > 0 ? physicianHospitalRefs : undefined,
    };

    const hospitalNodes = watchedValues.hospitalAffiliations
      .filter((hospital) => hospital.name.trim())
      .map((hospital) => {
        const openingHoursSpecification = buildOpeningHoursFromForm(
          hospital.businessHours ?? createWeeklyBusinessHours(),
        ).map((item) => ({
          "@type": "OpeningHoursSpecification",
          closes: item.closes,
          dayOfWeek: daySchemaMap[item.day],
          opens: item.opens,
        }));

        return {
          "@type": "Hospital",
          "@id": `${websiteUrl}#${slugify(hospital.name, "hospital")}`,
          name: hospital.name,
          url: hospital.url || websiteUrl,
          telephone: hospital.telephone || watchedValues.phone,
          address: {
            "@type": "PostalAddress",
            streetAddress: hospital.streetAddress,
            addressLocality: hospital.city,
            postalCode: hospital.postalCode,
            addressCountry: hospital.countryCode,
          },
          geo:
            hospital.latitude && hospital.longitude
              ? {
                  "@type": "GeoCoordinates",
                  latitude: Number(hospital.latitude),
                  longitude: Number(hospital.longitude),
                }
              : undefined,
          hasMap: buildHasMapUrl(
            hospital.streetAddress,
            hospital.city,
            hospital.postalCode,
            hospital.hasMapUrl,
          ),
          openingHoursSpecification:
            openingHoursSpecification.length > 0
              ? openingHoursSpecification
              : undefined,
        };
      });

    const websiteNode = {
      "@type": "WebSite",
      "@id": `${websiteUrl}#website`,
      url: websiteUrl,
      name: watchedValues.websiteName,
      description: watchedValues.websiteDescription,
    };

    const breadcrumbNode = {
      "@type": "BreadcrumbList",
      "@id": `${websiteUrl}#breadcrumbs`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: websiteUrl,
        },
      ],
    };

    return JSON.stringify(
      {
        "@context": "https://schema.org",
        "@graph": [
          physicianNode,
          ...hospitalNodes,
          websiteNode,
          breadcrumbNode,
        ],
      },
      null,
      2,
    );
  }, [
    businessHoursStatus,
    businessHoursValues,
    selectedPageType,
    specialtyLabelToSchemaUrl,
    watchedValues,
  ]);

  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);

      return;
    }

    if (currentStep === 2) {
      clearErrors();

      try {
        await schemaGeneratorSchema.validate(watch(), { abortEarly: false });
      } catch (error) {
        if (!(error instanceof yup.ValidationError)) {
          return;
        }

        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof SchemaGeneratorFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      setCurrentStep(3);
    }
  };

  const handlePrev = () => {
    if (currentStep === 1) {
      return;
    }

    setCurrentStep((step) => step - 1);
  };

  const handleSave = handleSubmit(async (values) => {
    clearErrors();
    setSaveError("");

    try {
      await schemaGeneratorSchema.validate(values, { abortEarly: false });
    } catch (error) {
      if (!(error instanceof yup.ValidationError)) {
        return;
      }

      error.inner.forEach((issue) => {
        if (!issue.path) {
          return;
        }

        setError(issue.path as keyof SchemaGeneratorFormValues, {
          message: issue.message,
          type: "manual",
        });
      });

      return;
    }

    if (!values.clientId) {
      setSaveError("Select a client before saving this schema.");

      return;
    }

    if (!session?.accessToken) {
      setSaveError("You must be logged in to save this schema.");

      return;
    }

    const clientName =
      clientOptions.find((client) => client.id === values.clientId)?.name ??
      "Unknown client";
    const payload: SaveGeneratedSchemaRequestBody = {
      businessHours: buildWeeklyBusinessHoursFromUiState(
        businessHoursStatus,
        businessHoursValues,
      ),
      clientId: values.clientId,
      clientName,
      formValues: values,
      previewJson,
      schemaType: selectedPageType as GeneratedSchemaPageType,
    };

    try {
      setIsSaving(true);

      if (mode === "edit" && schemaId) {
        await generatedSchemasApi.updateGeneratedSchema(
          session.accessToken,
          schemaId,
          payload,
        );
      } else {
        await generatedSchemasApi.createGeneratedSchema(
          session.accessToken,
          payload,
        );
      }

      router.push("/dashboard/schema-generator");
      router.refresh();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save schema.",
      );
    } finally {
      setIsSaving(false);
    }
  });

  const submitSchema = () => {
    void handleSave();
  };

  const handleCopyPreview = async () => {
    try {
      await navigator.clipboard.writeText(previewJson);
      setPreviewActionMessage("Schema copied.");
    } catch {
      setPreviewActionMessage("Failed to copy schema.");
    }
  };

  const handleExportPreview = () => {
    try {
      const blob = new Blob([previewJson], {
        type: "text/plain;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const schemaLabel = selectedPageType.replace(/[^a-z0-9-]+/gi, "-");

      link.href = url;
      link.download = `${schemaLabel || "schema"}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setPreviewActionMessage("Schema exported.");
    } catch {
      setPreviewActionMessage("Failed to export schema.");
    }
  };

  const renderPersistedHospitalBusinessHoursRows = (index: number) => (
    <div className="space-y-1.5 pb-3">
      {businessHoursRows.map((row) => {
        const currentValue =
          watchedValues.hospitalAffiliations?.[index]?.businessHours?.[
            row.key
          ] ?? createWeeklyBusinessHours()[row.key];

        return (
          <div
            key={`${index}-${row.key}`}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex w-[200px] items-center justify-between gap-2">
              <span className="text-sm text-[#111827]">{row.day}</span>
              <Select
                aria-label={`${row.day} status`}
                classNames={{
                  base: "w-24",
                  trigger:
                    currentValue.status === "open"
                      ? "min-h-9 border-0 bg-[#ECFDF3] text-[#12B76A] shadow-none"
                      : "min-h-9 border-0 bg-[#FEF3F2] text-[#D92D20] shadow-none",
                  value: "text-sm",
                }}
                radius="full"
                selectedKeys={[currentValue.status]}
                size="sm"
                onSelectionChange={(keys) => {
                  const selectedKey =
                    keys === "all" ? null : (keys.currentKey ?? null);

                  setValue(
                    `hospitalAffiliations.${index}.businessHours.${row.key}.status`,
                    selectedKey === "closed" ? "closed" : "open",
                    { shouldDirty: true },
                  );
                }}
              >
                <SelectItem key="open">Open</SelectItem>
                <SelectItem key="closed">Closed</SelectItem>
              </Select>
            </div>

            {currentValue.status === "open" ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`${row.day} opening hour`}
                    classNames={{
                      base: "w-[50px]",
                      input: "text-center text-base font-medium text-primary",
                      inputWrapper:
                        "h-12 min-h-12 rounded-lg border-0 bg-[#EEF0FF] shadow-none",
                    }}
                    inputMode="numeric"
                    maxLength={2}
                    radius="sm"
                    value={currentValue.openHour}
                    onValueChange={(value) =>
                      setValue(
                        `hospitalAffiliations.${index}.businessHours.${row.key}.openHour`,
                        value.replace(/\D/g, "").slice(0, 2),
                        { shouldDirty: true },
                      )
                    }
                  />
                  <span className="text-lg font-semibold text-[#111827]">
                    :
                  </span>
                  <Input
                    aria-label={`${row.day} opening minute`}
                    classNames={{
                      base: "w-[50px]",
                      input: "text-center text-base font-medium text-[#111827]",
                      inputWrapper:
                        "h-12 min-h-12 rounded-lg border border-default-200 bg-white shadow-none",
                    }}
                    inputMode="numeric"
                    maxLength={2}
                    radius="sm"
                    value={currentValue.openMinute}
                    onValueChange={(value) =>
                      setValue(
                        `hospitalAffiliations.${index}.businessHours.${row.key}.openMinute`,
                        value.replace(/\D/g, "").slice(0, 2),
                        { shouldDirty: true },
                      )
                    }
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px w-[30px] border-t border-dashed border-[#98A2B3]" />
                  <div className="flex items-center justify-center text-primary">
                    <Clock3 size={18} />
                  </div>
                  <div className="h-px w-[30px] border-t border-dashed border-[#98A2B3]" />
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`${row.day} closing hour`}
                    classNames={{
                      base: "w-[50px]",
                      input: "text-center text-base font-medium text-primary",
                      inputWrapper:
                        "h-12 min-h-12 rounded-lg border-0 bg-[#EEF0FF] shadow-none",
                    }}
                    inputMode="numeric"
                    maxLength={2}
                    radius="sm"
                    value={currentValue.closeHour}
                    onValueChange={(value) =>
                      setValue(
                        `hospitalAffiliations.${index}.businessHours.${row.key}.closeHour`,
                        value.replace(/\D/g, "").slice(0, 2),
                        { shouldDirty: true },
                      )
                    }
                  />
                  <span className="text-lg font-semibold text-[#111827]">
                    :
                  </span>
                  <Input
                    aria-label={`${row.day} closing minute`}
                    classNames={{
                      base: "w-[50px]",
                      input: "text-center text-base font-medium text-[#111827]",
                      inputWrapper:
                        "h-12 min-h-12 rounded-lg border border-default-200 bg-white shadow-none",
                    }}
                    inputMode="numeric"
                    maxLength={2}
                    radius="sm"
                    value={currentValue.closeMinute}
                    onValueChange={(value) =>
                      setValue(
                        `hospitalAffiliations.${index}.businessHours.${row.key}.closeMinute`,
                        value.replace(/\D/g, "").slice(0, 2),
                        { shouldDirty: true },
                      )
                    }
                  />
                </div>
              </div>
            ) : (
              <div />
            )}
          </div>
        );
      })}
    </div>
  );

  const leftPane = (
    <div>
      <div className="grid gap-3 lg:grid-cols-3 mb-10">
        {stepCards.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;

          return (
            <div key={step.title} className={stepCardClasses(isActive)}>
              <div className="flex items-center gap-4">
                <div className={stepBadgeClasses(isActive)}>{stepNumber}</div>
                <div>
                  <p className="text-xs font-semibold text-[#111827]">
                    {step.title}
                  </p>
                  <p className="text-[8px] text-[#6B7280]">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {currentStep === 1 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {pageTypeCards.map((item) => {
            const Icon = item.icon;
            const isDisabled = !!item.isDisabled;
            const isSelected = selectedPageType === item.key;

            return (
              <button
                key={item.key}
                className={[
                  "rounded-lg border p-4 text-left transition-colors",
                  isDisabled ? "cursor-not-allowed opacity-50" : "",
                  isSelected
                    ? "border-primary bg-[#EEF0FF]"
                    : "border-default-200 bg-white",
                ].join(" ")}
                disabled={isDisabled}
                type="button"
                onClick={() => {
                  if (isDisabled) {
                    return;
                  }

                  setSelectedPageType(item.key);
                }}
              >
                <div className="space-y-7">
                  <div className="space-y-1.5">
                    <p className="text-lg font-semibold text-[#111827]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#6B7280]">{item.description}</p>
                  </div>
                  <div
                    className={[
                      "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                      isSelected
                        ? "bg-white text-primary"
                        : "bg-[#FFF9EA] text-[#F5B63E]",
                    ].join(" ")}
                  >
                    <Icon size={18} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {currentStep >= 2 ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="font-semibold text-[#111827]">
              1. Enter Business Information
            </p>
            <Accordion
              defaultExpandedKeys={
                currentStep === 2 ? ["core-details"] : undefined
              }
              selectionMode="multiple"
              variant="splitted"
            >
              <AccordionItem
                key="core-details"
                aria-label="Core Details"
                classNames={{
                  base: "shadow-none border border-default-200",
                }}
                title="Core Details"
              >
                <div className="space-y-5 pb-3">
                  <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                    <Controller
                      control={control}
                      name="type"
                      render={({ field }) => (
                        <div>
                          <p className={fieldLabelClassName}>Type</p>
                          <Select
                            errorMessage={errors.type?.message}
                            isInvalid={!!errors.type}
                            placeholder="Select type"
                            radius="sm"
                            selectedKeys={field.value ? [field.value] : []}
                            onSelectionChange={(keys) => {
                              const selectedKey =
                                keys === "all"
                                  ? null
                                  : (keys.currentKey ?? null);

                              field.onChange(
                                selectedKey ? String(selectedKey) : "",
                              );
                            }}
                          >
                            {schemaTypeOptions.map((option) => (
                              <SelectItem key={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                      )}
                    />
                    <Controller
                      control={control}
                      name="clientId"
                      render={({ field }) => (
                        <div>
                          <p className={fieldLabelClassName}>Client Name</p>
                          <Select
                            aria-label="Select client"
                            placeholder="Select Client"
                            radius="sm"
                            selectedKeys={field.value ? [field.value] : []}
                            onSelectionChange={(keys) => {
                              const selectedKey =
                                keys === "all"
                                  ? null
                                  : (keys.currentKey ?? null);

                              field.onChange(
                                selectedKey ? String(selectedKey) : "",
                              );
                            }}
                          >
                            {clientOptions.map((client) => (
                              <SelectItem key={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                      )}
                    />
                  </div>

                  <Controller
                    control={control}
                    name="businessName"
                    render={({ field }) => (
                      <div>
                        <p className={fieldLabelClassName}>Business Name</p>
                        <Input
                          errorMessage={errors.businessName?.message}
                          isInvalid={!!errors.businessName}
                          placeholder="Business Name"
                          radius="sm"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </div>
                    )}
                  />

                  <Controller
                    control={control}
                    name="description"
                    render={({ field }) => (
                      <div>
                        <p className={fieldLabelClassName}>
                          Business Description
                        </p>
                        <Textarea
                          errorMessage={errors.description?.message}
                          isInvalid={!!errors.description}
                          maxLength={160}
                          minRows={5}
                          placeholder="Enter business description"
                          radius="sm"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </div>
                    )}
                  />

                  <Controller
                    control={control}
                    name="medicalSpecialties"
                    render={({ field }) => (
                      <div>
                        <AutocompleteTokenField
                          errorMessage={errors.medicalSpecialties?.message}
                          label="Medical specialty (up to 3)"
                          maxTokens={3}
                          options={medicalSpecialtyOptions.map(
                            (option) => option.label,
                          )}
                          placeholder="Top 3 Medical Specialties"
                          tokens={field.value ?? []}
                          onChange={field.onChange}
                        />
                      </div>
                    )}
                  />

                  <Controller
                    control={control}
                    name="websiteName"
                    render={({ field }) => (
                      <div>
                        <p className={fieldLabelClassName}>Website Name</p>
                        <Input
                          errorMessage={errors.websiteName?.message}
                          isInvalid={!!errors.websiteName}
                          placeholder="Website Name"
                          radius="sm"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </div>
                    )}
                  />

                  <Controller
                    control={control}
                    name="websiteDescription"
                    render={({ field }) => (
                      <div>
                        <p className={fieldLabelClassName}>
                          Website Description
                        </p>
                        <Textarea
                          errorMessage={errors.websiteDescription?.message}
                          isInvalid={!!errors.websiteDescription}
                          minRows={3}
                          placeholder="Website Description"
                          radius="sm"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </div>
                    )}
                  />

                  <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                    <Controller
                      control={control}
                      name="websiteUrl"
                      render={({ field }) => (
                        <div>
                          <p className={fieldLabelClassName}>Website URL</p>
                          <Input
                            errorMessage={errors.websiteUrl?.message}
                            isInvalid={!!errors.websiteUrl}
                            placeholder="Website"
                            radius="sm"
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      control={control}
                      name="logoUrl"
                      render={({ field }) => (
                        <div>
                          <p className={fieldLabelClassName}>Logo URL</p>
                          <Input
                            errorMessage={errors.logoUrl?.message}
                            isInvalid={!!errors.logoUrl}
                            placeholder="Logo URL"
                            radius="sm"
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                  </div>

                  <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                    <Controller
                      control={control}
                      name="phone"
                      render={({ field }) => (
                        <div>
                          <p className={fieldLabelClassName}>Telephone</p>
                          <Input
                            errorMessage={errors.phone?.message}
                            isInvalid={!!errors.phone}
                            placeholder="+447823701873"
                            radius="sm"
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      control={control}
                      name="email"
                      render={({ field }) => (
                        <div>
                          <p className={fieldLabelClassName}>Business Email</p>
                          <Input
                            errorMessage={errors.email?.message}
                            isInvalid={!!errors.email}
                            placeholder="Business Email"
                            radius="sm"
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-[#4B5563]">Social Profiles</p>
                    {socialProfileFields.map((socialField, index) => (
                      <div
                        key={socialField.id}
                        className="grid gap-x-3 gap-y-3 md:grid-cols-[1fr_120px_48px]"
                      >
                        <Controller
                          control={control}
                          name={`socialProfiles.${index}.value`}
                          render={({ field }) => (
                            <Input
                              placeholder="Add link"
                              radius="sm"
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          )}
                        />
                        <Button
                          className="bg-primary text-white"
                          onPress={() => appendSocialProfile({ value: "" })}
                        >
                          + Add Link
                        </Button>
                        <Button
                          isIconOnly
                          className="border border-default-200 text-danger"
                          isDisabled={socialProfileFields.length === 1}
                          radius="sm"
                          variant="light"
                          onPress={() => removeSocialProfile(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionItem>

              <AccordionItem
                key="business-address"
                aria-label="Business Address"
                classNames={{
                  base: "shadow-none border border-default-200",
                }}
                title="Business Address"
              >
                <div className="space-y-5 pb-3">
                  <Controller
                    control={control}
                    name="streetAddress"
                    render={({ field }) => (
                      <div>
                        <p className={fieldLabelClassName}>Street Address</p>
                        <Input
                          errorMessage={errors.streetAddress?.message}
                          isInvalid={!!errors.streetAddress}
                          placeholder="Search address"
                          radius="sm"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </div>
                    )}
                  />

                  <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                    <Controller
                      control={control}
                      name="locality"
                      render={({ field }) => (
                        <div>
                          <p className={fieldLabelClassName}>City</p>
                          <Input
                            errorMessage={errors.locality?.message}
                            isInvalid={!!errors.locality}
                            placeholder="(City - e.g, London)"
                            radius="sm"
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      control={control}
                      name="region"
                      render={({ field }) => (
                        <div>
                          <p className={fieldLabelClassName}>Region</p>
                          <Input
                            errorMessage={errors.region?.message}
                            isInvalid={!!errors.region}
                            placeholder="(City - e.g, England)"
                            radius="sm"
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      control={control}
                      name="postalCode"
                      render={({ field }) => (
                        <div>
                          <p className={fieldLabelClassName}>Postal Code</p>
                          <Input
                            errorMessage={errors.postalCode?.message}
                            isInvalid={!!errors.postalCode}
                            placeholder="Postal Code"
                            radius="sm"
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      control={control}
                      name="countryCode"
                      render={({ field }) => (
                        <div>
                          <p className={fieldLabelClassName}>Country Code</p>
                          <Autocomplete
                            errorMessage={errors.countryCode?.message}
                            isInvalid={!!errors.countryCode}
                            items={countryAutocompleteItems}
                            placeholder="Select country code"
                            radius="sm"
                            selectedKey={field.value || null}
                            onSelectionChange={(key) => {
                              field.onChange(key ? String(key) : "");
                            }}
                          >
                            {(item) => (
                              <AutocompleteItem
                                key={item.key}
                                textValue={item.label}
                              >
                                {item.label}
                              </AutocompleteItem>
                            )}
                          </Autocomplete>
                        </div>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#111827]">
                      Geo Coordinates
                    </p>
                    <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                      <Controller
                        control={control}
                        name="latitude"
                        render={({ field }) => (
                          <div>
                            <p className="mb-1 text-xs text-[#6B7280]">
                              Latitude
                            </p>
                            <Input
                              errorMessage={errors.latitude?.message}
                              isInvalid={!!errors.latitude}
                              placeholder="Latitude"
                              radius="sm"
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          </div>
                        )}
                      />
                      <Controller
                        control={control}
                        name="longitude"
                        render={({ field }) => (
                          <div>
                            <p className="mb-1 text-xs text-[#6B7280]">
                              Longitude
                            </p>
                            <Input
                              errorMessage={errors.longitude?.message}
                              isInvalid={!!errors.longitude}
                              placeholder="Longitude"
                              radius="sm"
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  <Controller
                    control={control}
                    name="hasMapUrl"
                    render={({ field }) => (
                      <div>
                        <p className={fieldLabelClassName}>Has Map URL</p>
                        <Input
                          errorMessage={errors.hasMapUrl?.message}
                          isInvalid={!!errors.hasMapUrl}
                          placeholder="https://www.google.com/maps?q=..."
                          radius="sm"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </div>
                    )}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#111827]">
                      Service Areas
                    </p>
                    {serviceAreaFields.map((serviceAreaField, index) => (
                      <div
                        key={serviceAreaField.id}
                        className="grid gap-x-3 gap-y-3 md:grid-cols-[1fr_96px_48px]"
                      >
                        <Controller
                          control={control}
                          name={`serviceAreas.${index}.value`}
                          render={({ field }) => (
                            <Input
                              placeholder="Add Service Areas"
                              radius="sm"
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          )}
                        />
                        <Button
                          className="bg-primary text-white"
                          onPress={() => appendServiceArea({ value: "" })}
                        >
                          + Add
                        </Button>
                        <Button
                          isIconOnly
                          className="border border-default-200 text-danger"
                          isDisabled={serviceAreaFields.length === 1}
                          radius="sm"
                          variant="light"
                          onPress={() => removeServiceArea(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionItem>

              <AccordionItem
                key="business-hours"
                aria-label="Business Hours"
                classNames={{
                  base: "shadow-none border border-default-200",
                }}
                title="Business Hours"
              >
                {renderBusinessHoursRows(
                  businessHoursStatus,
                  setBusinessHoursStatus,
                  businessHoursValues,
                  setBusinessHoursValues,
                )}
              </AccordionItem>
            </Accordion>
          </div>

          <div className="space-y-2">
            <p className="text-lg font-semibold text-[#111827]">2. Services</p>
            <Accordion selectionMode="multiple" variant="splitted">
              <AccordionItem
                key="add-services"
                aria-label="Add Services"
                classNames={{
                  base: "shadow-none border border-default-200",
                }}
                title="Add Services"
              >
                <div className="space-y-1 pb-3">
                  <p className="text-sm font-medium text-[#111827]">
                    Available Services
                  </p>

                  {serviceFields.map((serviceField, index) => (
                    <div
                      key={serviceField.id}
                      className="grid gap-x-3 gap-y-3 md:grid-cols-[1fr_1.2fr_1.2fr_136px_40px]"
                    >
                      <Controller
                        control={control}
                        name={`services.${index}.type`}
                        render={({ field }) => (
                          <div>
                            <p className="mb-1 text-xs text-[#6B7280]">Type</p>
                            <Select
                              placeholder="MedicalProcedure"
                              radius="sm"
                              selectedKeys={field.value ? [field.value] : []}
                              onSelectionChange={(keys) => {
                                const selectedKey =
                                  keys === "all"
                                    ? null
                                    : (keys.currentKey ?? null);

                                field.onChange(
                                  selectedKey
                                    ? String(selectedKey)
                                    : "MedicalProcedure",
                                );
                              }}
                            >
                              {serviceTypeOptions.map((option) => (
                                <SelectItem key={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </Select>
                          </div>
                        )}
                      />

                      <Controller
                        control={control}
                        name={`services.${index}.name`}
                        render={({ field }) => (
                          <div>
                            <p className="mb-1 text-xs text-[#6B7280]">Name</p>
                            <Input
                              placeholder="Name of Service"
                              radius="sm"
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          </div>
                        )}
                      />

                      <Controller
                        control={control}
                        name={`services.${index}.link`}
                        render={({ field }) => (
                          <div>
                            <p className="mb-1 text-xs text-[#6B7280]">Link</p>
                            <Input
                              placeholder="Add URL"
                              radius="sm"
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          </div>
                        )}
                      />

                      <div className="flex items-end">
                        <Button
                          className="w-full bg-primary text-white"
                          onPress={() =>
                            appendService({
                              link: "",
                              name: "",
                              type: "MedicalProcedure",
                            })
                          }
                        >
                          + Add Service
                        </Button>
                      </div>

                      <div className="flex items-end">
                        <Button
                          isIconOnly
                          className="border border-default-200 text-danger"
                          isDisabled={serviceFields.length === 1}
                          radius="sm"
                          variant="light"
                          onPress={() => removeService(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="space-y-2">
            <p className="text-lg font-semibold text-[#111827]">
              3. Hospital Affiliation
            </p>
            <Accordion selectionMode="multiple" variant="splitted">
              <AccordionItem
                key="hospital-affiliation"
                aria-label="Add hospital affiliation"
                classNames={{
                  base: "shadow-none border border-default-200",
                }}
                title="Add hospital affiliation"
              >
                <div className="space-y-5 pb-3">
                  {hospitalAffiliationFields.map((hospitalField, index) => (
                    <div
                      key={hospitalField.id}
                      className="space-y-5 rounded-lg border border-default-200 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#111827]">
                          Hospital {index + 1}
                        </p>
                        <Button
                          isIconOnly
                          className="border border-default-200 text-danger"
                          isDisabled={hospitalAffiliationFields.length === 1}
                          radius="sm"
                          variant="light"
                          onPress={() => removeHospitalAffiliation(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>

                      <Controller
                        control={control}
                        name={`hospitalAffiliations.${index}.name`}
                        render={({ field }) => (
                          <div>
                            <p className={fieldLabelClassName}>Hospital Name</p>
                            <Input
                              placeholder="Hospital Name"
                              radius="sm"
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          </div>
                        )}
                      />

                      <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                        <Controller
                          control={control}
                          name={`hospitalAffiliations.${index}.url`}
                          render={({ field }) => (
                            <div>
                              <p className={fieldLabelClassName}>
                                Hospital URL
                              </p>
                              <Input
                                placeholder="https://example.com/contact-us/"
                                radius="sm"
                                value={field.value}
                                onValueChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                        <Controller
                          control={control}
                          name={`hospitalAffiliations.${index}.telephone`}
                          render={({ field }) => (
                            <div>
                              <p className={fieldLabelClassName}>Telephone</p>
                              <Input
                                errorMessage={
                                  errors.hospitalAffiliations?.[index]
                                    ?.telephone?.message
                                }
                                isInvalid={
                                  !!errors.hospitalAffiliations?.[index]
                                    ?.telephone
                                }
                                placeholder="Telephone"
                                radius="sm"
                                value={field.value}
                                onValueChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                      </div>

                      <Controller
                        control={control}
                        name={`hospitalAffiliations.${index}.streetAddress`}
                        render={({ field }) => (
                          <div>
                            <p className={fieldLabelClassName}>
                              Street Address
                            </p>
                            <Input
                              placeholder="Search address"
                              radius="sm"
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          </div>
                        )}
                      />

                      <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                        <Controller
                          control={control}
                          name={`hospitalAffiliations.${index}.city`}
                          render={({ field }) => (
                            <div>
                              <p className={fieldLabelClassName}>City</p>
                              <Input
                                placeholder="(City - e.g, London)"
                                radius="sm"
                                value={field.value}
                                onValueChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                        <Controller
                          control={control}
                          name={`hospitalAffiliations.${index}.region`}
                          render={({ field }) => (
                            <div>
                              <p className={fieldLabelClassName}>Region</p>
                              <Input
                                placeholder="(City - e.g, England)"
                                radius="sm"
                                value={field.value}
                                onValueChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                        <Controller
                          control={control}
                          name={`hospitalAffiliations.${index}.postalCode`}
                          render={({ field }) => (
                            <div>
                              <p className={fieldLabelClassName}>Postal Code</p>
                              <Input
                                placeholder="Postal Code"
                                radius="sm"
                                value={field.value}
                                onValueChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                        <Controller
                          control={control}
                          name={`hospitalAffiliations.${index}.countryCode`}
                          render={({ field }) => (
                            <div>
                              <p className={fieldLabelClassName}>
                                Country Code
                              </p>
                              <Autocomplete
                                errorMessage={
                                  errors.hospitalAffiliations?.[index]
                                    ?.countryCode?.message
                                }
                                isInvalid={
                                  !!errors.hospitalAffiliations?.[index]
                                    ?.countryCode
                                }
                                items={countryAutocompleteItems}
                                placeholder="Select country code"
                                radius="sm"
                                selectedKey={field.value || null}
                                onSelectionChange={(key) => {
                                  field.onChange(key ? String(key) : "");
                                }}
                              >
                                {(item) => (
                                  <AutocompleteItem
                                    key={item.key}
                                    textValue={item.label}
                                  >
                                    {item.label}
                                  </AutocompleteItem>
                                )}
                              </Autocomplete>
                            </div>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[#111827]">
                          Geo Coordinates
                        </p>
                        <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                          <Controller
                            control={control}
                            name={`hospitalAffiliations.${index}.latitude`}
                            render={({ field }) => (
                              <div>
                                <p className="mb-1 text-xs text-[#6B7280]">
                                  Latitude
                                </p>
                                <Input
                                  errorMessage={
                                    errors.hospitalAffiliations?.[index]
                                      ?.latitude?.message
                                  }
                                  isInvalid={
                                    !!errors.hospitalAffiliations?.[index]
                                      ?.latitude
                                  }
                                  placeholder="Latitude"
                                  radius="sm"
                                  value={field.value}
                                  onValueChange={field.onChange}
                                />
                              </div>
                            )}
                          />
                          <Controller
                            control={control}
                            name={`hospitalAffiliations.${index}.longitude`}
                            render={({ field }) => (
                              <div>
                                <p className="mb-1 text-xs text-[#6B7280]">
                                  Longitude
                                </p>
                                <Input
                                  errorMessage={
                                    errors.hospitalAffiliations?.[index]
                                      ?.longitude?.message
                                  }
                                  isInvalid={
                                    !!errors.hospitalAffiliations?.[index]
                                      ?.longitude
                                  }
                                  placeholder="Longitude"
                                  radius="sm"
                                  value={field.value}
                                  onValueChange={field.onChange}
                                />
                              </div>
                            )}
                          />
                        </div>
                      </div>

                      <Controller
                        control={control}
                        name={`hospitalAffiliations.${index}.hasMapUrl`}
                        render={({ field }) => (
                          <div>
                            <p className={fieldLabelClassName}>Has Map URL</p>
                            <Input
                              placeholder="https://www.google.com/maps?q=..."
                              radius="sm"
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          </div>
                        )}
                      />

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[#111827]">
                          Business Hours
                        </p>
                        {renderPersistedHospitalBusinessHoursRows(index)}
                      </div>
                    </div>
                  ))}

                  <Button
                    className="bg-primary text-white"
                    onPress={() =>
                      appendHospitalAffiliation(buildEmptyHospitalAffiliation())
                    }
                  >
                    + Add Hospital
                  </Button>
                </div>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-8">
        <Button
          className="min-w-[140px]"
          variant="bordered"
          onPress={currentStep === 1 ? undefined : handlePrev}
        >
          {currentStep === 1 ? "Cancel" : "Prev"}
        </Button>

        <Button
          className="min-w-[140px] bg-primary text-white"
          isLoading={isSaving}
          onPress={currentStep === 3 ? submitSchema : handleNext}
        >
          {currentStep === 3 ? "Save" : "Next"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[1.20fr_0.80fr]">
      <div className="min-w-0">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-[#111827]">
            {mode === "edit" ? "Edit Schema" : "Create Schema"}
          </h1>
        </div>
        {saveError ? (
          <p className="mb-4 text-sm text-danger">{saveError}</p>
        ) : null}
        {isLoadingSchema ? (
          <div className="rounded-lg border border-default-200 p-6 text-sm text-[#6B7280]">
            Loading schema...
          </div>
        ) : (
          leftPane
        )}
      </div>

      <Card className="max-h-[calc(100vh-120px)] border border-default-200 shadow-none">
        <CardHeader className="flex items-center justify-between border-b border-default-200">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">
              Preview JSON-LD Schema
            </h2>
            {previewActionMessage ? (
              <p className="mt-1 text-xs text-[#6B7280]">
                {previewActionMessage}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              radius="sm"
              variant="bordered"
              onPress={() => void handleCopyPreview()}
            >
              <Copy size={16} />
            </Button>
            <Button
              isIconOnly
              radius="sm"
              variant="bordered"
              onPress={handleExportPreview}
            >
              <Download size={16} />
            </Button>
          </div>
        </CardHeader>
        <CardBody className="overflow-hidden p-4">
          <div className="h-full rounded-xl border border-default-200 bg-[#FAFBFC] p-4">
            <pre className="h-full overflow-auto whitespace-pre-wrap break-words text-sm leading-7 text-[#111827]">
              {previewJson}
            </pre>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
