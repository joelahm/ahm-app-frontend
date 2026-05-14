import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const gbpPostingReviewsApiClient = axios.create({
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

export interface GbpPostingReviewLink {
  createdAt: string;
  disabledAt: string | null;
  enabled: boolean;
  expiresAt: string;
  id: string;
  publicPath: string | null;
}

export interface GbpPostingReviewActivity {
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

export interface GbpPostingReviewComment {
  authorEmail: string | null;
  authorName: string;
  comment: string;
  createdAt: string;
  id: string;
  source: string;
}

export interface GbpPostingReviewVersion {
  createdAt: string;
  createdByEmail: string | null;
  createdByName: string | null;
  createdByType: string;
  id: string;
  snapshot: Record<string, unknown>;
  source: string;
}

export interface GbpPostingReviewDashboardState {
  activities: GbpPostingReviewActivity[];
  comments: GbpPostingReviewComment[];
  link: GbpPostingReviewLink | null;
  posting?: PublicGbpPosting;
  versions: GbpPostingReviewVersion[];
}

export interface PublicGbpPosting {
  audience: string | null;
  buttonType: string | null;
  contentType: string | null;
  description: string | null;
  images: string[];
  keyword: string | null;
  liveLink: string | null;
  postContent: string | null;
  status: string | null;
}

export interface PublicGbpPostingContentResponse {
  posting: PublicGbpPosting;
  clientName: string;
  comments: GbpPostingReviewComment[];
  history: GbpPostingReviewActivity[];
  reviewer: {
    email: string;
    fullName: string;
  };
}

export const gbpPostingReviewsApi = {
  addPublicComment: async (
    token: string,
    reviewSessionToken: string,
    comment: string,
  ) => {
    try {
      const response = await gbpPostingReviewsApiClient.post(
        `/api/v1/gbp-posting-reviews/public/${token}/comments`,
        { comment },
        {
          headers: {
            "x-review-session-token": reviewSessionToken,
          },
        },
      );

      return response.data as { comment: GbpPostingReviewComment };
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
      const response = await gbpPostingReviewsApiClient.delete(
        `/api/v1/gbp-posting-reviews/public/${token}/comments/${commentId}`,
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
  disableLink: async (accessToken: string, params: { postingId: string }) => {
    try {
      const response = await gbpPostingReviewsApiClient.delete(
        "/api/v1/gbp-posting-reviews/links",
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
  enableLink: async (accessToken: string, payload: { postingId: string }) => {
    try {
      const response = await gbpPostingReviewsApiClient.post(
        "/api/v1/gbp-posting-reviews/links",
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data as { link: GbpPostingReviewLink };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getDashboardState: async (
    accessToken: string,
    params: { postingId: string },
  ) => {
    try {
      const response = await gbpPostingReviewsApiClient.get(
        "/api/v1/gbp-posting-reviews/dashboard-state",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params,
        },
      );

      return response.data as GbpPostingReviewDashboardState;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getPublicContent: async (token: string, reviewSessionToken: string) => {
    try {
      const response = await gbpPostingReviewsApiClient.get(
        `/api/v1/gbp-posting-reviews/public/${token}/content`,
        {
          headers: {
            "x-review-session-token": reviewSessionToken,
          },
        },
      );

      return response.data as PublicGbpPostingContentResponse;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  getPublicStatus: async (token: string) => {
    try {
      const response = await gbpPostingReviewsApiClient.get(
        `/api/v1/gbp-posting-reviews/public/${token}/status`,
      );

      return response.data as {
        postingTitle: string;
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
    payload: { postContent?: string; images?: string[]; buttonType?: string },
  ) => {
    try {
      const response = await gbpPostingReviewsApiClient.patch(
        `/api/v1/gbp-posting-reviews/public/${token}/content`,
        payload,
        {
          headers: {
            "x-review-session-token": reviewSessionToken,
          },
        },
      );

      return response.data as {
        posting: PublicGbpPosting;
        success: boolean;
      };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  sendLinkToClientReview: async (
    accessToken: string,
    payload: { postingId: string; publicUrl: string },
  ) => {
    try {
      const response = await gbpPostingReviewsApiClient.post(
        "/api/v1/gbp-posting-reviews/links/send-to-client",
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
  sendOtp: async (
    token: string,
    payload: { email: string; fullName: string },
  ) => {
    try {
      const response = await gbpPostingReviewsApiClient.post(
        `/api/v1/gbp-posting-reviews/public/${token}/otp`,
        payload,
      );

      return response.data as { success: boolean };
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  verifyOtp: async (token: string, payload: { email: string; otp: string }) => {
    try {
      const response = await gbpPostingReviewsApiClient.post(
        `/api/v1/gbp-posting-reviews/public/${token}/verify`,
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
