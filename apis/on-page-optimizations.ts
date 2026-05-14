import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const onPageOptimizationsApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const parseError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: { message?: string }; message?: string }
      | undefined;

    return data?.error?.message ?? data?.message ?? error.message;
  }

  return "Something went wrong.";
};

export interface OnPageOptimizationRun {
  clientId: string;
  completedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  driveLink: string | null;
  failureMessage: string | null;
  healthGrade: string | null;
  healthScore: number | null;
  healthStatus: string | null;
  highIssues: number | null;
  id: string;
  lowIssues: number | null;
  markdownPath: string | null;
  mediumIssues: number | null;
  pagesAudited: number | null;
  pdfLink: string | null;
  pdfPath: string | null;
  result: Record<string, unknown> | null;
  sitemapUrl: string | null;
  startedAt: string | null;
  status: string;
  summary: Record<string, unknown> | null;
  updatedAt: string;
  websiteUrl: string;
}

export interface OnPageActivityUser {
  avatarUrl: string | null;
  id: number;
  name: string;
}

export interface OnPageActivityCommentItem {
  body: string;
  bodyJson: Record<string, unknown> | null;
  createdAt: string;
  createdBy: OnPageActivityUser | null;
  id: number;
  kind: "comment";
}

export interface OnPageActivityEventItem {
  actor: OnPageActivityUser | null;
  createdAt: string;
  id: number;
  kind: "event";
  metadata: Record<string, unknown>;
  type: string;
}

export type OnPageActivityItem =
  | OnPageActivityCommentItem
  | OnPageActivityEventItem;

export interface WebpExportSummary {
  failed: Array<{ reason: string; src: string }>;
  selected: number;
  skipped: number;
  successful: number;
}

interface PageActivityResponse {
  cursor?: string | null;
  items?: OnPageActivityItem[];
}

interface RunsResponse {
  runs?: OnPageOptimizationRun[];
  total?: number;
}

interface RunResponse {
  run?: OnPageOptimizationRun;
}

