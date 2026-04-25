"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { DatePicker } from "@heroui/date-picker";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import { Tab, Tabs } from "@heroui/tabs";
import {
  getLocalTimeZone,
  parseDate,
  today,
  type DateValue,
} from "@internationalized/date";
import { Building2, Globe, MapPin, X } from "lucide-react";

import { clientsApi } from "@/apis/clients";
import { extractRunRecord, extractScanId, scansApi } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import { TokenInputField } from "@/components/form/token-input-field";
import { useAppToast } from "@/hooks/use-app-toast";

const coverageSizeOptions = [
  { label: "5x5", value: "5" },
  { label: "10x10", value: "10" },
  { label: "15x15", value: "15" },
  { label: "20x20", value: "20" },
  { label: "25x25", value: "25" },
];
const coverageDistanceOptions = ["1", "5", "10", "15", "20", "25"];

const repeatTimeOptions = ["1", "2", "3", "4"];
const scheduleTimeOptions = [
  "01:00",
  "02:00",
  "03:00",
  "04:00",
  "05:00",
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
];
const meridiemOptions = ["AM", "PM"];
const frequencyOptions = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"];

const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number) => (value * Math.PI) / 180;
const toDegrees = (value: number) => (value * 180) / Math.PI;

const moveCoordinate = (
  latitude: number,
  longitude: number,
  northKm: number,
  eastKm: number,
) => {
  const nextLatitude = latitude + toDegrees(northKm / EARTH_RADIUS_KM);
  const nextLongitude =
    longitude +
    toDegrees(eastKm / (EARTH_RADIUS_KM * Math.cos(toRadians(latitude))));

  return {
    latitude: Number(nextLatitude.toFixed(7)),
    longitude: Number(nextLongitude.toFixed(7)),
  };
};

const generateGridCoverage = ({
  centerLatitude,
  centerLongitude,
  distance,
  size,
  unit,
}: {
  centerLatitude: number;
  centerLongitude: number;
  distance: number;
  size: number;
  unit: "KILOMETERS" | "MILES";
}) => {
  const stepKm = unit === "MILES" ? distance * 1.60934 : distance;
  const midpoint = (size - 1) / 2;
  const points: Array<{
    label: string;
    latitude: number;
    longitude: number;
  }> = [];

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const northOffset = (midpoint - row) * stepKm;
      const eastOffset = (column - midpoint) * stepKm;
      const pointIndex = row * size + column;
      const label = `Point ${String.fromCharCode(65 + (pointIndex % 26))}${pointIndex >= 26 ? Math.floor(pointIndex / 26) : ""}`;

      points.push({
        label,
        ...moveCoordinate(
          centerLatitude,
          centerLongitude,
          northOffset,
          eastOffset,
        ),
      });
    }
  }

  return points;
};

const scanKeywordSchema = yup.object({
  coverageDistance: yup.string().required("Distance is required"),
  coverageSize: yup.string().required("Coverage size is required"),
  coverageUnit: yup
    .string()
    .oneOf(["kilometers", "miles"])
    .required("Coverage unit is required"),
  keywords: yup
    .array()
    .of(yup.string().required())
    .min(1, "Add at least one keyword")
    .required(),
  isRecurring: yup.boolean().default(false).required(),
  labels: yup.array().of(yup.string().required()).default([]).required(),
  connectedLocation: yup
    .string()
    .required("A synced Google Business Profile is required"),
  repeatTime: yup.string().when("isRecurring", {
    is: true,
    otherwise: (schema) => schema.default("").notRequired(),
    then: (schema) => schema.required("Repeat time is required"),
  }),
  scheduleDate: yup.string().when("isRecurring", {
    is: true,
    otherwise: (schema) => schema.default("").notRequired(),
    then: (schema) => schema.required("Schedule date is required"),
  }),
  scheduleMeridiem: yup.string().when("isRecurring", {
    is: true,
    otherwise: (schema) => schema.default("AM").notRequired(),
    then: (schema) =>
      schema.oneOf(meridiemOptions).required("AM/PM is required"),
  }),
  scheduleTime: yup.string().when("isRecurring", {
    is: true,
    otherwise: (schema) => schema.default("").notRequired(),
    then: (schema) => schema.required("Schedule time is required"),
  }),
  frequency: yup.string().when("isRecurring", {
    is: true,
    otherwise: (schema) => schema.default("").notRequired(),
    then: (schema) => schema.required("Frequency is required"),
  }),
});

