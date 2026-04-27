import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const scansApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const parseError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string;
          error?: { message?: string };
        }
      | undefined;
    const message = data?.error?.message ?? data?.message ?? error.message;

    return message || "Something went wrong.";
  }

  return "Something went wrong.";
};

export interface CreateScanRequestBody {
  clientId?: number;
  coverage: Array<{
    isOffshore?: boolean;
    label: string;
    latitude: number;
    longitude: number;
    offshoreReason?: string;
  }>;
  coverageUnit: "KILOMETERS" | "MILES";
  quickScanContext?: {
    address?: string | null;
    businessName?: string | null;
    dataCid?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    placeId?: string | null;
    website?: string | null;
  };
  frequency?: string;
  keywords: string[];
  labels: string[];
  notes?: string;
  recurrenceEnabled?: boolean;
  repeatTime?: string;
  scanScope?: "CLIENT" | "QUICK";
  sourcePage?: string;
  runNow: boolean;
  startDate?: string;
  startTime?: string;
  timezone?: string;
}

export interface ScanRecord {
  id: number;
  scanId?: number;
  status?: string;
  totalRequests?: number;
  completedRequests?: number;
  failedRequests?: number;
  summary?: {
    coordinates?: number;
    failedChecks?: number;
    keywords?: number;
    successfulChecks?: number;
  };
  startedAt?: string | null;
  finishedAt?: string | null;
  results?: unknown[];
}

export interface CreateScanResponse {
  data?: {
    id?: number;
    run?: ScanRecord;
    scan?: {
      id?: number;
    };
  };
  id?: number;
  message?: string;
  run?: ScanRecord;
  runs?: ScanRecord[];
  scan?: {
    frequency?: string | null;
    id?: number;
    keyword?: string;
    nextRunAt?: string | null;
  };
  scans?: Array<{
    frequency?: string | null;
    id?: number;
    keyword?: string;
    nextRunAt?: string | null;
  }>;
}

export interface RunScanResponse {
  message?: string;
  run: ScanRecord;
}

export interface LocalRankingCoordinate {
  apiLogId?: number | null;
  coordinateLabel: string;
  id: number;
  isOffshore?: boolean;
  latitude: number;
  longitude: number;
  matchedAddress?: string | null;
  matchedDomain?: string | null;
  matchedPhone?: string | null;
  matchedPlaceId?: string | null;
  matchedRating?: number | null;
  matchedTitle?: string | null;
  rankAbsolute?: number | null;
  rankGroup?: number | null;
  offshoreReason?: string | null;
}

export interface LocalRankingKeyword {
  clientAddress?: string | null;
  clientId?: number | null;
  clientName?: string | null;
  coverageUnit?: string | null;
  averageRank?: number | null;
  bestRank?: number | null;
  coordinates: LocalRankingCoordinate[];
  dateAdded?: string | null;
  dateOfScan?: string | null;
  foundCoordinates?: number | null;
  frequency?: string | null;
  keyword: string;
  latestScan?: number | null;
  matchedDomain?: string | null;
  matchedPhone?: string | null;
  matchedPlaceId?: string | null;
  matchedRating?: number | null;
  matchedTitle?: string | null;
  missingCoordinates?: number | null;
  competitors?: Array<{
    key: string;
    businessName: string;
    address?: string | null;
    domain?: string | null;
    primaryCategory?: string | null;
    secondaryCategory?: string | null;
    photos?: number | null;
    bestRank?: number | null;
    averageRank?: number | null;
    rating?: number | null;
    reviewsCount?: number | null;
  }>;
  nextSchedule?: string | null;
  nextRunAt?: string | null;
  previousScan?: number | null;
  runId: number;
  runStatus?: string | null;
  scanId: number;
  scanStatus?: string | null;
  totalScans?: number | null;
  totalCoordinates?: number | null;
  worstRank?: number | null;
}

export interface LocalRankingsResponse {
  keywords: LocalRankingKeyword[];
  pagination: {
    hasNext: boolean;
    hasPrev: boolean;
    limit: number;
    nextPage: number | null;
    page: number;
    prevPage: number | null;
    total: number;
    totalPages: number;
  };
}

export interface ScanKeywordDetailsResponse {
  keyword: LocalRankingKeyword & {
    gbpProfile?: {
      address?: string | null;
      gpsCoordinates?: unknown;
      id: number;
      placeId?: string | null;
      title?: string | null;
      website?: string | null;
    };
  };
}

export interface ScanComparisonRun extends LocalRankingKeyword {
  finishedAt?: string | null;
  startedAt?: string | null;
}

export interface ClientScanComparisonResponse {
  comparison: {
    clientId: number;
    coverage: Array<{
      label: string | null;
      latitude: number;
      longitude: number;
    }>;
    coverageUnit: string;
    frequency?: string | null;
    keyword: string;
    nextRunAt?: string | null;
    remainingRuns?: number | null;
    recurrenceEnabled?: boolean;
    repeatTime?: number | null;
    runs: ScanComparisonRun[];
    scanId: number;
    startAt?: string | null;
    totalRuns: number;
  };
  scan: ClientScanDetails;
}

export interface SavedLocalRankingKeywordsResponse {
  clientId: number;
  keywords: string[];
  total: number;
}

