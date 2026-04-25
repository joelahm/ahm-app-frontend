import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const keywordResearchApiClient = axios.create({
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

export interface KeywordResearchRequestBody {
  country: string;
  countryIsoCode?: string;
  forceRefresh?: boolean;
  keyword: string;
  languageCode: string;
  languageName: string;
  locationCode?: number;
}

export interface KeywordOverviewRequestBody {
  clientId?: string;
  countryIsoCode?: string;
  forceRefresh?: boolean;
  keywords: string[];
  languageCode: string;
  languageName?: string;
  locationCode?: number;
}

export interface KeywordResearchCountryOption {
  key?: string;
  label: string;
  locationCode: number;
  value: string;
}

export interface KeywordResearchLanguageOption {
  key?: string;
  label: string;
  value: string;
}

export interface KeywordResearchRegionOption {
  key?: string;
  label: string;
  locationCode: number;
  locationType: string | null;
  value: string;
}

export interface KeywordResearchItem {
  cpc: number | null;
  id: string;
  intent: string | null;
  kd: number | null;
  keyword: string;
  searchVolume: number | null;
  serp: string | null;
}

export const keywordResearchApi = {
  syncGoogleAdsReferenceData: async (options?: {
    accessToken?: string;
    forceRefresh?: boolean;
  }) => {
    try {
      const response = await keywordResearchApiClient.get<{
        success?: boolean;
      }>("/api/v1/integrations/dataforseo/google-ads-reference/sync", {
        headers: options?.accessToken
          ? {
              Authorization: `Bearer ${options.accessToken}`,
            }
          : undefined,
        params: {
          forceRefresh: options?.forceRefresh ?? true,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getLanguages: async (accessToken: string) => {
    try {
      const response = await keywordResearchApiClient.get<{
        languages: KeywordResearchLanguageOption[];
      }>("/api/v1/integrations/dataforseo/google-ads-languages", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getCountries: async (accessToken?: string) => {
    try {
      const response = await keywordResearchApiClient.get<{
        countries: KeywordResearchCountryOption[];
      }>("/api/v1/integrations/dataforseo/google-ads-locations/countries", {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getRegions: async (
    accessToken: string,
    options: { countryIsoCode: string; query?: string },
  ) => {
    try {
      const response = await keywordResearchApiClient.get<{
        regions: KeywordResearchRegionOption[];
      }>("/api/v1/integrations/dataforseo/google-ads-locations/regions", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          countryIsoCode: options.countryIsoCode,
          query: options.query ?? undefined,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getSimilarKeywords: async (
    accessToken: string,
    payload: KeywordResearchRequestBody,
  ) => {
    try {
      const response = await keywordResearchApiClient.post<{
        keywords: KeywordResearchItem[];
      }>("/api/v1/integrations/dataforseo/keywords/similar", payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getKeywordSuggestions: async (
    accessToken: string,
    payload: KeywordResearchRequestBody,
  ) => {
    try {
      const response = await keywordResearchApiClient.post<{
        keywords: KeywordResearchItem[];
      }>("/api/v1/integrations/dataforseo/keywords/suggestions", payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getKeywordOverview: async (
    accessToken: string,
    payload: KeywordOverviewRequestBody,
  ) => {
    try {
      const response = await keywordResearchApiClient.post<{
        keywords: KeywordResearchItem[];
      }>("/api/v1/integrations/dataforseo/keywords/overview", payload, {
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
