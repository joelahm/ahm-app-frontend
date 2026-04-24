"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Textarea } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { Tab, Tabs } from "@heroui/tabs";
import {
  Download,
  PenLine,
  RefreshCw,
  SlidersHorizontal,
  Star,
  Zap,
} from "lucide-react";

import {
  clientsApi,
  type ClientApiItem,
  type ClientGbpReview,
} from "@/apis/clients";
import { manusApi } from "@/apis/manus";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { useAppToast } from "@/hooks/use-app-toast";

type ReviewStatus = "Replied" | "No Replied";

type GoogleReviewRow = {
  clientId: string;
  clientName: string;
  id: string;
  images: string[];
  likes: number;
  name: string;
  rating: number;
  reply: string | null;
  review: string;
  status: ReviewStatus;
};

const REPLY_MAX_LENGTH = 1500;
const headerCellClass = "bg-[#F9FAFB] text-xs font-medium text-[#111827]";
const imageToneClassNames = [
  "bg-[linear-gradient(135deg,#E5E7EB,#9CA3AF)]",
  "bg-[linear-gradient(135deg,#F3F4F6,#D1D5DB)]",
  "bg-[linear-gradient(135deg,#0F172A,#14532D)]",
];

const getClientLabel = (client: ClientApiItem) =>
  client.clientName?.trim() ||
  client.businessName?.trim() ||
  `Client ${String(client.id)}`;

const mapReviewToRow = (
  review: ClientGbpReview,
  client: ClientApiItem,
  draftReply?: string,
): GoogleReviewRow => {
  const reply = draftReply?.trim() || review.reply;

  return {
    clientId: String(client.id),
    clientName: getClientLabel(client),
    id: review.id,
    images: review.images,
    likes: review.likes,
    name: review.name,
    rating: review.rating,
    reply,
    review: review.review,
    status: reply ? "Replied" : "No Replied",
  };
};

const buildReviewReplyPrompt = (review: GoogleReviewRow) =>
  `
Write a warm, professional Google Business Profile review reply.

Rules:
- Keep it concise and natural.
- Thank the reviewer by name if their name is available.
- Do not mention private medical details.
- Do not make clinical claims or guarantees.
- Keep the reply under ${REPLY_MAX_LENGTH} characters.
- Return only the reply text.

Client: ${review.clientName}
Reviewer name: ${review.name}
Rating: ${review.rating}
Review:
${review.review}
`.trim();

const getColumns = (
  onReplyPress: (review: GoogleReviewRow) => void,
): DashboardDataTableColumn<GoogleReviewRow>[] => [
  {
    className: headerCellClass,
    key: "client",
    label: "Client",
    renderCell: (item) => (
      <span className="text-sm font-medium text-[#111827]">
        {item.clientName}
      </span>
    ),
  },
  {
    className: headerCellClass,
    key: "name",
    label: "Name",
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.name}</span>
    ),
  },
  {
    className: headerCellClass,
    key: "rating",
    label: "Rating",
    renderCell: (item) => (
      <div className="flex items-center gap-2">
        <Star fill="#E87900" size={18} strokeWidth={0} />
        <span className="text-sm text-[#111827]">{item.rating}</span>
      </div>
    ),
  },
  {
    className: headerCellClass,
    key: "images",
    label: "Images",
    renderCell: (item) => (
      <div className="flex min-w-24 items-center">
        {item.images.map((image, index) => (
          <Avatar
            key={`${item.clientId}-${item.id}-${image}-${index}`}
            className={`h-9 w-9 border-2 border-white text-[0px] ${
              imageToneClassNames[index % imageToneClassNames.length]
            } ${index > 0 ? "-ml-3" : ""}`}
            name={image}
            radius="full"
            src={image.startsWith("http") ? image : undefined}
          />
        ))}
      </div>
    ),
  },
  {
    className: headerCellClass,
    key: "review",
    label: "Review",
    renderCell: (item) => (
      <p className="max-w-[520px] whitespace-pre-line text-sm leading-6 text-[#1F2937]">
        {item.review}
      </p>
    ),
  },
  {
    className: headerCellClass,
    key: "likes",
    label: "Likes",
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.likes}</span>
    ),
  },
  {
    className: headerCellClass,
    key: "reply",
    label: "Reply",
    renderCell: (item) =>
      item.reply ? (
        <div className="max-w-[220px] space-y-2">
          <p className="text-sm leading-6 text-[#111827]">{item.reply}</p>
          <Button
            className="h-auto min-w-0 p-0 text-[#022279]"
            radius="sm"
            size="sm"
            startContent={<PenLine size={14} />}
            variant="light"
            onPress={() => onReplyPress(item)}
          >
            Edit
          </Button>
        </div>
      ) : (
        <Button
          className="h-auto min-w-0 p-0 text-[#022279]"
          radius="sm"
          size="sm"
          startContent={<PenLine size={14} />}
          variant="light"
          onPress={() => onReplyPress(item)}
        >
          Reply
        </Button>
      ),
  },
  {
    className: `${headerCellClass} text-right`,
    key: "status",
    label: "Status",
    renderCell: (item) => (
      <div className="flex justify-end">
        <Chip
          className={
            item.status === "Replied"
              ? "bg-[#ECFDF5] text-[#059669]"
              : "bg-[#FFF7ED] text-[#EA580C]"
          }
          radius="full"
          size="sm"
          variant="flat"
        >
          <span className="mr-1 text-[10px]">●</span>
          {item.status}
        </Chip>
      </div>
    ),
  },
];

