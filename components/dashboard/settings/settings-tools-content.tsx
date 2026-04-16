"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import {
  CheckCircle2,
  RefreshCw,
  SearchCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { clientsApi } from "@/apis/clients";
import { keywordResearchApi } from "@/apis/keyword-research";
import { manusApi } from "@/apis/manus";
import { useAuth } from "@/components/auth/auth-context";
import { useAppToast } from "@/hooks/use-app-toast";

const sectionCardClass = "border border-default-200 shadow-none";

const serpConnectionSchema = yup.object({
  clientId: yup.string().required("Client ID is required."),
  gl: yup.string().required("Country code is required."),
  hl: yup.string().required("Language code is required."),
  placeId: yup.string().required("Place ID is required."),
});

type SerpConnectionFormValues = yup.InferType<typeof serpConnectionSchema>;

export const SettingsToolsContent = () => {
  const { getValidAccessToken } = useAuth();
  const toast = useAppToast();
  const [isSyncingDataForSeo, setIsSyncingDataForSeo] = useState(false);
  const [isTestingDataForSeo, setIsTestingDataForSeo] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [isTestingSerpApi, setIsTestingSerpApi] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    setError,
  } = useForm<SerpConnectionFormValues>({
    defaultValues: {
      clientId: "",
      gl: "us",
      hl: "en",
      placeId: "",
    },
  });

  const handleSyncDataForSeo = async () => {
    setIsSyncingDataForSeo(true);
    try {
      const accessToken = await getValidAccessToken();

      await keywordResearchApi.syncGoogleAdsReferenceData({
        accessToken,
        forceRefresh: true,
      });
      toast.success("DataForSEO sync completed.");
    } catch (error) {
      toast.danger("Failed to sync DataForSEO.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSyncingDataForSeo(false);
    }
  };

  const handleTestDataForSeoConnection = async () => {
    setIsTestingDataForSeo(true);
    try {
      const accessToken = await getValidAccessToken();
      const [countries, languages] = await Promise.all([
        keywordResearchApi.getCountries(accessToken),
        keywordResearchApi.getLanguages(accessToken),
      ]);

      toast.success("DataForSEO connection is healthy.", {
        description: `${countries.countries.length} countries and ${languages.languages.length} languages loaded.`,
      });
    } catch (error) {
      toast.danger("DataForSEO connection failed.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsTestingDataForSeo(false);
    }
  };

  const handleTestAiConnection = async () => {
    setIsTestingAi(true);
    try {
      const accessToken = await getValidAccessToken();
      const response = await manusApi.generateText(accessToken, {
        maxCharacters: 40,
        prompt: "Reply with exactly: OK",
      });

      toast.success("AI API connection is healthy.", {
        description: `Response: ${response.text || "OK"}`,
      });
    } catch (error) {
      toast.danger("AI API connection failed.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleTestSerpApiConnection = async (
    values: SerpConnectionFormValues,
  ) => {
    try {
      const validated = await serpConnectionSchema.validate(values, {
        abortEarly: false,
        stripUnknown: true,
      });
      const parsedClientId = Number.parseInt(validated.clientId, 10);

      if (!Number.isFinite(parsedClientId) || parsedClientId <= 0) {
        setError("clientId", {
          message: "Client ID must be a valid numeric ID.",
          type: "manual",
        });

        return;
      }

      setIsTestingSerpApi(true);
      const accessToken = await getValidAccessToken();

      await clientsApi.syncGbpDetails(accessToken, {
        clientId: parsedClientId,
        gl: validated.gl.trim().toLowerCase(),
        hl: validated.hl.trim().toLowerCase(),
        placeId: validated.placeId.trim(),
      });

      toast.success("SerpAPI connection is healthy.");
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof SerpConnectionFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      toast.danger("SerpAPI connection failed.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsTestingSerpApi(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className={sectionCardClass}>
        <CardHeader className="border-b border-default-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Tools</h2>
            <p className="text-sm text-default-500">
              Diagnostics and utility actions for external integrations.
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-4 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              className="justify-start"
              color="secondary"
              isLoading={isSyncingDataForSeo}
              startContent={<RefreshCw size={16} />}
              variant="flat"
              onPress={() => {
                void handleSyncDataForSeo();
              }}
            >
              Sync DataForSEO References
            </Button>
            <Button
              className="justify-start"
              color="default"
              isLoading={isTestingDataForSeo}
              startContent={<SearchCheck size={16} />}
              variant="bordered"
              onPress={() => {
                void handleTestDataForSeoConnection();
              }}
            >
              Test DataForSEO Connection
            </Button>
            <Button
              className="justify-start"
              color="default"
              isLoading={isTestingAi}
              startContent={<Sparkles size={16} />}
              variant="bordered"
              onPress={() => {
                void handleTestAiConnection();
              }}
            >
              Test AI API Connection
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className="border-b border-default-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#111827]">
              Test SerpAPI Connection
            </h3>
            <p className="text-sm text-default-500">
              Uses the GBP details sync endpoint with a real client and place
              ID.
            </p>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) => {
              void handleTestSerpApiConnection(values);
            })}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                {...register("clientId")}
                errorMessage={errors.clientId?.message}
                isInvalid={!!errors.clientId}
                label="Client ID"
                labelPlacement="outside"
                placeholder="e.g. 3"
                radius="sm"
              />
              <Input
                {...register("placeId")}
                errorMessage={errors.placeId?.message}
                isInvalid={!!errors.placeId}
                label="Place ID"
                labelPlacement="outside"
                placeholder="ChIJ..."
                radius="sm"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                {...register("gl")}
                errorMessage={errors.gl?.message}
                isInvalid={!!errors.gl}
                label="Country Code (gl)"
                labelPlacement="outside"
                placeholder="us"
                radius="sm"
              />
              <Input
                {...register("hl")}
                errorMessage={errors.hl?.message}
                isInvalid={!!errors.hl}
                label="Language Code (hl)"
                labelPlacement="outside"
                placeholder="en"
                radius="sm"
              />
            </div>
            <div className="flex justify-end">
              <Button
                className="bg-primary text-white"
                isLoading={isTestingSerpApi}
                startContent={<Zap size={16} />}
                type="submit"
              >
                Test SerpAPI Connection
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className={sectionCardClass}>
        <CardBody className="flex flex-row items-center gap-2 p-4 text-sm text-default-600">
          <CheckCircle2 className="text-success" size={16} />
          <p>
            Tools actions use your current admin session token and display
            result details in toast notifications.
          </p>
        </CardBody>
      </Card>
    </div>
  );
};
