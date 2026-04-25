import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const citationDatabaseApiClient = axios.create({
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

export interface CitationDatabaseItem {
  createdAt: string;
  createdBy: {
    email?: string;
    id: number;
    name: string;
  };
  da: number;
  id: string;
  name: string;
  niche: string;
  payment: string;
  status: string;
  type: string;
  updatedAt: string;
  validationLink: string;
}

export interface CreateCitationRequestBody {
  da: number;
  name: string;
  niche: string;
  payment: string;
  type: string;
  validationLink: string;
}

export const citationDatabaseApi = {
  listCitations: async (accessToken: string) => {
    try {
      const response = await citationDatabaseApiClient.get<{
        citations: CitationDatabaseItem[];
      }>("/api/v1/citation-database", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  createCitation: async (
    accessToken: string,
    payload: CreateCitationRequestBody,
  ) => {
    try {
      const response = await citationDatabaseApiClient.post<{
        citation: CitationDatabaseItem;
        success?: boolean;
      }>("/api/v1/citation-database", payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateCitation: async (
    accessToken: string,
    citationId: string,
    payload: CreateCitationRequestBody,
  ) => {
    try {
      const response = await citationDatabaseApiClient.patch<{
        citation: CitationDatabaseItem;
        success?: boolean;
      }>(`/api/v1/citation-database/${citationId}`, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteCitation: async (accessToken: string, citationId: string) => {
    try {
      const response = await citationDatabaseApiClient.delete<{
        success?: boolean;
      }>(`/api/v1/citation-database/${citationId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  bulkCreateCitations: async (
    accessToken: string,
    payload: { citations: CreateCitationRequestBody[] },
  ) => {
    try {
      const response = await citationDatabaseApiClient.post<{
        citations: CitationDatabaseItem[];
        success?: boolean;
      }>("/api/v1/citation-database/bulk", payload, {
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