export const GoogleReviewsScreen = () => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const toastRef = useRef(toast);
  const [clients, setClients] = useState<ClientApiItem[]>([]);
  const [rows, setRows] = useState<GoogleReviewRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [filter, setFilter] = useState<"all" | "replied" | "not-replied">(
    "all",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState<GoogleReviewRow | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const clientFilterOptions = useMemo(
    () => [
      { id: "all", label: "All Clients" },
      ...clients.map((client) => ({
        id: String(client.id),
        label: getClientLabel(client),
      })),
    ],
    [clients],
  );

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const loadData = useCallback(async () => {
    if (!session) {
      setClients([]);
      setRows([]);
      return;
    }

    setIsLoading(true);

    try {
      const accessToken = await getValidAccessToken();
      const loadedClients = await clientsApi.getClients(accessToken);
      const targetClients =
        selectedClientId === "all"
          ? loadedClients
          : loadedClients.filter(
              (client) => String(client.id) === selectedClientId,
            );
      const reviewResults = await Promise.allSettled(
        targetClients.map(async (client) => {
          const response = await clientsApi.getClientGbpReviews(
            accessToken,
            client.id,
          );
          const drafts = response.drafts.reduce<Record<string, string>>(
            (draftMap, draft) => {
              draftMap[draft.reviewId] = draft.replyText;
              return draftMap;
            },
            {},
          );

          return response.reviews.map((review) =>
            mapReviewToRow(review, client, drafts[review.id]),
          );
        }),
      );

      setClients(loadedClients);
      setRows(
        reviewResults.flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        ),
      );
    } catch (error) {
      setRows([]);
      toastRef.current.danger("Failed to load Google reviews.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getValidAccessToken, selectedClientId, session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const closeReplyModal = useCallback(() => {
    setSelectedReview(null);
    setReplyText("");
    setIsGeneratingReply(false);
    setIsSavingDraft(false);
  }, []);

  const handleReplyPress = useCallback((review: GoogleReviewRow) => {
    setSelectedReview(review);
    setReplyText(review.reply ?? "");
  }, []);

  const handleGenerateReply = useCallback(async () => {
    if (!selectedReview || isGeneratingReply) return;

    setIsGeneratingReply(true);

    try {
      const accessToken = await getValidAccessToken();
      const response = await manusApi.generateText(accessToken, {
        clientId: selectedReview.clientId,
        maxCharacters: REPLY_MAX_LENGTH,
        provider: "OPENAI",
        prompt: buildReviewReplyPrompt(selectedReview),
      });
      const generatedReply = response.text.trim();

      if (!generatedReply) {
        throw new Error("No reply was generated. Please try again.");
      }

      setReplyText(generatedReply.slice(0, REPLY_MAX_LENGTH));
      toastRef.current.success("Reply generated.");
    } catch (error) {
      toastRef.current.danger("Failed to generate reply.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsGeneratingReply(false);
    }
  }, [getValidAccessToken, isGeneratingReply, selectedReview]);

  const handleSaveDraft = useCallback(async () => {
    if (!selectedReview) return;

    const trimmedReply = replyText.trim();
    if (!trimmedReply || isSavingDraft) return;

    setIsSavingDraft(true);

    try {
      const accessToken = await getValidAccessToken();
      const draft = await clientsApi.saveClientGbpReviewDraft(
        accessToken,
        selectedReview.clientId,
        selectedReview.id,
        {
          rating: selectedReview.rating,
          replyText: trimmedReply,
          reviewerName: selectedReview.name,
          reviewText: selectedReview.review,
        },
      );

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.clientId === selectedReview.clientId &&
          row.id === selectedReview.id
            ? {
                ...row,
                reply: draft.replyText,
                status: "Replied",
              }
            : row,
        ),
      );
      toastRef.current.success("Reply draft saved.");
      closeReplyModal();
    } catch (error) {
      toastRef.current.danger("Failed to save reply draft.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    closeReplyModal,
    getValidAccessToken,
    isSavingDraft,
    replyText,
    selectedReview,
  ]);

  const filteredRows = useMemo(() => {
    if (filter === "replied") {
      return rows.filter((review) => review.status === "Replied");
    }

    if (filter === "not-replied") {
      return rows.filter((review) => review.status === "No Replied");
    }

    return rows;
  }, [filter, rows]);

  const columns = useMemo(
    () => getColumns(handleReplyPress),
    [handleReplyPress],
  );

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">
          Google Reviews
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Monitor and draft replies for Google reviews across all clients.
        </p>
      </div>

      <DashboardDataTable
        showPagination
        ariaLabel="Google reviews table"
        columns={columns}
        getRowKey={(item) => `${item.clientId}-${item.id}`}
        headerRight={
          <div className="flex w-full flex-wrap items-center justify-end gap-3">
            <Select
              aria-label="Filter by client"
              className="w-64"
              selectedKeys={[selectedClientId]}
              size="sm"
              onSelectionChange={(keys) => {
                const key = keys === "all" ? "all" : keys.currentKey || "all";
                setSelectedClientId(String(key));
              }}
            >
              {clientFilterOptions.map((client) => (
                <SelectItem key={client.id}>{client.label}</SelectItem>
              ))}
            </Select>
            <Tabs
              aria-label="Review filters"
              classNames={{
                base: "rounded-lg bg-[#F3F4F6] p-1",
                cursor: "bg-white shadow-sm",
                tab: "h-8 px-5",
                tabContent:
                  "text-sm text-[#111827] group-data-[selected=true]:font-medium",
                tabList: "gap-1 bg-transparent p-0",
              }}
              selectedKey={filter}
              onSelectionChange={(key) =>
                setFilter(key as "all" | "replied" | "not-replied")
              }
            >
              <Tab key="all" title="All" />
              <Tab key="replied" title="Replied" />
              <Tab key="not-replied" title="Not Replied" />
            </Tabs>
            <Button
              startContent={<SlidersHorizontal size={16} />}
              variant="bordered"
            >
              Filter
            </Button>
            <Button
              isLoading={isLoading}
              startContent={!isLoading ? <RefreshCw size={16} /> : null}
              variant="bordered"
              onPress={() => void loadData()}
            >
              Refresh
            </Button>
            <Button
              className="bg-[#022279] text-white"
              startContent={<Download size={16} />}
            >
              Export
            </Button>
          </div>
        }
        pageSize={10}
        rows={filteredRows}
        title={isLoading ? "All Reviews (Loading...)" : "All Reviews"}
      />

      <Modal
        isOpen={Boolean(selectedReview)}
        placement="center"
        size="xl"
        onOpenChange={(isOpen) => {
          if (!isOpen) closeReplyModal();
        }}
      >
        <ModalContent>
          <ModalHeader className="border-b border-default-200">
            Reply to Review
          </ModalHeader>
          <ModalBody className="space-y-4 py-5">
            {selectedReview ? (
              <div className="rounded-lg bg-[#F9FAFB] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[#111827]">
                    {selectedReview.clientName}
                  </span>
                  <span className="text-sm text-[#6B7280]">-</span>
                  <span className="text-sm font-medium text-[#111827]">
                    {selectedReview.name}
                  </span>
                  <div className="flex items-center gap-1 text-[#E87900]">
                    <Star fill="currentColor" size={14} strokeWidth={0} />
                    <span className="text-sm text-[#111827]">
                      {selectedReview.rating}
                    </span>
                  </div>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#4B5563]">
                  {selectedReview.review}
                </p>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-medium text-[#111827]">
                Reply <span className="text-danger">*</span>
              </p>
              <div className="rounded-md border border-default-200 bg-white p-4">
                <Textarea
                  classNames={{
                    input: "min-h-[112px] resize-none text-sm leading-6",
                    inputWrapper:
                      "bg-transparent p-0 shadow-none data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent",
                  }}
                  maxLength={REPLY_MAX_LENGTH}
                  minRows={5}
                  placeholder="Write or generate a reply..."
                  value={replyText}
                  variant="flat"
                  onValueChange={(value) =>
                    setReplyText(value.slice(0, REPLY_MAX_LENGTH))
                  }
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <Button
                    className="border-[#8B73FF] bg-[#F4F0FF] text-[#111827]"
                    isLoading={isGeneratingReply}
                    radius="full"
                    size="sm"
                    startContent={
                      !isGeneratingReply ? (
                        <Zap className="text-[#6D5DF5]" size={16} />
                      ) : null
                    }
                    variant="bordered"
                    onPress={handleGenerateReply}
                  >
                    Generate reply with AI
                  </Button>
                  <span className="text-xs text-[#667085]">
                    {replyText.length}/{REPLY_MAX_LENGTH}
                  </span>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="border-t border-default-200">
            <Button variant="bordered" onPress={closeReplyModal}>
              Cancel
            </Button>
            <Button
              color="primary"
              isDisabled={!replyText.trim()}
              isLoading={isSavingDraft}
              onPress={handleSaveDraft}
            >
              Save as Draft
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
};
