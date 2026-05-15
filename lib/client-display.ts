import type { ClientDetails } from "@/apis/clients";

export const formatClientSlug = (slug: string) =>
  decodeURIComponent(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const appendUniqueAddressPart = (parts: string[], value?: string | null) => {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return;
  }

  const isDuplicate = parts.some(
    (part) => part.toLowerCase() === normalizedValue.toLowerCase(),
  );

  if (!isDuplicate) {
    parts.push(normalizedValue);
  }
};

export const getClientDisplayName = (
  client: Pick<ClientDetails, "businessName" | "clientName">,
  fallback = "",
) => client.clientName?.trim() || client.businessName?.trim() || fallback;

export const getClientDisplayAddress = (client: ClientDetails) => {
  const parts: string[] = [];

  appendUniqueAddressPart(parts, client.buildingName);
  appendUniqueAddressPart(parts, client.unitNumber);
  appendUniqueAddressPart(parts, client.streetAddress || client.addressLine1);
  appendUniqueAddressPart(parts, client.addressLine2);
  appendUniqueAddressPart(parts, client.cityState || client.region);
  appendUniqueAddressPart(parts, client.postCode);
  appendUniqueAddressPart(parts, client.country);

  return parts.join(", ");
};
