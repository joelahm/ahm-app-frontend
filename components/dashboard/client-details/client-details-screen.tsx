"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";

import Chart from "chart.js/auto";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import {
  Beaker,
  Briefcase,
  BriefcaseMedical,
  Copy,
  Download,
  FileText,
  Pipette,
  Stethoscope,
  TestTubeDiagonal,
  X,
} from "lucide-react";

import { clientsApi } from "@/apis/clients";
import {
  keywordResearchApi,
  type KeywordResearchCountryOption,
} from "@/apis/keyword-research";
import { usersApi } from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";
import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";
import { useDropdownData } from "@/components/dashboard/client-details/dropdown-data";
import { useAppToast } from "@/hooks/use-app-toast";
import { IntlPhoneInput } from "@/components/form/intl-phone-input";
import { TokenInputField } from "@/components/form/token-input-field";

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

type UploadValue = Array<File | string>;
type PracticeHour = {
  day: string;
  enabled: boolean;
  endMeridiem: "AM" | "PM";
  endTime: string;
  startMeridiem: "AM" | "PM";
  startTime: string;
};

const DEFAULT_COUNTRY_OPTION: KeywordResearchCountryOption = {
  key: "2826",
  label: "United Kingdom",
  locationCode: 2826,
  value: "GB",
};

const buildDefaultPracticeHours = (): PracticeHour[] =>
  days.map((day) => ({
    day,
    enabled: false,
    endMeridiem: "PM",
    endTime: "",
    startMeridiem: "AM",
    startTime: "",
  }));

const normalizePracticeHours = (
  items: Array<{
    day: string;
    enabled: boolean;
    endMeridiem: string;
    endTime: string;
    startMeridiem: string;
    startTime: string;
  }>,
) => {
  const defaultRows = buildDefaultPracticeHours();

  return defaultRows.map((defaultRow) => {
    const matched = items.find((item) => item.day === defaultRow.day);

    if (!matched) {
      return defaultRow;
    }

    return {
      day: matched.day,
      enabled: matched.enabled,
      endMeridiem: matched.endMeridiem === "AM" ? "AM" : "PM",
      endTime: matched.endTime,
      startMeridiem: matched.startMeridiem === "PM" ? "PM" : "AM",
      startTime: matched.startTime,
    } satisfies PracticeHour;
  });
};

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
      <CardBody className="space-y-5 px-4 py-4">{children}</CardBody>
    </Card>
  );
};

