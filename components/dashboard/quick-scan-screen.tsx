"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { DatePicker } from "@heroui/date-picker";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import { getLocalTimeZone, parseDate, today, type DateValue } from "@internationalized/date";
import { Building2, Globe, MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { scansApi } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import { loadGoogleMapsScript } from "@/components/form/google-maps-loader";
import {
  GooglePlacesAutocomplete,
  type GooglePlacesAutocompleteItem,
} from "@/components/form/google-places-autocomplete";
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
const frequencyOptions = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"];
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
  const points: Array<{ label: string; latitude: number; longitude: number }> =
    [];

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const northOffset = (midpoint - row) * stepKm;
      const eastOffset = (column - midpoint) * stepKm;
      const pointIndex = row * size + column;

      points.push({
        label: `Point ${pointIndex + 1}`,
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

const resolveCoordinatesFromPlaceId = async (placeId: string) => {
  if (!placeId) {
    return null;
  }

  try {
    await loadGoogleMapsScript();

    const googleMaps = (window as unknown as { google?: any }).google?.maps;
    const PlacesService = googleMaps?.places?.PlacesService;

    if (!PlacesService) {
      return null;
    }

    const container = document.createElement("div");
    const placesService = new PlacesService(container);
    const result = await new Promise<{
      lat: number;
      lng: number;
    } | null>((resolve) => {
      placesService.getDetails(
        {
          fields: ["geometry.location"],
          placeId,
        },
        (
          place: { geometry?: { location?: { lat: () => number; lng: () => number } } } | null,
          status: string,
        ) => {
          if (status !== "OK" || !place) {
            resolve(null);

            return;
          }

          const location = place.geometry?.location;
          const lat = location?.lat?.();
          const lng = location?.lng?.();

          if (typeof lat !== "number" || typeof lng !== "number") {
            resolve(null);

            return;
          }

          resolve({
            lat: Number(lat.toFixed(7)),
            lng: Number(lng.toFixed(7)),
          });
        },
      );
    });

    return result;
  } catch {
    return null;
  }
};

const quickScanSchema = yup.object({
  coverageDistance: yup.string().required("Distance is required."),
  coverageSize: yup.string().required("Coverage size is required."),
  coverageUnit: yup
    .string()
    .oneOf(["KILOMETERS", "MILES"])
    .required("Coverage unit is required."),
  frequency: yup.string().when("isRecurring", {
    is: true,
    otherwise: (schema) => schema.default("").notRequired(),
    then: (schema) => schema.required("Frequency is required."),
  }),
  isRecurring: yup.boolean().default(false).required(),
  keywords: yup
    .array()
    .of(yup.string().required())
    .min(1, "Add at least one keyword.")
    .required(),
  labels: yup
    .array()
    .of(yup.string().required())
    .min(1, "Add at least one label.")
    .required(),
  repeatTime: yup.string().when("isRecurring", {
    is: true,
    otherwise: (schema) => schema.default("").notRequired(),
    then: (schema) =>
      schema
        .matches(/^\d+$/, "Repeat time must be a number.")
        .required("Repeat time is required."),
  }),
  scheduleDate: yup.string().when("isRecurring", {
    is: true,
    otherwise: (schema) => schema.default("").notRequired(),
    then: (schema) => schema.required("Schedule date is required."),
  }),
  scheduleMeridiem: yup.string().when("isRecurring", {
    is: true,
    otherwise: (schema) => schema.default("AM").notRequired(),
    then: (schema) => schema.oneOf(meridiemOptions).required("AM/PM is required."),
  }),
  scheduleTime: yup.string().when("isRecurring", {
    is: true,
    otherwise: (schema) => schema.default("").notRequired(),
    then: (schema) => schema.required("Schedule time is required."),
  }),
});

type QuickScanFormValues = yup.InferType<typeof quickScanSchema>;

type QuickGbpPreview = {
  address?: string | null;
  businessName?: string | null;
  dataCid?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
  website?: string | null;
};

export const QuickScanScreen = () => {
  const router = useRouter();
  const toast = useAppToast();
  const { getValidAccessToken } = useAuth();
  const [selectedPlace, setSelectedPlace] =
    useState<GooglePlacesAutocompleteItem | null>(null);
  const [gbpPreview, setGbpPreview] = useState<QuickGbpPreview | null>(null);
  const [isLoadingGbp, setIsLoadingGbp] = useState(false);
  const todayValue = useMemo(() => today(getLocalTimeZone()), []);
  const {
    control,
    handleSubmit,
    clearErrors,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuickScanFormValues>({
    defaultValues: {
      coverageDistance: "1",
      coverageSize: "5",
      coverageUnit: "MILES",
      frequency: "WEEKLY",
      isRecurring: false,
      keywords: [],
      labels: [],
      repeatTime: "4",
      scheduleDate: "",
      scheduleMeridiem: "AM",
      scheduleTime: "09:00",
    },
    mode: "onBlur",
  });
  const isRecurring = watch("isRecurring");
  const scheduleDate = watch("scheduleDate");
  const scheduleDateValue = useMemo(
    () => toDateValue(scheduleDate),
    [scheduleDate],
  );
  const hasCoordinates = useMemo(
    () =>
      gbpPreview?.latitude !== null &&
      gbpPreview?.latitude !== undefined &&
      gbpPreview?.longitude !== null &&
      gbpPreview?.longitude !== undefined,
    [gbpPreview?.latitude, gbpPreview?.longitude],
  );

  const handleSelectPlace = async (
    item: GooglePlacesAutocompleteItem | null,
  ) => {
    setSelectedPlace(item);
    setGbpPreview(null);

    if (!item?.placeId) {
      return;
    }

    setIsLoadingGbp(true);

    try {
      const accessToken = await getValidAccessToken();
      const preview = await scansApi.getQuickGbpPreview(accessToken, {
        gl: "uk",
        hl: "en",
        placeId: item.placeId,
      });

      if (
        preview.latitude !== null &&
        preview.latitude !== undefined &&
        preview.longitude !== null &&
        preview.longitude !== undefined
      ) {
        setGbpPreview(preview);

        return;
      }

      const fallbackCoordinates = await resolveCoordinatesFromPlaceId(
        item.placeId,
      );

      setGbpPreview({
        ...preview,
        latitude: fallbackCoordinates?.lat ?? preview.latitude ?? null,
        longitude: fallbackCoordinates?.lng ?? preview.longitude ?? null,
      });
    } catch (error) {
      const fallbackCoordinates = await resolveCoordinatesFromPlaceId(
        item.placeId,
      );

      if (fallbackCoordinates) {
        setGbpPreview({
          address: item.secondaryText || null,
          businessName: item.mainText || null,
          dataCid: null,
          latitude: fallbackCoordinates.lat,
          longitude: fallbackCoordinates.lng,
          placeId: item.placeId,
          website: null,
        });
      } else {
        toast.danger("Unable to load GBP details.", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    } finally {
      setIsLoadingGbp(false);
    }
  };

  const submitQuickScan = async (values: QuickScanFormValues) => {
    clearErrors();

    if (!selectedPlace?.placeId || !gbpPreview) {
      toast.danger("Please select a Google Business Profile first.");
      return;
    }

    if (!hasCoordinates) {
      toast.danger(
        "Selected profile has no map coordinates. Please choose another business.",
      );
      return;
    }

    try {
      const validated = await quickScanSchema.validate(values, {
        abortEarly: false,
      });

      const accessToken = await getValidAccessToken();
      const coverage = generateGridCoverage({
        centerLatitude: Number(gbpPreview.latitude),
        centerLongitude: Number(gbpPreview.longitude),
        distance: Number(validated.coverageDistance),
        size: Number(validated.coverageSize),
        unit: validated.coverageUnit,
      });

      await scansApi.createScan(accessToken, {
        coverage,
        coverageUnit: validated.coverageUnit,
        frequency: validated.isRecurring
          ? (validated.frequency || "WEEKLY").toUpperCase()
          : undefined,
        keywords: validated.keywords,
        labels: validated.labels,
        quickScanContext: {
          address: gbpPreview.address ?? null,
          businessName: gbpPreview.businessName ?? selectedPlace.mainText,
          dataCid: gbpPreview.dataCid ?? null,
          latitude: Number(gbpPreview.latitude),
          longitude: Number(gbpPreview.longitude),
          placeId: gbpPreview.placeId ?? selectedPlace.placeId,
          website: gbpPreview.website ?? null,
        },
        recurrenceEnabled: validated.isRecurring,
        repeatTime: validated.isRecurring ? validated.repeatTime : undefined,
        runNow: true,
        scanScope: "QUICK",
        sourcePage: "QUICK_SCAN",
        startDate: validated.isRecurring ? validated.scheduleDate : undefined,
        startTime: validated.isRecurring
          ? to24HourTime(
              validated.scheduleTime ?? "",
              validated.scheduleMeridiem ?? "AM",
            )
          : undefined,
      });

      toast.success("Quick scan queued successfully.");
      router.push(
        validated.isRecurring
          ? "/dashboard/recurring-scan"
          : "/dashboard/scan-history",
      );
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof QuickScanFormValues, {
            message: issue.message,
            type: "manual",
          });
        });
        return;
      }

      toast.danger("Unable to queue quick scan.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Quick Scan</h1>
        <p className="text-sm text-default-500">
          Search a GBP, configure coverage, and queue an ad-hoc local ranking
          scan.
        </p>
      </div>

      <Card className="border border-default-200 shadow-none">
        <CardHeader className="border-b border-default-200 pb-3">
          <h2 className="text-base font-semibold text-[#111827]">Scan Setup</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#111827]">
              Google Business Profile
            </p>
            <GooglePlacesAutocomplete
              placeholder="Search GBP"
              value={selectedPlace?.description ?? ""}
              onSelect={(item) => {
                void handleSelectPlace(item);
              }}
            />
          </div>

          <Card className="border border-default-200 bg-[#F8FAFC] shadow-none">
            <CardBody className="space-y-2 p-3">
              {isLoadingGbp ? (
                <p className="text-sm text-default-500">
                  Loading GBP details...
                </p>
              ) : gbpPreview ? (
                <>
                  <div className="flex items-start gap-2">
                    <Building2 className="mt-0.5 text-[#1D4ED8]" size={16} />
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">
                        {gbpPreview.businessName ||
                          selectedPlace?.mainText ||
                          "-"}
                      </p>
                      <p className="text-xs text-default-500">
                        {gbpPreview.address ||
                          selectedPlace?.secondaryText ||
                          "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-default-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} />
                      {hasCoordinates
                        ? `${gbpPreview.latitude}, ${gbpPreview.longitude}`
                        : "Coordinates unavailable"}
                    </span>
                    {gbpPreview.website ? (
                      <span className="inline-flex items-center gap-1">
                        <Globe size={13} />
                        {gbpPreview.website}
                      </span>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="inline-flex items-center gap-2 text-sm text-default-500">
                  <Search size={14} />
                  Search and select a GBP to continue.
                </p>
              )}
            </CardBody>
          </Card>

          <Controller
            control={control}
            name="keywords"
            render={({ field }) => (
              <TokenInputField
                errorMessage={errors.keywords?.message}
                label="Keywords"
                placeholder="Add keyword"
                tokens={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="labels"
            render={({ field }) => (
              <TokenInputField
                errorMessage={errors.labels?.message}
                label="Labels"
                placeholder="Add label"
                tokens={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <Controller
              control={control}
              name="coverageSize"
              render={({ field }) => (
                <Select
                  label="Grid size"
                  selectedKeys={field.value ? [field.value] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys as Set<string>)[0] ?? "";
                    field.onChange(selected);
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
                  label="Distance between points"
                  selectedKeys={field.value ? [field.value] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys as Set<string>)[0] ?? "";
                    field.onChange(selected);
                  }}
                >
                  {coverageDistanceOptions.map((option) => (
                    <SelectItem key={option}>{option}</SelectItem>
                  ))}
                </Select>
              )}
            />
            <Controller
              control={control}
              name="coverageUnit"
              render={({ field }) => (
                <Select
                  label="Unit"
                  selectedKeys={field.value ? [field.value] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys as Set<string>)[0] ?? "";
                    field.onChange(selected);
                  }}
                >
                  <SelectItem key="MILES">Miles</SelectItem>
                  <SelectItem key="KILOMETERS">Kilometers</SelectItem>
                </Select>
              )}
            />
          </div>

          <Controller
            control={control}
            name="isRecurring"
            render={({ field }) => (
              <Switch isSelected={field.value} onValueChange={field.onChange}>
                Enable recurring scan
              </Switch>
            )}
          />

          {isRecurring ? (
            <div className="grid gap-3 sm:grid-cols-4">
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select
                    errorMessage={errors.frequency?.message}
                    isInvalid={!!errors.frequency}
                    label="Frequency"
                    selectedKeys={field.value ? [field.value] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys as Set<string>)[0] ?? "";
                      field.onChange(selected);
                    }}
                  >
                    {frequencyOptions.map((option) => (
                      <SelectItem key={option}>{option}</SelectItem>
                    ))}
                  </Select>
                )}
              />
              <Controller
                control={control}
                name="repeatTime"
                render={({ field }) => (
                  <Input
                    errorMessage={errors.repeatTime?.message}
                    isInvalid={!!errors.repeatTime}
                    label="Repeat for (runs)"
                    size="sm"
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name="scheduleDate"
                render={() => (
                  <DatePicker
                    aria-label="Start date"
                    className="w-full"
                    isInvalid={!!errors.scheduleDate}
                    label="Start date"
                    minValue={todayValue}
                    size="sm"
                    value={scheduleDateValue}
                    onChange={(value) => {
                      if (!value) {
                        setValue("scheduleDate", "", {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });

                        return;
                      }

                      setValue("scheduleDate", formatDateValue(value), {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                  />
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <Controller
                  control={control}
                  name="scheduleTime"
                  render={({ field }) => (
                    <Select
                      errorMessage={errors.scheduleTime?.message}
                      isInvalid={!!errors.scheduleTime}
                      label="Start time"
                      selectedKeys={field.value ? [field.value] : []}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys as Set<string>)[0] ?? "";
                        field.onChange(selected);
                      }}
                    >
                      {scheduleTimeOptions.map((option) => (
                        <SelectItem key={option}>{option}</SelectItem>
                      ))}
                    </Select>
                  )}
                />
                <Controller
                  control={control}
                  name="scheduleMeridiem"
                  render={({ field }) => (
                    <Select
                      errorMessage={errors.scheduleMeridiem?.message}
                      isInvalid={!!errors.scheduleMeridiem}
                      label="AM/PM"
                      selectedKeys={field.value ? [field.value] : []}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys as Set<string>)[0] ?? "";
                        field.onChange(selected);
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
          ) : null}

          <div className="flex justify-end">
            <Button
              className="bg-[#022279] text-white"
              isLoading={isSubmitting}
              onPress={() => {
                void handleSubmit(submitQuickScan)();
              }}
            >
              Run Quick Scan
            </Button>
          </div>
        </CardBody>
      </Card>
    </section>
  );
};