export interface ClientScanDetails {
  scanScope?: string;
  sourcePage?: string | null;
  quickScanContext?: Record<string, unknown> | null;
  clientId: number | null;
  coverage: Array<{
    label: string | null;
    latitude: number;
    longitude: number;
  }>;
  coverageUnit: string;
  createdAt?: string;
  estimatedRequests?: number;
  frequency?: string | null;
  gbpProfile?: {
    address?: string | null;
    id: number;
    placeId?: string | null;
    title?: string | null;
    website?: string | null;
  } | null;
  id: number;
  keyword: string;
  labels?: string[];
  latestRun?: ScanRecord | null;
  nextRunAt?: string | null;
  notes?: string | null;
  remainingRuns?: number | null;
  recurrenceEnabled?: boolean;
  repeatTime?: number | null;
  startAt?: string | null;
  status?: string;
  timezone?: string | null;
  updatedAt?: string;
}

const resolveNumericId = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const extractScanId = (payload: CreateScanResponse) =>
  resolveNumericId(payload.scan?.id) ??
  resolveNumericId(payload.id) ??
  resolveNumericId(payload.data?.scan?.id) ??
  resolveNumericId(payload.data?.id);

export const extractRunRecord = (payload: CreateScanResponse) =>
  payload.run ?? payload.data?.run ?? null;

export const scansApi = {
  createScan: async (accessToken: string, payload: CreateScanRequestBody) => {
    try {
      const response = await scansApiClient.post("/api/v1/scans", payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data as CreateScanResponse;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getClientLocalRankings: async (
    accessToken: string,
    clientId: number | string,
    params: {
      limit: number;
      page: number;
    },
  ) => {
    try {
      const response = await scansApiClient.get(
        `/api/v1/scans/client/${clientId}/local-rankings`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params,
        },
      );

      return response.data as LocalRankingsResponse;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getClientScanById: async (
    accessToken: string,
    clientId: number | string,
    scanId: number | string,
  ) => {
    try {
      const response = await scansApiClient.get<{ scan: ClientScanDetails }>(
        `/api/v1/scans/client/${clientId}/${scanId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data.scan;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getScanById: async (accessToken: string, scanId: number | string) => {
    try {
      const response = await scansApiClient.get<{ scan: ClientScanDetails }>(
        `/api/v1/scans/${scanId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data.scan;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getClientScanComparison: async (
    accessToken: string,
    clientId: number | string,
    scanId: number | string,
    limit = 3,
  ) => {
    try {
      const response = await scansApiClient.get<ClientScanComparisonResponse>(
        `/api/v1/scans/client/${clientId}/${scanId}/comparison`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: { limit },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getScanKeywordDetails: async (
    accessToken: string,
    scanId: number | string,
    runId: number | string,
  ) => {
    try {
      const response = await scansApiClient.get<ScanKeywordDetailsResponse>(
        `/api/v1/scans/${scanId}/runs/${runId}/keyword-details`,
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
  runScan: async (accessToken: string, scanId: number | string) => {
    try {
      const response = await scansApiClient.post<RunScanResponse>(
        `/api/v1/scans/${scanId}/run`,
        {},
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
  getScanRunById: async (
    accessToken: string,
    scanId: number | string,
    runId: number | string,
  ) => {
    try {
      const response = await scansApiClient.get<{ run: ScanRecord }>(
        `/api/v1/scans/${scanId}/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data.run;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  listScanRuns: async (
    accessToken: string,
    scanId: number | string,
    params: {
      limit?: number;
      page?: number;
    },
  ) => {
    try {
      const response = await scansApiClient.get<{
        pagination: LocalRankingsResponse["pagination"];
        runs: ScanRecord[];
      }>(`/api/v1/scans/${scanId}/runs`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteScanById: async (accessToken: string, scanId: number | string) => {
    try {
      const response = await scansApiClient.delete<{
        deleted: boolean;
      }>(`/api/v1/scans/${scanId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteScanKeyword: async (
    accessToken: string,
    scanId: number | string,
    keyword: string,
  ) => {
    try {
      const response = await scansApiClient.delete<{
        deleted: boolean;
      }>(`/api/v1/scans/${scanId}/keywords`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          keyword,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getSavedLocalRankingKeywords: async (
    accessToken: string,
    clientId: number | string,
  ) => {
    try {
      const response =
        await scansApiClient.get<SavedLocalRankingKeywordsResponse>(
          `/api/v1/scans/client/${clientId}/local-rankings/saved-keywords`,
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
  saveLocalRankingKeywords: async (
    accessToken: string,
    clientId: number | string,
    keywords: string[],
  ) => {
    try {
      const response =
        await scansApiClient.post<SavedLocalRankingKeywordsResponse>(
          `/api/v1/scans/client/${clientId}/local-rankings/saved-keywords`,
          { keywords },
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
  clearSavedLocalRankingKeywords: async (
    accessToken: string,
    clientId: number | string,
  ) => {
    try {
      const response = await scansApiClient.delete<{
        cleared: boolean;
        clientId: number;
      }>(`/api/v1/scans/client/${clientId}/local-rankings/saved-keywords`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getQuickGbpPreview: async (
    accessToken: string,
    payload: {
      dataCid?: string;
      forceRefresh?: boolean;
      gl?: string;
      hl?: string;
      placeId?: string;
    },
  ) => {
    try {
      const response = await scansApiClient.post<{
        address?: string | null;
        businessName?: string | null;
        dataCid?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        placeId?: string | null;
        website?: string | null;
      }>("/api/v1/scans/quick/gbp-preview", payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  listScans: async (
    accessToken: string,
    params: {
      clientId?: number | string;
      limit: number;
      page: number;
      scope?: "CLIENT" | "QUICK" | "ALL";
      view?: "history" | "recurring" | "deleted";
    },
  ) => {
    try {
      const response = await scansApiClient.get<{
        pagination: LocalRankingsResponse["pagination"];
        scans: ClientScanDetails[];
      }>("/api/v1/scans", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          ...params,
          scope: params.scope === "ALL" ? undefined : params.scope,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};
