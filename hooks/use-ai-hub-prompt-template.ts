"use client";

import { useEffect, useState } from "react";

import { aiPromptsApi } from "@/apis/ai-prompts";
import { clientsApi, type ClientDetails } from "@/apis/clients";

interface UseAiHubPromptTemplateParams {
  accessToken?: string;
  clientId?: string;
  isEnabled: boolean;
  typeOfPost: string;
}

interface UseAiHubPromptTemplateResult {
  clientDetails: ClientDetails | null;
  isLoading: boolean;
  promptTemplate: string;
}

const normalizePromptType = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

export const useAiHubPromptTemplate = ({
  accessToken,
  clientId,
  isEnabled,
  typeOfPost,
}: UseAiHubPromptTemplateParams): UseAiHubPromptTemplateResult => {
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState("");

  useEffect(() => {
    if (!isEnabled || !accessToken || !clientId) {
      setClientDetails(null);
      setPromptTemplate("");
      setIsLoading(false);

      return;
    }

    let isMounted = true;

    const loadTemplateContext = async () => {
      try {
        setIsLoading(true);

        const [promptsResponse, clientDetailsResponse] = await Promise.all([
          aiPromptsApi.getPrompts(accessToken),
          clientsApi.getClientById(accessToken, clientId),
        ]);

        if (!isMounted) {
          return;
        }

        const requestedPromptType = normalizePromptType(typeOfPost);
        const promptMatchesType = (itemType: string) =>
          normalizePromptType(itemType) === requestedPromptType;

        const matchingPrompt =
          promptsResponse.aiPrompts.find(
            (item) =>
              promptMatchesType(item.typeOfPost) && item.status === "Active",
          ) ??
          promptsResponse.aiPrompts.find((item) =>
            promptMatchesType(item.typeOfPost),
          ) ??
          null;

        setPromptTemplate(matchingPrompt?.prompt?.trim() ?? "");
        setClientDetails(clientDetailsResponse);
      } catch {
        if (!isMounted) {
          return;
        }

        setPromptTemplate("");
        setClientDetails(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTemplateContext();

    return () => {
      isMounted = false;
    };
  }, [accessToken, clientId, isEnabled, typeOfPost]);

  return {
    clientDetails,
    isLoading,
    promptTemplate,
  };
};
