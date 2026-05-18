"use client";

import type { ClientKeyword } from "@/apis/clients";

import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import { Check } from "lucide-react";

import {
  keywordResearchApi,
  type KeywordResearchProvider,
} from "@/apis/keyword-research";
import { useAuth } from "@/components/auth/auth-context";
import { useAppToast } from "@/hooks/use-app-toast";

interface AddClientKeywordModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (keyword: ClientKeyword) => Promise<void> | void;
}

const PROVIDERS: ReadonlyArray<{
  key: KeywordResearchProvider;
  label: string;
  short: string;
  chip: string;
}> = [
  {
    key: "SE_RANKING",
    label: "SE Ranking",
    short: "SER",
    chip: "bg-[#EDE9FE] text-[#6D28D9]",
  },
  {
    key: "DATAFORSEO",
    label: "DataForSEO",
    short: "DFS",
    chip: "bg-[#DBEAFE] text-[#1D4ED8]",
  },
];

export const AddClientKeywordModal = ({
  isOpen,
  onOpenChange,
  onAdded,
}: AddClientKeywordModalProps) => {
  const toast = useAppToast();
  const { getValidAccessToken, session } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [selectedProvider, setSelectedProvider] =
    useState<KeywordResearchProvider>("SE_RANKING");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setKeyword("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const trimmed = keyword.trim();

    if (!trimmed) {
      toast.warning("Enter a keyword.");

      return;
    }

    if (!session?.accessToken) {
      toast.danger("Your session has expired.", {
        description: "Please sign in again.",
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const accessToken = await getValidAccessToken();
      const response = await keywordResearchApi.getKeywordOverview(
        accessToken,
        {
          keywords: [trimmed],
          languageCode: "en",
          languageName: "English",
          countryIsoCode: "GB",
          locationCode: 2826,
          providers: [selectedProvider],
        },
      );

      const fetched = response.keywords[0];
      const enriched: ClientKeyword = {
        contentType: "",
        cpcUsd: fetched?.cpc ?? null,
        generatedTitle: "",
        id: `keyword-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        keyword: fetched?.keyword || trimmed,
        keywordDifficulty: fetched?.kd ?? null,
        note: "",
        provider: selectedProvider,
        searchIntent: fetched?.intent ?? "",
        searchVolume: fetched?.searchVolume ?? null,
        serp: fetched?.serp ?? "",
        status: "",
        titleError: "",
        titleStatus: "IDLE",
        useIn: [],
      };

      await onAdded(enriched);
      toast.success(`Added "${enriched.keyword}".`);
      onOpenChange(false);
    } catch (error) {
      toast.danger("Failed to add keyword.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="md"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader>Add keyword</ModalHeader>
        <ModalBody className="gap-4">
          <Input
            label="Keyword"
            placeholder="e.g. dental implants london"
            radius="sm"
            value={keyword}
            onValueChange={setKeyword}
          />
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Data source
            </div>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((provider) => {
                const isActive = selectedProvider === provider.key;

                return (
                  <button
                    key={provider.key}
                    aria-pressed={isActive}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      isActive
                        ? `${provider.chip} border-transparent`
                        : "border-default-200 bg-white text-[#6B7280] hover:border-default-300"
                    }`}
                    type="button"
                    onClick={() => setSelectedProvider(provider.key)}
                  >
                    {isActive ? <Check size={12} /> : null}
                    <span>{provider.label}</span>
                    <span className="opacity-60">({provider.short})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            isDisabled={isSubmitting}
            variant="light"
            onPress={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#022279] text-white"
            isLoading={isSubmitting}
            onPress={handleSubmit}
          >
            Add keyword
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
