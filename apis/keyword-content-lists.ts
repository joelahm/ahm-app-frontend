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
    const responseData = error.response?.data as
      | { error?: { message?: string }; message?: string }
      | undefined;
    const message =
      responseData?.error?.message ?? responseData?.message ?? error.message;

    return message || "Something went wrong.";
  }

  return "Something went wrong.";
};

export interface SaveKeywordContentListKeyword {
  altDescription?: string | null;
  altTitle?: string | null;
  contentLength?: string;
  contentType: string;
  cpc: number | null;
  generatedContent?: string | null;
  id: string;
  intent: string | null;
  isPillarArticle?: boolean | null;
  kd: number | null;
  keyword: string;
  metaDescription?: string | null;
  metaTitle?: string | null;
  parentKeywordId?: string | null;
  searchVolume: number | null;
  status?: string;
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

export interface ContentBreakdownItem {
  allocated: number;
  key: string;
  label: string;
  used: number;
}

export interface ClientContentBreakdownResponse {
  clientId: string;
  items: ContentBreakdownItem[];
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
  deleteKeywordContentListKeyword: async (
    accessToken: string,
    params: { keywordId: string; listId: string },
  ) => {
    try {
      const response = await keywordContentListsApiClient.delete(
        "/api/v1/keyword-content-lists/keywords",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params,
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updateKeywordContentListKeyword: async (
    accessToken: string,
    payload: {
      altDescription?: string | null;
      altTitle?: string | null;
      contentLength?: string;
      contentType?: string;
      generatedContent?: string | null;
      keywordId: string;
      listId: string;
      isPillarArticle?: boolean;
      metaDescription?: string | null;
      metaTitle?: string | null;
      parentKeywordId?: string | null;
      status?: string;
      title?: string;
    },
  ) => {
    try {
      const response = await keywordContentListsApiClient.patch(
        "/api/v1/keyword-content-lists/keywords",
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
  getClientContentBreakdown: async (
    accessToken: string,
    clientId: string,
  ): Promise<ClientContentBreakdownResponse> => {
    try {
      const response = await keywordContentListsApiClient.get(
        "/api/v1/keyword-content-lists/breakdown",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            clientId,
          },
        },
      );

      const payload = response.data as
        | {
            clientId?: string;
            items?: ContentBreakdownItem[];
          }
        | undefined;

      return {
        clientId: payload?.clientId
          ? String(payload.clientId)
          : String(clientId),
        items: Array.isArray(payload?.items) ? payload.items : [],
      };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  saveClientContentBreakdown: async (
    accessToken: string,
    payload: { clientId: string; items: ContentBreakdownItem[] },
  ): Promise<ClientContentBreakdownResponse> => {
    try {
      const response = await keywordContentListsApiClient.put(
        "/api/v1/keyword-content-lists/breakdown",
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = response.data as
        | {
            clientId?: string;
            items?: ContentBreakdownItem[];
          }
        | undefined;

      return {
        clientId: data?.clientId ? String(data.clientId) : payload.clientId,
        items: Array.isArray(data?.items) ? data.items : payload.items,
      };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};
