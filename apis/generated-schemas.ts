import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const generatedSchemasApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const parseError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message;

    return message || "Something went wrong.";
  }

  return "Something went wrong.";
};

export type GeneratedSchemaPageType =
  | "homepage"
  | "treatment-page"
  | "location-page";

export interface GeneratedSchemaBusinessHours {
  [key: string]: {
    closeHour: string;
    closeMinute: string;
    openHour: string;
    openMinute: string;
    status: "open" | "closed";
  };
}

export interface GeneratedSchemaFormValues {
  businessName: string;
  clientId: string;
  countryCode: string;
  description: string;
  email: string;
  hasMapUrl: string;
  hospitalAffiliations: Array<{
    businessHours: GeneratedSchemaBusinessHours;
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
  }>;
  latitude: string;
  locality: string;
  logoUrl: string;
  longitude: string;
  medicalSpecialties: string[];
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

export interface SaveGeneratedSchemaRequestBody {
  businessHours: GeneratedSchemaBusinessHours;
  clientId: string;
  clientName: string;
  formValues: GeneratedSchemaFormValues;
  previewJson: string;
  schemaType: GeneratedSchemaPageType;
}

export interface GeneratedSchemaListItem {
  businessHours: GeneratedSchemaBusinessHours;
  clientId: string;
  clientName: string;
  createdAt: string;
  createdBy: {
    email: string;
    id: number;
    name: string;
  };
  formValues: GeneratedSchemaFormValues;
  id: string;
  previewJson: string;
  schemaType: GeneratedSchemaPageType;
  updatedAt: string;
}

export const generatedSchemasApi = {
  getGeneratedSchemas: async (accessToken: string) => {
    try {
      const response = await generatedSchemasApiClient.get<{
        generatedSchemas: GeneratedSchemaListItem[];
      }>("/api/v1/generated-schemas", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getGeneratedSchema: async (accessToken: string, schemaId: string) => {
    try {
      const response = await generatedSchemasApiClient.get<{
        generatedSchema: GeneratedSchemaListItem;
      }>(`/api/v1/generated-schemas/${schemaId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  createGeneratedSchema: async (
    accessToken: string,
    payload: SaveGeneratedSchemaRequestBody,
  ) => {
    try {
      const response = await generatedSchemasApiClient.post(
        "/api/v1/generated-schemas",
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateGeneratedSchema: async (
    accessToken: string,
    schemaId: string,
    payload: SaveGeneratedSchemaRequestBody,
  ) => {
    try {
      const response = await generatedSchemasApiClient.patch(
        `/api/v1/generated-schemas/${schemaId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteGeneratedSchema: async (accessToken: string, schemaId: string) => {
    try {
      const response = await generatedSchemasApiClient.delete(
        `/api/v1/generated-schemas/${schemaId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};
