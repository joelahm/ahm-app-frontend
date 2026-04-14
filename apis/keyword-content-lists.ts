import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const keywordContentListsApiClient = axios.create({
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

export interface SaveKeywordContentListKeyword {
  contentType: string;
  cpc: number | null;
  id: string;
  intent: string | null;
  kd: number | null;
  keyword: string;
  searchVolume: number | null;
  title: string;
}

export interface SaveKeywordContentListPayload {
  audience: string;
  clientId: string;
  enableContentClustering: boolean;
  keywords: SaveKeywordContentListKeyword[];
  location: string;
  topic: string;
}

export interface KeywordContentListRecord {
  audience: string | null;
  clientId: string;
  createdAt: string;
  enableContentClustering: boolean;
  id: string;
  keywords: SaveKeywordContentListKeyword[];
  location: string;
  topic: string | null;
  updatedAt: string;
}

export interface KeywordContentListsResponse {
  keywordContentLists: KeywordContentListRecord[];
  total: number;
}

export const keywordContentListsApi = {
  listKeywordContentLists: async (
    accessToken: string,
    params?: { clientId?: string },
  ): Promise<KeywordContentListsResponse> => {
    try {
      const response = await keywordContentListsApiClient.get(
        "/api/v1/keyword-content-lists",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params,
        },
      );

      const payload = response.data as
        | {
            keywordContentLists?: KeywordContentListRecord[];
            total?: number;
          }
        | undefined;

      return {
        keywordContentLists: Array.isArray(payload?.keywordContentLists)
          ? payload.keywordContentLists
          : [],
        total: Number(payload?.total ?? 0),
      };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  createKeywordContentList: async (
    accessToken: string,
    payload: SaveKeywordContentListPayload,
  ) => {
    try {
      const response = await keywordContentListsApiClient.post(
        "/api/v1/keyword-content-lists",
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
};
