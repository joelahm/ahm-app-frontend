import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const manusApiClient = axios.create({
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

interface GenerateTextPayload {
  clientId?: string;
  maxCharacters?: number;
  model?: string;
  provider?: "ANTHROPIC" | "MANUS" | "OPENAI";
  prompt: string;
}

interface GenerateTextResponse {
  taskId: string | null;
  text: string;
}

export const manusApi = {
  generateText: async (accessToken: string, payload: GenerateTextPayload) => {
    try {
      const response = await manusApiClient.post<GenerateTextResponse>(
        "/api/v1/integrations/manus/generate-text",
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(parseError(error));
    }
  },
};
