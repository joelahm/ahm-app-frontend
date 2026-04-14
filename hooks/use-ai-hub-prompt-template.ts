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

        const candidateClientIds = Array.from(
          new Set(
            [clientId, clientDetailsResponse.id]
              .filter((value) => value !== null && value !== undefined)
              .map((value) => String(value)),
          ),
        );

        const matchingPrompt =
          promptsResponse.aiPrompts.find(
            (item) =>
              candidateClientIds.includes(String(item.clientId)) &&
              item.typeOfPost === typeOfPost &&
              item.status === "Active",
          ) ??
          promptsResponse.aiPrompts.find(
            (item) =>
              candidateClientIds.includes(String(item.clientId)) &&
              item.typeOfPost === typeOfPost,
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
