import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const schemaGeneratorSettingsApiClient = axios.create({
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

export interface SchemaTypeOption {
  id: string;
  label: string;
  value: string;
}

export interface SchemaMedicalSpecialtyOption {
  id: string;
  label: string;
  value: string;
}

export interface SchemaServiceTypeOption {
  id: string;
  label: string;
  value: string;
}

export const schemaGeneratorSettingsApi = {
  getSchemaTypes: async (accessToken: string) => {
    try {
      const response = await schemaGeneratorSettingsApiClient.get<{
        types: SchemaTypeOption[];
      }>("/api/v1/schema-generator-settings/types", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getMedicalSpecialties: async (accessToken: string) => {
    try {
      const response = await schemaGeneratorSettingsApiClient.get<{
        medicalSpecialties: SchemaMedicalSpecialtyOption[];
      }>("/api/v1/schema-generator-settings/medical-specialties", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getServiceTypes: async (accessToken: string) => {
    try {
      const response = await schemaGeneratorSettingsApiClient.get<{
        serviceTypes: SchemaServiceTypeOption[];
      }>("/api/v1/schema-generator-settings/service-types", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};