const UploadField = ({
  accept = ".jpg,.jpeg,.png,.gif,.pdf,.svg",
  files,
  label,
  onChange,
}: {
  accept?: string;
  files: UploadValue;
  label: string;
  onChange: Dispatch<SetStateAction<UploadValue>>;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const getFileLabel = (file: File | string) => {
    if (typeof file === "string") {
      const parts = file.split("/");

      return parts[parts.length - 1] || file;
    }

    return file.name;
  };

  const triggerDownload = (file: File | string) => {
    if (typeof window === "undefined") {
      return;
    }

    const link = document.createElement("a");

    if (typeof file === "string") {
      const isAbsolute = /^https?:\/\//i.test(file);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const normalizedBaseUrl = apiBaseUrl.replace(/\/$/, "");
      const normalizedPath = file.replace(/^\/+/, "");

      link.href =
        isAbsolute || !normalizedBaseUrl
          ? file
          : `${normalizedBaseUrl}/${normalizedPath}`;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.download = getFileLabel(file);
      link.click();

      return;
    }

    const objectUrl = URL.createObjectURL(file);

    link.href = objectUrl;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <div>
      <p className={fieldLabel}>{label}</p>
      {files.length > 0 ? (
        <div className="mb-2 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${label}-${index}`}
              className="flex items-center justify-between rounded-md border border-default-200 bg-white px-3 py-2"
            >
              <p className="truncate pr-2 text-xs text-[#111827]">
                {getFileLabel(file)}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  isIconOnly
                  size="sm"
                  type="button"
                  variant="light"
                  onPress={() => {
                    triggerDownload(file);
                  }}
                >
                  <Download size={14} />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  type="button"
                  variant="light"
                  onPress={() => {
                    onChange((previousFiles) =>
                      previousFiles.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    );
                  }}
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="rounded-lg border border-dashed border-[#D1D5DB] p-6 text-center bg-[#F9FAFB]">
        <input
          ref={inputRef}
          multiple
          accept={accept}
          className="hidden"
          type="file"
          onChange={(event) => {
            const selectedFiles = Array.from(event.target.files ?? []);

            if (selectedFiles.length === 0) {
              return;
            }

            onChange((previousFiles) => [...previousFiles, ...selectedFiles]);
            event.target.value = "";
          }}
        />
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
          onPress={() => {
            inputRef.current?.click();
          }}
        >
          Choose File
        </Button>
      </div>
    </div>
  );
};

const DayHourRow = ({
  day,
  value,
  onChange,
}: {
  day: string;
  value: PracticeHour;
  onChange: (nextValue: PracticeHour) => void;
}) => {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-default-200 p-2">
      <Switch
        isSelected={value.enabled}
        size="sm"
        onValueChange={(checked) => {
          onChange({ ...value, enabled: checked });
        }}
      />
      <p className="min-w-20 text-sm text-[#111827]">{day}</p>
      <Input
        className="max-w-20"
        radius="sm"
        size="sm"
        value={value.startTime}
        onChange={(event) => {
          onChange({ ...value, startTime: event.target.value });
        }}
      />
      <Select
        className="max-w-16"
        radius="sm"
        selectedKeys={[value.startMeridiem.toLowerCase()]}
        size="sm"
        onSelectionChange={(keys) => {
          const selected = Array.from(keys as Set<string>)[0] ?? "am";

          onChange({
            ...value,
            startMeridiem: selected === "pm" ? "PM" : "AM",
          });
        }}
      >
        <SelectItem key="am">AM</SelectItem>
        <SelectItem key="pm">PM</SelectItem>
      </Select>
      <Input
        className="max-w-20"
        radius="sm"
        size="sm"
        value={value.endTime}
        onChange={(event) => {
          onChange({ ...value, endTime: event.target.value });
        }}
      />
      <Select
        className="max-w-16"
        radius="sm"
        selectedKeys={[value.endMeridiem.toLowerCase()]}
        size="sm"
        onSelectionChange={(keys) => {
          const selected = Array.from(keys as Set<string>)[0] ?? "pm";

          onChange({
            ...value,
            endMeridiem: selected === "am" ? "AM" : "PM",
          });
        }}
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

const hasTextValue = (value: string | null | undefined) =>
  Boolean(value?.trim());

const hasItems = (items: unknown[] | null | undefined) =>
  Array.isArray(items) && items.length > 0;

const hasCompletedPracticeHours = (items: PracticeHour[]) =>
  items.some(
    (item) =>
      item.enabled &&
      hasTextValue(item.startTime) &&
      hasTextValue(item.endTime) &&
      hasTextValue(item.startMeridiem) &&
      hasTextValue(item.endMeridiem),
  );

export const ClientDetailsScreen = ({ slug }: { slug: string }) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const formattedClientName = slug.replace(/-/g, " ");
  const { practiceTypes } = useDropdownData();
  const [countryOptions, setCountryOptions] = useState<
    KeywordResearchCountryOption[]
  >([]);
  const [isLoadingCountryOptions, setIsLoadingCountryOptions] = useState(false);
  const [clientId, setClientId] = useState<string>(slug);
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [assignedUserSearch, setAssignedUserSearch] = useState("");
  const [assignedUsers, setAssignedUsers] = useState<
    Array<{ email: string; id: string; label: string }>
  >([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const [fetchedClientName, setFetchedClientName] = useState("");
  const [topMedicalSpecialties, setTopMedicalSpecialties] = useState<string[]>(
    [],
  );
  const [otherMedicalSpecialties, setOtherMedicalSpecialties] = useState<
    string[]
  >([]);
  const [subSpecialties, setSubSpecialties] = useState<string[]>([]);
  const [specialInterests, setSpecialInterests] = useState<string[]>([]);
  const [topTreatments, setTopTreatments] = useState<string[]>([]);
  const [treatmentAndServices, setTreatmentAndServices] = useState<string[]>(
    [],
  );
  const [conditionsTreated, setConditionsTreated] = useState<string[]>([]);
  const [practiceIntroduction, setPracticeIntroduction] = useState("");
  const [uniqueToCompetitors, setUniqueToCompetitors] = useState("");
  const [practiceHours, setPracticeHours] = useState<PracticeHour[]>(
    buildDefaultPracticeHours(),
  );
  const [highQualityHeadshot, setHighQualityHeadshot] = useState<UploadValue>(
    [],
  );
  const [yourCv, setYourCv] = useState<UploadValue>([]);
  const [practiceLocationInteriorPhoto, setPracticeLocationInteriorPhoto] =
    useState<UploadValue>([]);
  const [practiceLocationExteriorPhoto, setPracticeLocationExteriorPhoto] =
    useState<UploadValue>([]);
  const [colorGuide, setColorGuide] = useState<UploadValue>([]);
  const [logo, setLogo] = useState<UploadValue>([]);
  const filteredCountryOptions = useMemo(() => {
    const normalizedQuery = countrySearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return countryOptions;
    }

    const matchedCountries = countryOptions.filter((country) =>
      country.label.toLowerCase().includes(normalizedQuery),
    );

    return matchedCountries.length > 0 ? matchedCountries : countryOptions;
  }, [countryOptions, countrySearch]);
  const filteredAssignedUsers = useMemo(() => {
    const normalizedQuery = assignedUserSearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return assignedUsers;
    }

    return assignedUsers.filter((user) => {
      return (
        user.label.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [assignedUserSearch, assignedUsers]);

  useEffect(() => {
    if (!assignedToId) {
      return;
    }

    const selectedUser = assignedUsers.find((user) => user.id === assignedToId);

    if (!selectedUser) {
      return;
    }

    setAssignedUserSearch(selectedUser.label);
  }, [assignedToId, assignedUsers]);
  const {
    control,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientDetailsFormValues>({
    defaultValues: {
      clientName: "",
      businessName: "",
      niche: "",
      personalEmail: "",
      practiceEmail: "",
      businessPhone: "",
      website: "",
      country: "",
      typeOfPractice: "",
      profession: "",
      addressLine1: "",
      addressLine2: "",
      cityState: "",
      visibleArea: "",
      postCode: "",
      gbpLink: "",
      facebook: "",
      instagram: "",
      linkedin: "",
      websiteLoginLink: "",
      websiteUsername: "",
      websitePassword: "",
      googleAnalytics: "",
      googleSearchConsole: "",
    },
    mode: "onBlur",
  });
  const watchedValues = watch();
  const completionPercentage = useMemo(() => {
    const completionChecks = [
      hasTextValue(watchedValues.clientName),
      hasTextValue(watchedValues.businessName),
      hasTextValue(watchedValues.niche),
      hasTextValue(watchedValues.personalEmail),
      hasTextValue(watchedValues.practiceEmail),
      hasTextValue(watchedValues.businessPhone),
      hasTextValue(watchedValues.website),
      hasTextValue(watchedValues.country),
      hasTextValue(watchedValues.typeOfPractice),
      hasTextValue(watchedValues.profession),
      hasTextValue(watchedValues.addressLine1),
      hasTextValue(watchedValues.addressLine2),
      hasTextValue(watchedValues.cityState),
      hasTextValue(watchedValues.visibleArea),
      hasTextValue(watchedValues.postCode),
      hasTextValue(watchedValues.gbpLink),
      hasTextValue(watchedValues.facebook),
      hasTextValue(watchedValues.instagram),
      hasTextValue(watchedValues.linkedin),
      hasTextValue(watchedValues.websiteLoginLink),
      hasTextValue(watchedValues.websiteUsername),
      hasTextValue(watchedValues.websitePassword),
      hasTextValue(watchedValues.googleAnalytics),
      hasTextValue(watchedValues.googleSearchConsole),
      hasTextValue(assignedToId),
      hasItems(topMedicalSpecialties),
      hasItems(otherMedicalSpecialties),
      hasItems(subSpecialties),
      hasItems(specialInterests),
      hasItems(topTreatments),
      hasItems(treatmentAndServices),
      hasItems(conditionsTreated),
      hasTextValue(practiceIntroduction),
      hasTextValue(uniqueToCompetitors),
      hasCompletedPracticeHours(practiceHours),
      hasItems(highQualityHeadshot),
      hasItems(yourCv),
      hasItems(practiceLocationInteriorPhoto),
      hasItems(practiceLocationExteriorPhoto),
      hasItems(colorGuide),
      hasItems(logo),
    ];
    const completedFields = completionChecks.filter(Boolean).length;

    return Math.round((completedFields / completionChecks.length) * 100);
  }, [
    assignedToId,
    colorGuide,
    conditionsTreated,
    highQualityHeadshot,
    logo,
    otherMedicalSpecialties,
    practiceHours,
    practiceIntroduction,
    practiceLocationExteriorPhoto,
    practiceLocationInteriorPhoto,
    specialInterests,
    subSpecialties,
    topMedicalSpecialties,
    topTreatments,
    treatmentAndServices,
    uniqueToCompetitors,
    watchedValues,
    yourCv,
  ]);

  useEffect(() => {
    if (!session) {
      setCountryOptions([]);

      return;
    }

    let isMounted = true;

    const loadCountries = async () => {
      try {
        setIsLoadingCountryOptions(true);
        const accessToken = await getValidAccessToken();
        const response = await keywordResearchApi.getCountries(accessToken);
        const countries = Array.isArray(response?.countries)
          ? response.countries
          : [];
        const resolvedCountries =
          countries.length > 0 ? countries : [DEFAULT_COUNTRY_OPTION];

        if (!isMounted) {
          return;
        }

        setCountryOptions(
          resolvedCountries.map((country) => ({
            ...country,
            key: String(country.locationCode),
          })),
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setCountryOptions([]);
      } finally {
        if (isMounted) {
          setIsLoadingCountryOptions(false);
        }
      }
    };

    void loadCountries();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let isMounted = true;

    const hydrateClient = async () => {
      setDetailsError("");

      try {
        const accessToken = await getValidAccessToken();
        const client = await clientsApi.getClientById(accessToken, slug);

        if (!isMounted) {
          return;
        }

        setClientId(String(client.id));
        setAssignedToId(
          client.assignedTo !== null ? String(client.assignedTo) : "",
        );
        setFetchedClientName(client.clientName ?? client.businessName ?? "");
        setCountrySearch(client.country ?? "");
        setTopMedicalSpecialties(client.topMedicalSpecialties);
        setOtherMedicalSpecialties(client.otherMedicalSpecialties);
        setSubSpecialties(client.subSpecialties);
        setSpecialInterests(client.specialInterests);
        setTopTreatments(client.topTreatments);
        setTreatmentAndServices(client.treatmentAndServices);
        setConditionsTreated(client.conditionsTreated);
        setPracticeIntroduction(client.practiceIntroduction ?? "");
        setUniqueToCompetitors(client.uniqueToCompetitors ?? "");
        setPracticeHours(normalizePracticeHours(client.practiceHours));
        setHighQualityHeadshot(client.highQualityHeadshot);
        setYourCv(client.yourCv);
        setPracticeLocationInteriorPhoto(client.practiceLocationInteriorPhoto);
        setPracticeLocationExteriorPhoto(client.practiceLocationExteriorPhoto);
        setColorGuide(client.colorGuide);
        setLogo(client.logo);
        reset((previousValues) => ({
          ...previousValues,
          addressLine1: client.addressLine1 ?? "",
          addressLine2: client.addressLine2 ?? "",
          businessName: client.businessName ?? "",
          businessPhone: client.businessPhone ?? "",
          cityState: client.cityState ?? "",
          clientName: client.clientName ?? "",
          country: client.country ?? "",
          facebook: client.facebook ?? "",
          gbpLink: client.gbpLink ?? "",
          googleAnalytics: client.googleAnalytics ?? "",
          googleSearchConsole: client.googleSearchConsole ?? "",
          instagram: client.instagram ?? "",
          linkedin: client.linkedin ?? "",
          niche: client.niche ?? "",
          postCode: client.postCode ?? "",
          personalEmail: client.personalEmail ?? "",
          profession: client.profession ?? "",
          practiceEmail: client.practiceEmail ?? "",
          typeOfPractice: client.typeOfPractice ?? "",
          visibleArea: client.visibleArea ?? "",
          website: client.website ?? "",
          websiteLoginLink: client.websiteLoginLink ?? "",
          websitePassword: client.websitePassword ?? "",
          websiteUsername: client.websiteUsername ?? "",
        }));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDetailsError(
          error instanceof Error
            ? error.message
            : "Failed to load client details.",
        );
      }
    };

    void hydrateClient();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, reset, session, slug]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let isMounted = true;

    const hydrateUsers = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const allUsers: Array<{
          email: string;
          firstName: string | null;
          id: number;
          lastName: string | null;
        }> = [];
        let page = 1;
        let hasNext = true;

        while (hasNext) {
          const response = await usersApi.getUsers(accessToken, {
            limit: 100,
            page,
          });

          allUsers.push(
            ...response.users.map((user) => ({
              email: user.email,
              firstName: user.firstName,
              id: user.id,
              lastName: user.lastName,
            })),
          );

          hasNext = Boolean(response.pagination?.hasNext);
          page += 1;
        }

        if (!isMounted) {
          return;
        }

        const mappedUsers = allUsers.map((user) => {
          const fullName = [user.firstName, user.lastName]
            .map((value) => value?.trim() ?? "")
            .filter(Boolean)
            .join(" ");

          return {
            email: user.email,
            id: String(user.id),
            label: fullName || user.email,
          };
        });

        setAssignedUsers(mappedUsers);
      } catch {
        if (!isMounted) {
          return;
        }

        setAssignedUsers([]);
      }
    };

    void hydrateUsers();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, session]);

  const onSubmit = async (values: ClientDetailsFormValues) => {
    clearErrors();
    setDetailsError("");

    try {
      await clientDetailsSchema.validate(values, { abortEarly: false });
      const accessToken = await getValidAccessToken();

      const payload = (() => {
        const formData = new FormData();
        const appendStringArray = (key: string, items: string[]) => {
          items.forEach((item) => {
            formData.append(`${key}[]`, item);
          });
        };
        const appendFiles = (key: string, items: UploadValue) => {
          items.forEach((item) => {
            if (item instanceof File) {
              formData.append(`${key}[]`, item);
            }
          });
        };
        const basePayload = {
          assignedTo: assignedToId,
          addressLine1: values.addressLine1,
          addressLine2: values.addressLine2,
          businessName: values.businessName,
          businessPhone: values.businessPhone,
          cityState: values.cityState,
          clientName: values.clientName,
          conditionsTreated,
          country: values.country,
          facebook: values.facebook,
          gbpLink: values.gbpLink,
          googleAnalytics: values.googleAnalytics,
          googleSearchConsole: values.googleSearchConsole,
          instagram: values.instagram,
          linkedin: values.linkedin,
          niche: values.niche,
          otherMedicalSpecialties,
          personalEmail: values.personalEmail,
          postCode: values.postCode,
          practiceEmail: values.practiceEmail,
          practiceHours,
          practiceIntroduction,
          profession: values.profession,
          specialInterests,
          subSpecialties,
          topMedicalSpecialties,
          topTreatments,
          treatmentAndServices,
          typeOfPractice: values.typeOfPractice,
          uniqueToCompetitors,
          visibleArea: values.visibleArea,
          website: values.website,
          websiteLoginLink: values.websiteLoginLink,
          websitePassword: values.websitePassword,
          websiteUsername: values.websiteUsername,
        };

        if (basePayload.assignedTo.trim()) {
          formData.append("assignedTo", basePayload.assignedTo.trim());
        }
        formData.append("addressLine1", basePayload.addressLine1);
        formData.append("addressLine2", basePayload.addressLine2);
        formData.append("businessName", basePayload.businessName);
        formData.append("businessPhone", basePayload.businessPhone);
        formData.append("cityState", basePayload.cityState);
        formData.append("clientName", basePayload.clientName);
        formData.append("country", basePayload.country);
        formData.append("facebook", basePayload.facebook);
        formData.append("gbpLink", basePayload.gbpLink);
        formData.append("googleAnalytics", basePayload.googleAnalytics);
        formData.append("googleSearchConsole", basePayload.googleSearchConsole);
        formData.append("instagram", basePayload.instagram);
        formData.append("linkedin", basePayload.linkedin);
        formData.append("niche", basePayload.niche);
        formData.append("personalEmail", basePayload.personalEmail);
        formData.append("postCode", basePayload.postCode);
        formData.append("practiceEmail", basePayload.practiceEmail);
        formData.append(
          "practiceHours",
          JSON.stringify(basePayload.practiceHours),
        );
        formData.append(
          "practiceIntroduction",
          basePayload.practiceIntroduction,
        );
        formData.append("profession", basePayload.profession);
        formData.append("typeOfPractice", basePayload.typeOfPractice);
        formData.append("uniqueToCompetitors", basePayload.uniqueToCompetitors);
        formData.append("visibleArea", basePayload.visibleArea);
        formData.append("website", basePayload.website);
        formData.append("websiteLoginLink", basePayload.websiteLoginLink);
        formData.append("websitePassword", basePayload.websitePassword);
        formData.append("websiteUsername", basePayload.websiteUsername);

        appendStringArray(
          "topMedicalSpecialties",
          basePayload.topMedicalSpecialties,
        );
        appendStringArray(
          "otherMedicalSpecialties",
          basePayload.otherMedicalSpecialties,
        );
        appendStringArray("subSpecialties", basePayload.subSpecialties);
        appendStringArray("specialInterests", basePayload.specialInterests);
        appendStringArray("topTreatments", basePayload.topTreatments);
        appendStringArray(
          "treatmentAndServices",
          basePayload.treatmentAndServices,
        );
        appendStringArray("conditionsTreated", basePayload.conditionsTreated);

        appendFiles("highQualityHeadshot", highQualityHeadshot);
        appendFiles("yourCv", yourCv);
        appendFiles(
          "practiceLocationInteriorPhoto",
          practiceLocationInteriorPhoto,
        );
        appendFiles(
          "practiceLocationExteriorPhoto",
          practiceLocationExteriorPhoto,
        );
        appendFiles("colorGuide", colorGuide);
        appendFiles("logo", logo);

        return formData;
      })();
      const updatedClient = await clientsApi.updateClientById(
        accessToken,
        clientId,
        payload,
      );

      setClientId(String(updatedClient.id));
      setFetchedClientName(
        updatedClient.clientName ?? updatedClient.businessName ?? "",
      );
      setCountrySearch(updatedClient.country ?? values.country);
      toast.success("Client details saved.");
    } catch (error) {
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

        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save client details.";

      setDetailsError(errorMessage);
      toast.danger("Failed to save client details", {
        description: errorMessage,
      });
    }
  };

  return (
    <section className="space-y-4 pl-64 relative">
      <ClientProfileAside
        activeKey="details"
        clientName={fetchedClientName || formattedClientName}
        slug={slug}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4 pl-6">
          <Card className={sectionCard} shadow="none">
            <CardBody className="flex flex-row items-center justify-between px-4 py-3">
              <h3 className="text-base font-semibold text-[#111827]">
                Client Details
              </h3>
              <div className="flex items-center gap-2 text-xs text-default-500">
                <span>{completionPercentage}% Completed</span>
                <CompletionDoughnut percentage={completionPercentage} />
              </div>
            </CardBody>
          </Card>

          <DetailSection title="Client Information">
            {detailsError ? (
              <p className="text-sm text-danger">{detailsError}</p>
            ) : null}
            <div className="flex flex-row items-center">
              <Briefcase color="#022279" size={20} />
              <p className={fieldLabel + " !mb-0 mr-2 ml-1"}>Client ID</p>
              <span className="text-sm font-semibold text-[#111827]">
                {clientId}
              </span>
              <Button
                isIconOnly
                size="sm"
                startContent={<Copy size={14} />}
                variant="light"
                onPress={() => {
                  navigator.clipboard.writeText(clientId);
                }}
              />
              <div className="ml-6 min-w-[260px] flex flex-row items-center">
                <p className={fieldLabel + " !mb-1 flex-none mr-2"}>
                  Assigned to
                </p>
                <Autocomplete
                  allowsCustomValue={false}
                  inputValue={assignedUserSearch}
                  items={filteredAssignedUsers}
                  menuTrigger="focus"
                  placeholder="Select user"
                  radius="sm"
                  selectedKey={assignedToId || null}
                  size="sm"
                  onInputChange={setAssignedUserSearch}
                  onSelectionChange={(key) => {
                    setAssignedToId(typeof key === "string" ? key : "");
                    const selectedUser = assignedUsers.find(
                      (user) => user.id === key,
                    );

                    if (selectedUser) {
                      setAssignedUserSearch(selectedUser.label);
                    }
                  }}
                >
                  {(item) => (
                    <AutocompleteItem key={item.id} textValue={item.label}>
                      <div className="flex flex-col">
                        <span className="text-sm text-[#111827]">
                          {item.label}
                        </span>
                        <span className="text-xs text-default-500">
                          {item.email}
                        </span>
                      </div>
                    </AutocompleteItem>
                  )}
                </Autocomplete>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className={fieldLabel}>
                  Client Name (For solo practitioner)
                </p>
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
                <p className={fieldLabel}>
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
              <p className={fieldLabel}>
                Niche <span className="text-danger">*</span>
              </p>
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
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className={fieldLabel}>Personal Email Address</p>
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
                <p className={fieldLabel}>Practice Email Address</p>
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
                <p className={fieldLabel}>Business Phone Number</p>
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
              <p className={fieldLabel}>Website</p>
              <Controller
                control={control}
                name="website"
                render={({ field }) => (
                  <Input
                    errorMessage={errors.website?.message}
                    isInvalid={!!errors.website}
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
              <p className={fieldLabel}>Country</p>
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <Autocomplete
                    allowsCustomValue={false}
                    errorMessage={errors.country?.message}
                    inputValue={countrySearch}
                    isInvalid={!!errors.country}
                    isLoading={isLoadingCountryOptions}
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
                      setValue("cityState", "", { shouldValidate: true });
                      setValue("visibleArea", "", { shouldValidate: true });
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
                      selectedKeys={field.value ? [field.value] : []}
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
                <Controller
                  control={control}
                  name="profession"
                  render={({ field }) => (
                    <Input
                      errorMessage={errors.profession?.message}
                      isInvalid={!!errors.profession}
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

            <div className="grid gap-3 md:grid-cols-2">
              <TokenInputField
                label="Top 3 Medical Specialties"
                maxTokens={3}
                placeholder="Add top 3 medical specialties"
                startContent={
                  <Stethoscope className="text-[#585763]" size={18} />
                }
                tokens={topMedicalSpecialties}
                onChange={setTopMedicalSpecialties}
              />
              <TokenInputField
                label="Other Medical Specialty"
                placeholder="Add other medical specialty(s)"
                startContent={
                  <BriefcaseMedical className="text-[#585763]" size={18} />
                }
                tokens={otherMedicalSpecialties}
                onChange={setOtherMedicalSpecialties}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TokenInputField
                label="Sub-specialty"
                placeholder="Add sub-specialty"
                startContent={
                  <TestTubeDiagonal className="text-[#585763]" size={18} />
                }
                tokens={subSpecialties}
                onChange={setSubSpecialties}
              />
              <TokenInputField
                label="Top 5 Special Interests You Would Like to Be Known For"
                placeholder="Add top 5 special interests"
                startContent={<Beaker className="text-[#585763]" size={18} />}
                tokens={specialInterests}
                onChange={setSpecialInterests}
              />
            </div>

            <TokenInputField
              label="Top 3 Treatments You Want To Be Visible For"
              placeholder="Add top 3 treatments"
              startContent={<Pipette className="text-[#585763]" size={18} />}
              tokens={topTreatments}
              onChange={setTopTreatments}
            />

            <div>
              <p className={fieldLabel}>Practice Introduction</p>
              <Textarea
                minRows={2}
                radius="sm"
                value={practiceIntroduction}
                onChange={(event) => {
                  setPracticeIntroduction(event.target.value);
                }}
              />
            </div>
            <div>
              <p className={fieldLabel}>
                What makes your pratice unique to competitors *
              </p>
              <Textarea
                minRows={3}
                radius="sm"
                value={uniqueToCompetitors}
                onChange={(event) => {
                  setUniqueToCompetitors(event.target.value);
                }}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <UploadField
                files={highQualityHeadshot}
                label="High Quality Headshot"
                onChange={setHighQualityHeadshot}
              />
              <UploadField
                files={yourCv}
                label="Your CV"
                onChange={setYourCv}
              />
              <UploadField
                files={practiceLocationInteriorPhoto}
                label="Practice Location Interior Photo"
                onChange={setPracticeLocationInteriorPhoto}
              />
              <UploadField
                files={practiceLocationExteriorPhoto}
                label="Practice Location Exterior Photo"
                onChange={setPracticeLocationExteriorPhoto}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-1">
              <div>
                <p className={fieldLabel}>Address Line 1</p>
                <Controller
                  control={control}
                  name="addressLine1"
                  render={({ field }) => (
                    <Input
                      errorMessage={errors.addressLine1?.message}
                      isInvalid={!!errors.addressLine1}
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
                <p className={fieldLabel}>Address Line 2</p>
                <Controller
                  control={control}
                  name="addressLine2"
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
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className={fieldLabel}>Country</p>
                <Controller
                  control={control}
                  name="country"
                  render={({ field }) => (
                    <Autocomplete
                      allowsCustomValue={false}
                      errorMessage={errors.country?.message}
                      inputValue={countrySearch}
                      isInvalid={!!errors.country}
                      isLoading={isLoadingCountryOptions}
                      items={filteredCountryOptions}
                      menuTrigger="focus"
                      placeholder="Select country"
                      radius="sm"
                      selectedKey={
                        countryOptions.find(
                          (countryOption) =>
                            countryOption.label === field.value,
                        )?.key ?? null
                      }
                      size="sm"
                      onInputChange={(value) => {
                        setCountrySearch(value);
                      }}
                      onSelectionChange={(key) => {
                        const selectedCountry = countryOptions.find(
                          (countryOption) => countryOption.key === key,
                        );

                        field.onChange(selectedCountry?.label ?? "");
                        setCountrySearch(selectedCountry?.label ?? "");
                        setValue("cityState", "", { shouldValidate: true });
                        setValue("visibleArea", "", { shouldValidate: true });
                      }}
                    >
                      {(countryOption) => (
                        <AutocompleteItem key={countryOption.key}>
                          {countryOption.label}
                        </AutocompleteItem>
                      )}
                    </Autocomplete>
                  )}
                />
              </div>
              <div>
                <p className={fieldLabel}>City/State</p>
                <Controller
                  control={control}
                  name="cityState"
                  render={({ field }) => (
                    <Input
                      errorMessage={errors.cityState?.message}
                      isInvalid={!!errors.cityState}
                      placeholder="Enter city/state"
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
                <p className={fieldLabel}>Post Code</p>
                <Controller
                  control={control}
                  name="postCode"
                  render={({ field }) => (
                    <Input
                      errorMessage={errors.postCode?.message}
                      isInvalid={!!errors.postCode}
                      radius="sm"
                      size="sm"
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="md:col-span-2">
                <p className={fieldLabel}>1 Area You Want to Be Visible in</p>
                <Controller
                  control={control}
                  name="visibleArea"
                  render={({ field }) => (
                    <Input
                      errorMessage={errors.visibleArea?.message}
                      isInvalid={!!errors.visibleArea}
                      placeholder="Enter area"
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
              <p className={fieldLabel}>Practice Hours</p>
              <div className="grid gap-2 md:grid-cols-2">
                {days.map((day, index) => (
                  <DayHourRow
                    key={day}
                    day={day}
                    value={practiceHours[index]}
                    onChange={(nextValue) => {
                      setPracticeHours((previousHours) =>
                        previousHours.map((item, itemIndex) =>
                          itemIndex === index ? nextValue : item,
                        ),
                      );
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className={fieldLabel}>Link to Google Business Profile</p>
              <Controller
                control={control}
                name="gbpLink"
                render={({ field }) => (
                  <Input
                    errorMessage={errors.gbpLink?.message}
                    isInvalid={!!errors.gbpLink}
                    placeholder="https://business.google.com/..."
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
              <p className={fieldLabel}>Social Media Links</p>
              <div className="space-y-2">
                <Controller
                  control={control}
                  name="facebook"
                  render={({ field }) => (
                    <Input
                      errorMessage={errors.facebook?.message}
                      isInvalid={!!errors.facebook}
                      radius="sm"
                      size="sm"
                      startContent={
                        <div className="pointer-events-none flex items-center border-r-1 border-default-300 pr-2 min-w-20">
                          <span className="text-default-400 text-small">
                            Facebook
                          </span>
                        </div>
                      }
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="instagram"
                  render={({ field }) => (
                    <Input
                      errorMessage={errors.instagram?.message}
                      isInvalid={!!errors.instagram}
                      radius="sm"
                      size="sm"
                      startContent={
                        <div className="pointer-events-none flex items-center border-r-1 border-default-300 pr-2 min-w-20">
                          <span className="text-default-400 text-small">
                            Instagram
                          </span>
                        </div>
                      }
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="linkedin"
                  render={({ field }) => (
                    <Input
                      errorMessage={errors.linkedin?.message}
                      isInvalid={!!errors.linkedin}
                      radius="sm"
                      size="sm"
                      startContent={
                        <div className="pointer-events-none flex items-center border-r-1 border-default-300 pr-2 min-w-20">
                          <span className="text-default-400 text-small">
                            LinkedIn
                          </span>
                        </div>
                      }
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Website Details">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className={fieldLabel}>Website Login Link</p>
                <Controller
                  control={control}
                  name="websiteLoginLink"
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
                <p className={fieldLabel}>Username</p>
                <Controller
                  control={control}
                  name="websiteUsername"
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
                <p className={fieldLabel}>Password</p>
                <Controller
                  control={control}
                  name="websitePassword"
                  render={({ field }) => (
                    <Input
                      radius="sm"
                      size="sm"
                      type="password"
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className={fieldLabel}>Google Analytics</p>
                <Controller
                  control={control}
                  name="googleAnalytics"
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
                <p className={fieldLabel}>Google Search Console</p>
                <Controller
                  control={control}
                  name="googleSearchConsole"
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
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <UploadField
                files={colorGuide}
                label="Color Guide"
                onChange={setColorGuide}
              />
              <UploadField files={logo} label="Logo" onChange={setLogo} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TokenInputField
                label="List of treatment and services to be included (maximum 10)"
                placeholder="Add sub-specialty"
                startContent={
                  <Stethoscope className="text-[#585763]" size={18} />
                }
                tokens={treatmentAndServices}
                onChange={setTreatmentAndServices}
              />
              <TokenInputField
                label="Conditions treated (maximum 10)"
                placeholder="Add top 5 special interests"
                startContent={
                  <BriefcaseMedical className="text-[#585763]" size={18} />
                }
                tokens={conditionsTreated}
                onChange={setConditionsTreated}
              />
            </div>
          </DetailSection>

          <Divider />

          <div className="flex items-center justify-between gap-2">
            <div />
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