export type ScanKeywordFormValues = yup.InferType<typeof scanKeywordSchema>;
export interface ScanCoveragePreview {
  center: {
    latitude: number;
    longitude: number;
  } | null;
  label?: string | null;
  points: Array<{
    label: string;
    latitude: number;
    longitude: number;
  }>;
}

interface ScanKeywordModalProps {
  clientId?: number | string;
  defaultKeywords?: string[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPreviewChange?: (preview: ScanCoveragePreview | null) => void;
  onRunStarted?: (payload: {
    runId: number;
    scanId: number;
    keyword: string;
    frequency: string | null;
    nextRunAt: string | null;
  }) => void;
  onSubmit?: (payload: ScanKeywordFormValues) => void | Promise<void>;
}

const labelClassName = "mb-1.5 block text-sm text-[#4B5563]";

const formatDateValue = (value: DateValue | null) => {
  if (!value) {
    return "";
  }

  return value.toString();
};

const toDateValue = (value?: string) => {
  if (!value) {
    return null;
  }

  try {
    return parseDate(value);
  } catch {
    return null;
  }
};

const to24HourTime = (time: string, meridiem: string) => {
  const [hourPart, minutePart] = time.split(":");
  let hours = Number(hourPart);

  if (meridiem === "AM") {
    if (hours === 12) {
      hours = 0;
    }
  } else if (hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${minutePart ?? "00"}`;
};

export const ScanKeywordModal = ({
  clientId,
  defaultKeywords = [],
  isOpen,
  onOpenChange,
  onPreviewChange,
  onRunStarted,
  onSubmit,
}: ScanKeywordModalProps) => {
  const toast = useAppToast();
  const { getValidAccessToken, session } = useAuth();
  const [gbpDetails, setGbpDetails] = useState<Awaited<
    ReturnType<typeof clientsApi.getClientGbpDetails>
  > | null>(null);
  const [isLoadingGbp, setIsLoadingGbp] = useState(false);
  const todayValue = useMemo(() => today(getLocalTimeZone()), []);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ScanKeywordFormValues>({
    defaultValues: {
      coverageDistance: "",
      coverageSize: "",
      coverageUnit: "kilometers",
      connectedLocation: "",
      frequency: "",
      isRecurring: false,
      keywords: [],
      labels: [],
      repeatTime: "",
      scheduleDate: "",
      scheduleMeridiem: "AM",
      scheduleTime: "",
    },
    mode: "onBlur",
  });
  const isRecurring = watch("isRecurring");
  const scheduleDate = watch("scheduleDate");
  const coverageDistance = watch("coverageDistance");
  const coverageSize = watch("coverageSize");
  const coverageUnit = watch("coverageUnit");
  const hasConnectedGbp = Boolean(
    gbpDetails &&
      (gbpDetails.businessName ||
        gbpDetails.category ||
        gbpDetails.businessLocation ||
        gbpDetails.phone ||
        gbpDetails.website),
  );
  const hasConnectedCoordinates = Boolean(
    gbpDetails?.latitude !== null && gbpDetails?.longitude !== null,
  );
  const scheduleDateValue = useMemo(
    () => toDateValue(scheduleDate),
    [scheduleDate],
  );

  useEffect(() => {
    if (!isOpen) {
      onPreviewChange?.(null);

      return;
    }

    if (!clientId || !session) {
      setGbpDetails(null);
      setValue("connectedLocation", "", {
        shouldDirty: false,
        shouldTouch: false,
      });
      onPreviewChange?.(null);

      return;
    }

    let isMounted = true;

    const loadGbpDetails = async () => {
      setIsLoadingGbp(true);

      try {
        const accessToken = await getValidAccessToken();
        const response = await clientsApi.getClientGbpDetails(
          accessToken,
          clientId,
        );

        if (!isMounted) {
          return;
        }

        setGbpDetails(response);

        const normalizedLocation =
          response.businessName ??
          response.businessLocation ??
          response.website ??
          "";

        setValue("connectedLocation", normalizedLocation, {
          shouldDirty: false,
          shouldTouch: false,
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setGbpDetails(null);
        setValue("connectedLocation", "", {
          shouldDirty: false,
          shouldTouch: false,
        });
      } finally {
        if (isMounted) {
          setIsLoadingGbp(false);
        }
      }
    };

    void loadGbpDetails();

    return () => {
      isMounted = false;
    };
  }, [clientId, getValidAccessToken, isOpen, session, setValue]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!defaultKeywords.length) {
      return;
    }

    const normalizedKeywords = Array.from(
      new Set(
        defaultKeywords
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    );

    if (!normalizedKeywords.length) {
      return;
    }

    setValue("keywords", normalizedKeywords, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [defaultKeywords, isOpen, setValue]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (
      gbpDetails?.latitude === null ||
      gbpDetails?.latitude === undefined ||
      gbpDetails?.longitude === null ||
      gbpDetails?.longitude === undefined
    ) {
      onPreviewChange?.({
        center: null,
        label: gbpDetails?.businessName ?? gbpDetails?.businessLocation,
        points: [],
      });

      return;
    }

    if (!coverageDistance || !coverageSize) {
      onPreviewChange?.({
        center: {
          latitude: gbpDetails.latitude,
          longitude: gbpDetails.longitude,
        },
        label: gbpDetails?.businessName ?? gbpDetails?.businessLocation,
        points: [],
      });

      return;
    }

    onPreviewChange?.({
      center: {
        latitude: gbpDetails.latitude,
        longitude: gbpDetails.longitude,
      },
      label: gbpDetails?.businessName ?? gbpDetails?.businessLocation,
      points: generateGridCoverage({
        centerLatitude: gbpDetails.latitude,
        centerLongitude: gbpDetails.longitude,
        distance: Number(coverageDistance),
        size: Number(coverageSize),
        unit: coverageUnit === "miles" ? "MILES" : "KILOMETERS",
      }),
    });
  }, [
    coverageDistance,
    coverageSize,
    coverageUnit,
    gbpDetails?.businessLocation,
    gbpDetails?.businessName,
    gbpDetails?.latitude,
    gbpDetails?.longitude,
    isOpen,
    onPreviewChange,
  ]);

  const closeModal = () => {
    onOpenChange(false);
    onPreviewChange?.(null);
    reset();
    clearErrors();
  };

  const submitScan = async (values: ScanKeywordFormValues) => {
    clearErrors();

    try {
      const validatedValues = await scanKeywordSchema.validate(values, {
        abortEarly: false,
      });

      const accessToken = await getValidAccessToken();

      if (!clientId) {
        throw new Error("Missing client id for scan.");
      }

      const normalizedClientId = Number(clientId);

      if (!Number.isFinite(normalizedClientId)) {
        throw new Error("Invalid client id for scan.");
      }

      if (
        gbpDetails?.latitude === null ||
        gbpDetails?.latitude === undefined ||
        gbpDetails?.longitude === null ||
        gbpDetails?.longitude === undefined
      ) {
        throw new Error(
          "Connected GBP does not contain coordinates required for scan generation.",
        );
      }

      const coverage = generateGridCoverage({
        centerLatitude: gbpDetails.latitude,
        centerLongitude: gbpDetails.longitude,
        distance: Number(validatedValues.coverageDistance),
        size: Number(validatedValues.coverageSize),
        unit: validatedValues.coverageUnit === "miles" ? "MILES" : "KILOMETERS",
      });
      const recurringSchedule = validatedValues.isRecurring
        ? (() => {
            if (
              !validatedValues.scheduleDate ||
              !validatedValues.scheduleTime ||
              !validatedValues.scheduleMeridiem
            ) {
              throw new Error(
                "Schedule date and time are required for recurring scans.",
              );
            }

            return {
              frequency: (validatedValues.frequency ?? "").toUpperCase(),
              repeatTime: validatedValues.repeatTime,
              startDate: validatedValues.scheduleDate,
              startTime: to24HourTime(
                validatedValues.scheduleTime,
                validatedValues.scheduleMeridiem,
              ),
              timezone: "Europe/London",
            };
          })()
        : undefined;

      const payload = {
        clientId: normalizedClientId,
        coverage,
        coverageUnit:
          validatedValues.coverageUnit === "miles" ? "MILES" : "KILOMETERS",
        keywords: validatedValues.keywords,
        labels: validatedValues.labels,
        recurrenceEnabled: validatedValues.isRecurring,
        runNow: true,
        ...(recurringSchedule ?? {}),
      } as const;

      const createResponse = await scansApi.createScan(accessToken, payload);
      const resolvedScanId = extractScanId(createResponse);

      if (!resolvedScanId) {
        throw new Error("Create scan response did not include a scan id.");
      }

      const responseRuns = Array.isArray(createResponse.runs)
        ? createResponse.runs
        : [];
      const responseScans = Array.isArray(createResponse.scans)
        ? createResponse.scans
        : [];

      if (responseRuns.length > 0) {
        responseRuns.forEach((run, runIndex) => {
          if (!run?.id || !run?.scanId) {
            return;
          }

          const relatedScan = responseScans.find(
            (scan) =>
              typeof scan?.id === "number" && Number(scan.id) === run.scanId,
          );

          onRunStarted?.({
            frequency:
              typeof relatedScan?.frequency === "string"
                ? relatedScan.frequency
                : (recurringSchedule?.frequency ?? null),
            keyword:
              typeof relatedScan?.keyword === "string" &&
              relatedScan.keyword.trim()
                ? relatedScan.keyword
                : (validatedValues.keywords[runIndex] ?? "Keyword"),
            nextRunAt:
              typeof relatedScan?.nextRunAt === "string"
                ? relatedScan.nextRunAt
                : null,
            runId: run.id,
            scanId: run.scanId,
          });
        });
      } else {
        const runRecord = extractRunRecord(createResponse);

        if (runRecord?.id && runRecord.scanId) {
          const apiScan = createResponse.scan;

          onRunStarted?.({
            frequency:
              typeof apiScan?.frequency === "string"
                ? apiScan.frequency
                : (recurringSchedule?.frequency ?? null),
            keyword:
              typeof apiScan?.keyword === "string" && apiScan.keyword.trim()
                ? apiScan.keyword
                : (validatedValues.keywords[0] ?? "Keyword"),
            nextRunAt:
              typeof apiScan?.nextRunAt === "string" ? apiScan.nextRunAt : null,
            runId: runRecord.id,
            scanId: runRecord.scanId,
          });
        }
      }
      await onSubmit?.(validatedValues);
      toast.success("Scan scheduled successfully.");
      closeModal();
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof ScanKeywordFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      toast.danger("Failed to schedule scan", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <Modal
      hideCloseButton
      isDismissable={false}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="2xl"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between border-b border-default-200">
          <h2 className="text-lg font-semibold text-[#111827]">
            Recurring Scan
          </h2>
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
          <div>
            <p className={labelClassName}>Connected Google Business Profile</p>
            <Card className="border border-default-200 shadow-none">
              <CardBody className="space-y-2 p-4">
                {isLoadingGbp ? (
                  <p className="text-sm text-default-500">
                    Checking connected Google Business Profile...
                  </p>
                ) : hasConnectedGbp ? (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-[#EEF2FF] p-2 text-[#022279]">
                        <Building2 size={18} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[#111827]">
                          {gbpDetails?.businessName ?? "Connected GBP"}
                        </p>
                        {gbpDetails?.category ? (
                          <p className="text-xs text-default-500">
                            {gbpDetails.category}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {gbpDetails?.businessLocation ? (
                      <div className="flex items-center gap-2 text-xs text-default-500">
                        <MapPin size={14} />
                        <span>{gbpDetails.businessLocation}</span>
                      </div>
                    ) : null}
                    {gbpDetails?.website ? (
                      <div className="flex items-center gap-2 text-xs text-default-500">
                        <Globe size={14} />
                        <span className="truncate">{gbpDetails.website}</span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-danger">
                      No synced Google Business Profile found.
                    </p>
                    <p className="text-xs text-default-500">
                      Connect GBP in the GBP page first before running a local
                      rankings scan.
                    </p>
                  </div>
                )}
                {hasConnectedGbp && !hasConnectedCoordinates ? (
                  <p className="text-xs text-danger">
                    Connected GBP is missing coordinates, so scan coverage
                    points cannot be generated yet.
                  </p>
                ) : null}
              </CardBody>
            </Card>
            {errors.connectedLocation?.message ? (
              <p className="mt-1 text-xs text-danger">
                {errors.connectedLocation.message}
              </p>
            ) : null}
          </div>
          <Controller
            control={control}
            name="keywords"
            render={({ field }) => (
              <TokenInputField
                errorMessage={errors.keywords?.message}
                label="Keywords"
                placeholder="Add keyword"
                tokens={field.value ?? []}
                onChange={(tokens) => field.onChange(tokens)}
              />
            )}
          />
          <div>
            <p className={labelClassName}>Coverage</p>
            <Controller
              control={control}
              name="coverageUnit"
              render={({ field }) => (
                <Tabs
                  aria-label="Coverage unit"
                  classNames={{
                    base: "w-full",
                    cursor: "bg-[#4F46E5]",
                    panel: "hidden",
                    tab: "w-full",
                    tabList:
                      "grid w-full grid-cols-2 rounded-xl bg-[#F3F4F6] p-1",
                    tabContent: "text-sm font-medium",
                  }}
                  color="primary"
                  radius="sm"
                  selectedKey={field.value}
                  onSelectionChange={(key) => field.onChange(String(key))}
                >
                  <Tab key="kilometers" title="Kilometers" />
                  <Tab key="miles" title="Miles" />
                </Tabs>
              )}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Controller
                control={control}
                name="coverageSize"
                render={({ field }) => (
                  <Select
                    errorMessage={errors.coverageSize?.message}
                    isInvalid={!!errors.coverageSize}
                    placeholder={field.value ? "Select value" : "Select size"}
                    radius="sm"
                    selectedKeys={field.value ? [field.value] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      field.onChange(Array.from(keys as Set<string>)[0] ?? "");
                    }}
                  >
                    {coverageSizeOptions.map((option) => (
                      <SelectItem key={option.value}>{option.label}</SelectItem>
                    ))}
                  </Select>
                )}
              />
              <Controller
                control={control}
                name="coverageDistance"
                render={({ field }) => (
                  <Select
                    errorMessage={errors.coverageDistance?.message}
                    isInvalid={!!errors.coverageDistance}
                    placeholder="Select Distance"
                    radius="sm"
                    selectedKeys={field.value ? [field.value] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      field.onChange(Array.from(keys as Set<string>)[0] ?? "");
                    }}
                  >
                    {coverageDistanceOptions.map((option) => (
                      <SelectItem key={option}>{option}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
          </div>
          <Controller
            control={control}
            name="labels"
            render={({ field }) => (
              <TokenInputField
                label="Label"
                placeholder="Add new label"
                tokens={field.value ?? []}
                onChange={(tokens) => field.onChange(tokens)}
              />
            )}
          />
          <div className="space-y-3">
            <Controller
              control={control}
              name="isRecurring"
              render={({ field }) => (
                <Switch
                  isSelected={field.value}
                  size="sm"
                  onValueChange={field.onChange}
                >
                  Enable recurrence
                </Switch>
              )}
            />
            {isRecurring ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className={labelClassName}>Frequency</p>
                  <Controller
                    control={control}
                    name="frequency"
                    render={({ field }) => (
                      <Select
                        errorMessage={errors.frequency?.message}
                        isInvalid={!!errors.frequency}
                        radius="sm"
                        selectedKeys={field.value ? [field.value] : []}
                        size="sm"
                        onSelectionChange={(keys) => {
                          field.onChange(
                            Array.from(keys as Set<string>)[0] ?? "",
                          );
                        }}
                      >
                        {frequencyOptions.map((option) => (
                          <SelectItem key={option}>{option}</SelectItem>
                        ))}
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <p className={labelClassName}>Repeat time</p>
                  <Controller
                    control={control}
                    name="repeatTime"
                    render={({ field }) => (
                      <Select
                        errorMessage={errors.repeatTime?.message}
                        isInvalid={!!errors.repeatTime}
                        placeholder="Select repeat time"
                        radius="sm"
                        selectedKeys={field.value ? [field.value] : []}
                        size="sm"
                        onSelectionChange={(keys) => {
                          field.onChange(
                            Array.from(keys as Set<string>)[0] ?? "",
                          );
                        }}
                      >
                        {repeatTimeOptions.map((option) => (
                          <SelectItem key={option}>{option}</SelectItem>
                        ))}
                      </Select>
                    )}
                  />
                </div>
              </div>
            ) : null}
          </div>
          {isRecurring ? (
            <div>
              <p className={labelClassName}>Schedule</p>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <Controller
                    control={control}
                    name="scheduleDate"
                    render={() => (
                      <>
                        <DatePicker
                          aria-label="Schedule date"
                          className="w-full"
                          minValue={todayValue}
                          radius="sm"
                          size="sm"
                          value={scheduleDateValue}
                          onChange={(value) => {
                            if (!value) {
                              setValue("scheduleDate", "", {
                                shouldDirty: true,
                                shouldTouch: true,
                              });

                              return;
                            }

                            setValue("scheduleDate", formatDateValue(value), {
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                            clearErrors("scheduleDate");
                          }}
                        />
                      </>
                    )}
                  />
                </div>
                <div>
                  <Controller
                    control={control}
                    name="scheduleTime"
                    render={({ field }) => (
                      <Select
                        errorMessage={errors.scheduleTime?.message}
                        isInvalid={!!errors.scheduleTime}
                        placeholder="Time"
                        radius="sm"
                        selectedKeys={field.value ? [field.value] : []}
                        size="sm"
                        onSelectionChange={(keys) => {
                          field.onChange(
                            Array.from(keys as Set<string>)[0] ?? "",
                          );
                        }}
                      >
                        {scheduleTimeOptions.map((option) => (
                          <SelectItem key={option}>{option}</SelectItem>
                        ))}
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Controller
                    control={control}
                    name="scheduleMeridiem"
                    render={({ field }) => (
                      <Select
                        errorMessage={errors.scheduleMeridiem?.message}
                        isInvalid={!!errors.scheduleMeridiem}
                        placeholder="AM/PM"
                        radius="sm"
                        selectedKeys={field.value ? [field.value] : []}
                        size="sm"
                        onSelectionChange={(keys) => {
                          field.onChange(
                            Array.from(keys as Set<string>)[0] ?? "",
                          );
                        }}
                      >
                        {meridiemOptions.map((option) => (
                          <SelectItem key={option}>{option}</SelectItem>
                        ))}
                      </Select>
                    )}
                  />
                </div>
              </div>
              {errors.scheduleDate?.message ||
              errors.scheduleTime?.message ||
              errors.scheduleMeridiem?.message ? (
                <p className="mt-1 text-xs text-danger">
                  {errors.scheduleDate?.message ??
                    errors.scheduleTime?.message ??
                    errors.scheduleMeridiem?.message}
                </p>
              ) : null}
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter className="border-t border-default-200">
          <Button radius="sm" variant="bordered" onPress={closeModal}>
            Cancel
          </Button>
          <Button
            className="bg-[#4F46E5] text-white"
            isDisabled={
              !hasConnectedGbp || !hasConnectedCoordinates || isLoadingGbp
            }
            isLoading={isSubmitting}
            radius="sm"
            onPress={() => void handleSubmit(submitScan)()}
          >
            Schedule Scan
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
