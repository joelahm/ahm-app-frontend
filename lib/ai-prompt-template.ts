import type { ClientDetails } from "@/apis/clients";

export interface ResolveAiPromptTemplateOptions {
  template: string;
  values: Record<string, string>;
}

const normalizeTokenMap = (values: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
  );

const formatList = (items?: unknown[] | null) =>
  Array.isArray(items)
    ? items
        .map((item) => {
          if (typeof item === "string") {
            return item.trim();
          }

          if (item && typeof item === "object") {
            const source = item as Record<string, unknown>;
            const value =
              source.name ?? source.label ?? source.title ?? source.value ?? "";

            return String(value).trim();
          }

          return String(item ?? "").trim();
        })
        .filter(Boolean)
        .join(", ")
    : "";

const formatPracticeHours = (hours?: ClientDetails["practiceHours"] | null) => {
  if (!Array.isArray(hours) || hours.length === 0) {
    return "";
  }

  return hours
    .map((item) => {
      const day = item.day?.trim();

      if (!day) {
        return "";
      }

      if (!item.enabled) {
        return `${day}: Closed`;
      }

      const start = [item.startTime, item.startMeridiem]
        .map((value) => value?.trim())
        .filter(Boolean)
        .join(" ");
      const end = [item.endTime, item.endMeridiem]
        .map((value) => value?.trim())
        .filter(Boolean)
        .join(" ");

      return start && end ? `${day}: ${start} - ${end}` : `${day}: Open`;
    })
    .filter(Boolean)
    .join("\n");
};

export const resolveAiPromptTemplate = ({
  template,
  values,
}: ResolveAiPromptTemplateOptions) => {
  const normalizedValues = normalizeTokenMap(values);

  return template
    .replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, token: string) => {
      const key = token.toLowerCase();

      return normalizedValues[key] ?? "";
    })
    .replace(/\[([A-Z0-9_]+)\]/g, (_, token: string) => {
      const key = token.toLowerCase();

      return normalizedValues[key] ?? "";
    });
};

export interface BuildAiPromptTemplateValuesInput {
  audience?: string;
  brandName?: string;
  businessName?: string;
  clientDetails?: ClientDetails | null;
  contentLength?: string;
  contentType?: string;
  contentTitle?: string;
  intent?: string;
  keyword?: string;
  location?: string;
  maxCharacter?: string;
  pageType?: string;
  requireClient?: boolean;
  searchVolume?: string;
  topic?: string;
  url?: string;
}

