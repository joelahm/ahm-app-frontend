import type { ClientDetails } from "@/apis/clients";

export interface ResolveAiPromptTemplateOptions {
  template: string;
  values: Record<string, string>;
}

const normalizeTokenMap = (values: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
  );

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
  contentType?: string;
  intent?: string;
  keyword?: string;
  location?: string;
  maxCharacter?: string;
  pageType?: string;
  requireClient?: boolean;
  topic?: string;
  url?: string;
}

export const buildAiPromptTemplateValues = ({
  audience = "",
  brandName = "",
  businessName = "",
  clientDetails = null,
  contentType = "",
  intent = "",
  keyword = "",
  location = "",
  maxCharacter = "",
  pageType = "",
  requireClient = false,
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
  const clientProfession = clientDetails?.profession?.trim() || "";
  const clientNiche = clientDetails?.niche?.trim() || "";
  const clientPracticeIntroduction =
    clientDetails?.practiceIntroduction?.trim() || "";

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
    client_name: clientName,
    content_type: contentType,
    country: clientCountry,
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
    topic,
    url: url || clientWebsite,
    website: clientWebsite,
  };
};
