export interface LocationOption {
  key: string;
  label: string;
}

const FALLBACK_TIME_ZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Manila",
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
];

const DATE_FORMATS = [
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "YYYY-MM-DD",
  "DD-MM-YYYY",
  "MMM DD, YYYY",
  "DD MMM YYYY",
];

const intlWithSupportedValues = Intl as typeof Intl & {
  supportedValuesOf?: (key: "region" | "timeZone") => string[];
};

const getSupportedValues = (key: "region" | "timeZone") => {
  try {
    const values = intlWithSupportedValues.supportedValuesOf?.(key);

    return values && values.length > 0 ? values : [];
  } catch {
    return [];
  }
};

const buildFallbackRegionCodes = (locale = "en") => {
  const displayNames = new Intl.DisplayNames([locale], { type: "region" });
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const codes: string[] = [];

  for (const first of alphabet) {
    for (const second of alphabet) {
      const code = `${first}${second}`;
      const label = displayNames.of(code);

      if (!label || label === code || label === "Unknown Region") {
        continue;
      }

      codes.push(code);
    }
  }

  return codes;
};

const formatOffsetLabel = (timeZone: string) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
      timeZoneName: "shortOffset",
    });
    const offsetPart = formatter
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;

    if (!offsetPart) {
      return "UTC+00:00";
    }

    if (offsetPart === "GMT" || offsetPart === "UTC") {
      return "UTC+00:00";
    }

    const normalized = offsetPart.replace("GMT", "");
    const sign = normalized.startsWith("-") ? "-" : "+";
    const value = normalized.replace(/[+-]/g, "");
    const [hours = "00", minutes = "00"] = value.split(":");
    const paddedHours = hours.padStart(2, "0");
    const paddedMinutes = minutes.padStart(2, "0");

    return `UTC${sign}${paddedHours}:${paddedMinutes}`;
  } catch {
    return "UTC+00:00";
  }
};

export const getCountryOptions = (locale = "en"): LocationOption[] => {
  const displayNames = new Intl.DisplayNames([locale], { type: "region" });
  const regionCodes = getSupportedValues("region");
  const resolvedRegionCodes =
    regionCodes.length > 0 ? regionCodes : buildFallbackRegionCodes(locale);

  return resolvedRegionCodes
    .map((code) => {
      const name = displayNames.of(code);

      if (!name || name === code || name === "Unknown Region") {
        return null;
      }

      return {
        key: code,
        label: name,
      };
    })
    .filter((item): item is LocationOption => item !== null)
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const getTimeZoneOptions = (): LocationOption[] => {
  const zones = getSupportedValues("timeZone");
  const resolvedZones = zones.length > 0 ? zones : FALLBACK_TIME_ZONES;

  return resolvedZones
    .map((timeZone) => ({
      key: timeZone,
      label: `${formatOffsetLabel(timeZone)} - ${timeZone.replace(/_/g, " ")}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const getDateFormatOptions = (): LocationOption[] =>
  DATE_FORMATS.map((format) => ({
    key: format,
    label: format,
  }));