interface SettingsResponse {
  settings?: {
    sitemapUrl: string | null;
  };
}

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export const onPageOptimizationsApi = {
  createRun: async (
    accessToken: string,
    clientId: string | number,
    payload: { sitemapUrl?: string; websiteUrl?: string },
  ) => {
    try {
      const response = await onPageOptimizationsApiClient.post<RunResponse>(
        `/api/v1/clients/${clientId}/on-page-optimizations`,
        payload,
        {
          headers: authHeaders(accessToken),
        },
      );

      if (!response.data.run) {
        throw new Error("On-page optimization run was not returned.");
      }

      return response.data.run;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text) as {
            error?: { message?: string };
            message?: string;
          };

          throw new Error(
            parsed.error?.message ?? parsed.message ?? error.message,
          );
        } catch (parseFailure) {
          if (parseFailure instanceof Error) {
            throw parseFailure;
          }
        }
      }

      throw new Error(parseError(error));
    }
  },
  createPageComment: async (
    accessToken: string,
    clientId: string | number,
    runId: string | number,
    payload: {
      bodyJson?: Record<string, unknown>;
      comment: string;
      pageUrl: string;
    },
  ) => {
    try {
      const response = await onPageOptimizationsApiClient.post<{
        comment?: OnPageActivityCommentItem;
      }>(
        `/api/v1/clients/${clientId}/on-page-optimizations/${runId}/pages/activity/comments`,
        payload,
        {
          headers: authHeaders(accessToken),
        },
      );

      if (!response.data.comment) {
        throw new Error("Comment was not returned.");
      }

      return response.data.comment;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text) as {
            error?: { message?: string };
            message?: string;
          };

          throw new Error(
            parsed.error?.message ?? parsed.message ?? error.message,
          );
        } catch (parseFailure) {
          if (parseFailure instanceof Error) {
            throw parseFailure;
          }
        }
      }

      throw new Error(parseError(error));
    }
  },
  deletePageComment: async (
    accessToken: string,
    clientId: string | number,
    runId: string | number,
    activityId: string | number,
  ) => {
    try {
      await onPageOptimizationsApiClient.delete(
        `/api/v1/clients/${clientId}/on-page-optimizations/${runId}/pages/activity/comments/${activityId}`,
        {
          headers: authHeaders(accessToken),
        },
      );
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deleteRun: async (
    accessToken: string,
    clientId: string | number,
    runId: string | number,
  ) => {
    try {
      await onPageOptimizationsApiClient.delete(
        `/api/v1/clients/${clientId}/on-page-optimizations/${runId}`,
        {
          headers: authHeaders(accessToken),
        },
      );
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  exportWebpImages: async (
    accessToken: string,
    clientId: string | number,
    payload: {
      images: Array<{
        filename?: string;
        src: string;
      }>;
    },
  ): Promise<{
    blob: Blob;
    filename: string;
    summary: WebpExportSummary | null;
  }> => {
    try {
      const response = await onPageOptimizationsApiClient.post<Blob>(
        `/api/v1/clients/${clientId}/on-page-optimizations/webp-export`,
        payload,
        {
          headers: authHeaders(accessToken),
          responseType: "blob",
        },
      );
      const disposition = response.headers["content-disposition"] as
        | string
        | undefined;
      const summaryHeader = response.headers["x-webp-export-summary"] as
        | string
        | undefined;
      const filenameMatch = disposition?.match(/filename="([^"]+)"/i);
      let summary: WebpExportSummary | null = null;

      if (summaryHeader) {
        try {
          summary = JSON.parse(decodeURIComponent(summaryHeader));
        } catch {
          summary = null;
        }
      }

      return {
        blob: response.data,
        filename: filenameMatch?.[1] ?? "webp-optimization.zip",
        summary,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text) as {
            error?: { message?: string };
            message?: string;
          };

          throw new Error(
            parsed.error?.message ?? parsed.message ?? error.message,
          );
        } catch (parseFailure) {
          if (parseFailure instanceof Error) {
            throw parseFailure;
          }
        }
      }

      throw new Error(parseError(error));
    }
  },
  getSettings: async (accessToken: string, clientId: string | number) => {
    try {
      const response = await onPageOptimizationsApiClient.get<SettingsResponse>(
        `/api/v1/clients/${clientId}/on-page-optimizations/settings`,
        {
          headers: authHeaders(accessToken),
        },
      );

      return response.data.settings ?? { sitemapUrl: null };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  downloadRunPdf: async (
    accessToken: string,
    clientId: string | number,
    runId: string | number,
  ) => {
    try {
      const response = await onPageOptimizationsApiClient.get<Blob>(
        `/api/v1/clients/${clientId}/on-page-optimizations/${runId}/report/pdf`,
        {
          headers: authHeaders(accessToken),
          responseType: "blob",
        },
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text) as
            | { error?: { message?: string }; message?: string }
            | undefined;

          throw new Error(
            parsed?.error?.message ?? parsed?.message ?? error.message,
          );
        } catch (parseFailure) {
          if (
            parseFailure instanceof Error &&
            parseFailure.message !== "Unexpected end of JSON input" &&
            !parseFailure.message.startsWith("Unexpected token")
          ) {
            throw parseFailure;
          }
        }
      }

      throw new Error(parseError(error));
    }
  },
  getRun: async (
    accessToken: string,
    clientId: string | number,
    runId: string | number,
  ) => {
    try {
      const response = await onPageOptimizationsApiClient.get<RunResponse>(
        `/api/v1/clients/${clientId}/on-page-optimizations/${runId}`,
        {
          headers: authHeaders(accessToken),
        },
      );

      if (!response.data.run) {
        throw new Error("On-page optimization run was not returned.");
      }

      return response.data.run;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  listPageActivity: async (
    accessToken: string,
    clientId: string | number,
    runId: string | number,
    params: { before?: string | null; limit?: number; pageUrl: string },
  ) => {
    try {
      const response =
        await onPageOptimizationsApiClient.get<PageActivityResponse>(
          `/api/v1/clients/${clientId}/on-page-optimizations/${runId}/pages/activity`,
          {
            headers: authHeaders(accessToken),
            params: {
              before: params.before || undefined,
              limit: params.limit,
              url: params.pageUrl,
            },
          },
        );

      return {
        cursor: response.data.cursor ?? null,
        items: response.data.items ?? [],
      };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  listRuns: async (accessToken: string, clientId: string | number) => {
    try {
      const response = await onPageOptimizationsApiClient.get<RunsResponse>(
        `/api/v1/clients/${clientId}/on-page-optimizations`,
        {
          headers: authHeaders(accessToken),
        },
      );

      return response.data.runs ?? [];
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateSettings: async (
    accessToken: string,
    clientId: string | number,
    payload: { sitemapUrl: string | null },
  ) => {
    try {
      const response =
        await onPageOptimizationsApiClient.patch<SettingsResponse>(
          `/api/v1/clients/${clientId}/on-page-optimizations/settings`,
          payload,
          {
            headers: authHeaders(accessToken),
          },
        );

      return response.data.settings ?? { sitemapUrl: null };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};
