import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const websiteContentReviewsApiClient = axios.create({
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

export interface WebsiteContentReviewLink {
  createdAt: string;
  disabledAt: string | null;
  enabled: boolean;
  expiresAt: string;
  id: string;
  publicPath: string | null;
}

export interface WebsiteContentReviewActivity {
  action: string;
  actorEmail: string | null;
  actorName: string | null;
  actorType: string;
  createdAt: string;
  fieldName: string | null;
  id: string;
  metadata: Record<string, unknown> | null;
  newValue: string | null;
  oldValue: string | null;
}

export interface WebsiteContentReviewComment {
  authorEmail: string | null;
  authorName: string;
  comment: string;
  createdAt: string;
  id: string;
  source: string;
}

export interface WebsiteContentReviewVersion {
  createdAt: string;
  createdByEmail: string | null;
  createdByName: string | null;
  createdByType: string;
  id: string;
  snapshot: Record<string, unknown>;
  source: string;
}

export interface WebsiteContentReviewDashboardState {
  activities: WebsiteContentReviewActivity[];
  comments: WebsiteContentReviewComment[];
  link: WebsiteContentReviewLink | null;
  versions: WebsiteContentReviewVersion[];
}

export interface PublicWebsiteContentArticle {
  altDescription: string | null;
  altTitle: string | null;
  contentType: string | null;
  featuredImage: unknown;
  generatedContent: string | null;
  keyword: string | null;
  metaDescription: string | null;
  metaTitle: string | null;
  title: string | null;
  urlSlug: string | null;
}

export interface PublicWebsiteContentResponse {
  article: PublicWebsiteContentArticle;
  clientName: string;
  comments: WebsiteContentReviewComment[];
  history: WebsiteContentReviewActivity[];
  reviewer: {
    email: string;
    fullName: string;
  };
}

export interface UploadedPublicWebsiteContentFeaturedImage {
  mimeType?: string;
  name: string;
  previewUrl: string;
  size?: number;
  sizeLabel: string;
  url: string;
}

export const websiteContentReviewsApi = {
  addPublicComment: async (
    token: string,
    reviewSessionToken: string,
    comment: string,
  ) => {
    try {
      const response = await websiteContentReviewsApiClient.post(
        `/api/v1/website-content-reviews/public/${token}/comments`,
        { comment },
        {
          headers: {
            "x-review-session-token": reviewSessionToken,
          },
        },
      );

      return response.data as { comment: WebsiteContentReviewComment };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  createManualBackup: async (
    accessToken: string,
    payload: { keywordId: string; listId: string },
  ) => {
    try {
      const response = await websiteContentReviewsApiClient.post(
        "/api/v1/website-content-reviews/backups",
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data as { success: boolean };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  deletePublicComment: async (
    token: string,
    reviewSessionToken: string,
    commentId: string,
  ) => {
    try {
      const response = await websiteContentReviewsApiClient.delete(
        `/api/v1/website-content-reviews/public/${token}/comments/${commentId}`,
        {
          headers: {
            "x-review-session-token": reviewSessionToken,
          },
        },
      );

      return response.data as { success: boolean };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  disableLink: async (
    accessToken: string,
    params: { keywordId: string; listId: string },
  ) => {
    try {
      const response = await websiteContentReviewsApiClient.delete(
        "/api/v1/website-content-reviews/links",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params,
        },
      );

      return response.data as { success: boolean };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  enableLink: async (
    accessToken: string,
    payload: { keywordId: string; listId: string },
  ) => {
    try {
      const response = await websiteContentReviewsApiClient.post(
        "/api/v1/website-content-reviews/links",
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data as { link: WebsiteContentReviewLink };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getDashboardState: async (
    accessToken: string,
    params: { keywordId: string; listId: string },
  ) => {
    try {
      const response = await websiteContentReviewsApiClient.get(
        "/api/v1/website-content-reviews/dashboard-state",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params,
        },
      );

      return response.data as WebsiteContentReviewDashboardState;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getPublicContent: async (token: string, reviewSessionToken: string) => {
    try {
      const response = await websiteContentReviewsApiClient.get(
        `/api/v1/website-content-reviews/public/${token}/content`,
        {
          headers: {
            "x-review-session-token": reviewSessionToken,
          },
        },
      );

      return response.data as PublicWebsiteContentResponse;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getPublicStatus: async (token: string) => {
    try {
      const response = await websiteContentReviewsApiClient.get(
        `/api/v1/website-content-reviews/public/${token}/status`,
      );

      return response.data as {
        articleTitle: string;
        clientName: string;
        expiresAt: string;
        requiresOtp: boolean;
      };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  savePublicContent: async (
    token: string,
    reviewSessionToken: string,
    payload: Partial<PublicWebsiteContentArticle>,
  ) => {
    try {
      const response = await websiteContentReviewsApiClient.patch(
        `/api/v1/website-content-reviews/public/${token}/content`,
        payload,
        {
          headers: {
            "x-review-session-token": reviewSessionToken,
          },
        },
      );

      return response.data as {
        article: PublicWebsiteContentArticle;
        success: boolean;
      };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  uploadPublicFeaturedImage: async (
    token: string,
    reviewSessionToken: string,
    payload: FormData,
  ): Promise<UploadedPublicWebsiteContentFeaturedImage> => {
    try {
      const response = await websiteContentReviewsApiClient.post(
        `/api/v1/website-content-reviews/public/${token}/featured-image`,
        payload,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "x-review-session-token": reviewSessionToken,
          },
        },
      );

      const responseData = response.data as
        | { featuredImage?: UploadedPublicWebsiteContentFeaturedImage }
        | undefined;

      if (!responseData?.featuredImage?.url) {
        throw new Error("Featured image upload response was incomplete.");
      }

      return responseData.featuredImage;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  sendLinkToClientReview: async (
    accessToken: string,
    payload: { keywordId: string; listId: string; publicUrl: string },
  ) => {
    try {
      const response = await websiteContentReviewsApiClient.post(
        "/api/v1/website-content-reviews/links/send-to-client",
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data as { sent: boolean };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  sendLinksToClientReview: async (
    accessToken: string,
    payload: {
      items: Array<{ keywordId: string; listId: string; publicUrl: string }>;
    },
  ) => {
    try {
      const response = await websiteContentReviewsApiClient.post(
        "/api/v1/website-content-reviews/links/send-to-client/bulk",
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data as { count: number; sent: boolean };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  sendOtp: async (
    token: string,
    payload: { email: string; fullName: string },
  ) => {
    try {
      const response = await websiteContentReviewsApiClient.post(
        `/api/v1/website-content-reviews/public/${token}/otp`,
        payload,
      );

      return response.data as { success: boolean };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  verifyOtp: async (token: string, payload: { email: string; otp: string }) => {
    try {
      const response = await websiteContentReviewsApiClient.post(
        `/api/v1/website-content-reviews/public/${token}/verify`,
        payload,
      );

      return response.data as {
        reviewSessionToken: string;
        reviewer: { email: string; fullName: string };
        sessionExpiresAt: string;
      };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};
