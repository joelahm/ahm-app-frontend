import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const aiPromptsApiClient = axios.create({
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

export interface CreateAiPromptRequestBody {
  attachments: Array<{
    name: string;
    size: number;
    type: string;
  }>;
  clientId: string;
  customValues: string[];
  maxCharacter: string;
  prompt: string;
  status: "Draft" | "Active";
  typeOfPost: string;
  uniqueId: string;
}

export interface AiPromptListItem {
  attachments: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
  }>;
  clientId: string;
  createdAt: string;
  createdBy: {
    email: string;
    id: number;
    name: string;
  };
  customValues: string[];
  id: string;
  maxCharacter: string;
  name: string;
  prompt: string;
  purpose: string;
  status: "Draft" | "Active";
  typeOfPost: string;
  uniqueId: string;
  updatedAt: string;
}

export const aiPromptsApi = {
  getPrompts: async (accessToken: string) => {
    try {
      const response = await aiPromptsApiClient.get<{
        aiPrompts: AiPromptListItem[];
      }>("/api/v1/ai-prompts", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
  updatePrompt: async (
    accessToken: string,
    promptId: string,
    payload: CreateAiPromptRequestBody,
  ) => {
    try {
      const response = await aiPromptsApiClient.patch(
        `/api/v1/ai-prompts/${promptId}`,
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
  createPrompt: async (
    accessToken: string,
    payload: CreateAiPromptRequestBody,
  ) => {
    try {
      const response = await aiPromptsApiClient.post(
        "/api/v1/ai-prompts",
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
  reserveUniqueId: async (accessToken: string) => {
    try {
      const response = await aiPromptsApiClient.post<{ uniqueId: string }>(
        "/api/v1/ai-prompts/next-id",
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
};