export const buildAiPromptTemplateValues = ({
  audience = "",
  brandName = "",
  businessName = "",
  clientDetails = null,
  contentLength = "",
  contentType = "",
  contentTitle = "",
  intent = "",
  keyword = "",
  location = "",
  maxCharacter = "",
  pageType = "",
  requireClient = false,
  searchVolume = "",
  topic = "",
  url = "",
}: BuildAiPromptTemplateValuesInput): Record<string, string> => {
  if (requireClient && !clientDetails) {
    throw new Error("Client is required.");
  }

  const clientName = clientDetails?.clientName?.trim() || "";
  const clientBusinessName = clientDetails?.businessName?.trim() || "";
  const clientWebsite = clientDetails?.website?.trim() || "";
  const clientAddressLine1 = clientDetails?.addressLine1?.trim() || "";
  const clientAddressLine2 = clientDetails?.addressLine2?.trim() || "";
  const clientCityState = clientDetails?.cityState?.trim() || "";
  const clientCountry = clientDetails?.country?.trim() || "";
  const clientPostCode = clientDetails?.postCode?.trim() || "";
  const clientPracticeEmail = clientDetails?.practiceEmail?.trim() || "";
  const clientPersonalEmail = clientDetails?.personalEmail?.trim() || "";
  const clientBusinessPhone = clientDetails?.businessPhone?.trim() || "";
  const clientPersonalPhone = clientDetails?.personalPhone?.trim() || "";
  const clientProfession = clientDetails?.profession?.trim() || "";
  const clientNiche = clientDetails?.niche?.trim() || "";
  const clientPracticeIntroduction =
    clientDetails?.practiceIntroduction?.trim() || "";
  const clientTargetArea = clientDetails?.visibleArea?.trim() || "";
  const clientTopTreatments = formatList(clientDetails?.topTreatments);
  const clientSubSpecialties = formatList(clientDetails?.subSpecialties);
  const clientTopMedicalSpecialties = formatList(
    clientDetails?.topMedicalSpecialties,
  );
  const clientTreatmentAndServices = formatList(
    clientDetails?.treatmentAndServices,
  );
  const clientConditionsTreated = formatList(clientDetails?.conditionsTreated);

  return {
    address: [
      clientAddressLine1,
      clientAddressLine2,
      clientCityState,
      clientCountry,
    ]
      .filter(Boolean)
      .join(", "),
    address_line_1: clientAddressLine1,
    address_line_2: clientAddressLine2,
    audience,
    brand_name: brandName || clientBusinessName,
    business_name: businessName || clientBusinessName,
    business_phone: clientBusinessPhone,
    city_state: clientCityState,
    client_business_email: clientPracticeEmail,
    client_name: clientName,
    client_building_name: clientDetails?.buildingName?.trim() || "",
    content_type: contentType,
    country: clientCountry,
    client_business_name: clientBusinessName,
    client_business_phone: clientBusinessPhone,
    client_conditions_treated: clientConditionsTreated,
    client_country: clientCountry,
    client_credentials: clientDetails?.credentials?.trim() || "",
    client_discord_channel: clientDetails?.discordChannel?.trim() || "",
    client_facebook: clientDetails?.facebook?.trim() || "",
    client_gbp_link: clientDetails?.gbpLink?.trim() || "",
    client_gmc_registration_number:
      clientDetails?.gmcRegistrationNumber?.trim() || "",
    client_instagram: clientDetails?.instagram?.trim() || "",
    client_linkedin: clientDetails?.linkedin?.trim() || "",
    client_major_accomplishments:
      clientDetails?.majorAccomplishments?.trim() || "",
    client_nearby_areas_served: clientDetails?.nearbyAreasServed?.trim() || "",
    client_niche: clientNiche,
    client_personal_email: clientPersonalEmail,
    client_personal_phone: clientPersonalPhone,
    client_post_code: clientPostCode,
    client_practice_hours: formatPracticeHours(clientDetails?.practiceHours),
    client_practice_structure: clientDetails?.practiceStructure?.trim() || "",
    client_region: clientDetails?.region?.trim() || "",
    client_street_address: clientDetails?.streetAddress?.trim() || "",
    client_sub_specialty: clientSubSpecialties,
    client_sub_specialties: clientSubSpecialties,
    client_target_area: clientTargetArea,
    client_title: clientProfession,
    client_top_medical_specialties: clientTopMedicalSpecialties,
    client_top_treatments: clientTopTreatments,
    client_treatment_and_services: clientTreatmentAndServices,
    client_type_of_practice: clientDetails?.typeOfPractice?.trim() || "",
    client_unique_to_competitors:
      clientDetails?.uniqueToCompetitors?.trim() || "",
    client_unit_number: clientDetails?.unitNumber?.trim() || "",
    client_website: clientWebsite,
    intent,
    keyword,
    location: location || clientCityState || clientCountry,
    max_character: maxCharacter,
    max_characters: maxCharacter,
    niche: clientNiche,
    page_type: pageType,
    personal_email: clientPersonalEmail,
    post_code: clientPostCode,
    practice_email: clientPracticeEmail,
    practice_introduction: clientPracticeIntroduction,
    profession: clientProfession,
    client_profession: clientProfession,
    client_city_state: clientCityState,
    client_practice_introduction: clientPracticeIntroduction,
    client_special_interests: formatList(clientDetails?.specialInterests),
    client_visible_area: clientTargetArea,
    topic,
    url: url || clientWebsite,
    website: clientWebsite,
    webcontent_audience: audience,
    webcontent_content_length: contentLength || maxCharacter,
    webcontent_content_type: contentType,
    webcontent_intent: intent,
    webcontent_keyword: keyword,
    webcontent_search_volume: searchVolume,
    webcontent_title: contentTitle,
    webcontent_topic: topic,
  };
};
