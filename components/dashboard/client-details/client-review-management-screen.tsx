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
import { Tab, Tabs } from "@heroui/tabs";
import {
  CalendarDays,
  Download,
  MapPin,
  PenLine,
  RefreshCw,
  SlidersHorizontal,
  Star,
  Zap,
} from "lucide-react";

import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import {
  clientsApi,
  type ClientGbpDetails,
  type ClientGbpReview,
} from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { useAppToast } from "@/hooks/use-app-toast";
import { manusApi } from "@/apis/manus";

type ReviewStatus = "Replied" | "No Replied";

type ReviewRow = {
  id: string;
  images: string[];
  likes: number;
  name: string;
  rating: number;
  reply: string | null;
  review: string;
  status: ReviewStatus;
};

interface ClientReviewManagementScreenProps {
  clientId: string;
}

const weeklyBreakdown = [
  { day: "Sun", value: 78 },
  { day: "Mon", value: 88 },
  { day: "Tue", value: 106 },
  { day: "Wed", value: 74 },
  { day: "Thu", value: 80 },
  { day: "Fri", value: 66 },
  { day: "Sat", value: 62 },
];

const ratingBreakdown = [
  { count: 0, label: "5 stars", value: 0 },
  { count: 0, label: "4 stars", value: 0 },
  { count: 0, label: "3 stars", value: 0 },
  { count: 0, label: "2 stars", value: 0 },
  { count: 0, label: "1 stars", value: 0 },
];

const REPLY_MAX_LENGTH = 1500;

const headerCellClass = "bg-[#F9FAFB] text-xs font-medium text-[#111827]";

const imageToneClassNames = [
  "bg-[linear-gradient(135deg,#E5E7EB,#9CA3AF)]",
  "bg-[linear-gradient(135deg,#F3F4F6,#D1D5DB)]",
  "bg-[linear-gradient(135deg,#0F172A,#14532D)]",
];

const renderStars = (count: number, size = 18) => (
  <div className="flex items-center gap-0.5 text-[#F5AA00]">
    {Array.from({ length: count }, (_, index) => (
      <Star key={`star-${index}`} fill="currentColor" size={size} />
    ))}
  </div>
);

const parseReviewCount = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const match = value.match(/[\d,]+/);
  const count = match ? Number(match[0].replace(/,/g, "")) : null;

  return count !== null && Number.isFinite(count) ? count : null;
};

const mapGbpReviewToRow = (review: ClientGbpReview): ReviewRow => ({
  id: review.id,
  images: review.images,
  likes: review.likes,
  name: review.name,
  rating: review.rating,
  reply: review.reply,
  review: review.review,
  status: review.reply ? "Replied" : "No Replied",
});

const applyDraftRepliesToRows = (
  rows: ReviewRow[],
  drafts: Record<string, string>,
): ReviewRow[] =>
  rows.map((row) => {
    const draftReply = drafts[row.id]?.trim();

    if (!draftReply) {
      return row;
    }

    return {
      ...row,
      reply: draftReply,
      status: "Replied",
    };
  });

const buildReviewReplyPrompt = (review: ReviewRow) =>
  `
Write a warm, professional Google Business Profile review reply.

Rules:
- Keep it concise and natural.
- Thank the reviewer by name if their name is available.
- Do not mention private medical details.
- Do not make clinical claims or guarantees.
- Keep the reply under ${REPLY_MAX_LENGTH} characters.
- Return only the reply text.

Reviewer name: ${review.name}
Rating: ${review.rating}
Review:
${review.review}
`.trim();

const getRatingNumber = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const rating = Number(value);

  return Number.isFinite(rating) ? rating : null;
};

const getColumns = (
  onReplyPress: (review: ReviewRow) => void,
): DashboardDataTableColumn<ReviewRow>[] => [
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
            key={`${item.id}-${image}-${index}`}
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

export const ClientReviewManagementScreen = ({
  clientId,
}: ClientReviewManagementScreenProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const toastRef = useRef(toast);
  const [gbpDetails, setGbpDetails] = useState<ClientGbpDetails | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewRow | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftReplies, setDraftReplies] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "replied" | "not-replied">(
    "all",
  );

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const closeReplyModal = useCallback(() => {
    setSelectedReview(null);
    setReplyText("");
    setIsGeneratingReply(false);
    setIsSavingDraft(false);
  }, []);

  const handleReplyPress = useCallback(
    (review: ReviewRow) => {
      setSelectedReview(review);
      setReplyText(draftReplies[review.id] ?? review.reply ?? "");
    },
    [draftReplies],
  );

  const handleGenerateReply = useCallback(async () => {
    if (!selectedReview || isGeneratingReply) {
      return;
    }

    setIsGeneratingReply(true);

    try {
      const accessToken = await getValidAccessToken();
      const response = await manusApi.generateText(accessToken, {
        clientId,
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
  }, [clientId, getValidAccessToken, isGeneratingReply, selectedReview]);

  const handleSaveDraft = useCallback(async () => {
    if (!selectedReview) {
      return;
    }

    const trimmedReply = replyText.trim();
    if (!trimmedReply || isSavingDraft) {
      return;
    }

    setIsSavingDraft(true);

    try {
      const accessToken = await getValidAccessToken();
      const draft = await clientsApi.saveClientGbpReviewDraft(
        accessToken,
        clientId,
        selectedReview.id,
        {
          rating: selectedReview.rating,
          replyText: trimmedReply,
          reviewerName: selectedReview.name,
          reviewText: selectedReview.review,
        },
      );

      setDraftReplies((current) => ({
        ...current,
        [selectedReview.id]: draft.replyText,
      }));
      setReviews((currentRows) =>
        currentRows.map((row) =>
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
    clientId,
    closeReplyModal,
    getValidAccessToken,
    isSavingDraft,
    replyText,
    selectedReview,
  ]);

  const loadReviewData = useCallback(
    async (isMounted: () => boolean) => {
      if (!session || !clientId) {
        setGbpDetails(null);
        setReviews([]);

        return;
      }

      setIsRefreshing(true);

      try {
        const accessToken = await getValidAccessToken();
        const [detailsResult, reviewsResult] = await Promise.allSettled([
          clientsApi.getClientGbpDetails(accessToken, clientId),
          clientsApi.getClientGbpReviews(accessToken, clientId),
        ]);

        if (!isMounted()) {
          return;
        }

        if (detailsResult.status === "fulfilled") {
          setGbpDetails(detailsResult.value);
        } else {
          setGbpDetails(null);
          toastRef.current.danger("Unable to load GBP review details.", {
            description:
              detailsResult.reason instanceof Error
                ? detailsResult.reason.message
                : "No saved GBP profile was found for this client.",
          });
        }

        if (reviewsResult.status === "fulfilled") {
          const nextDraftReplies = reviewsResult.value.drafts.reduce<
            Record<string, string>
          >((drafts, draft) => {
            drafts[draft.reviewId] = draft.replyText;

            return drafts;
          }, {});
          setReviews(
            applyDraftRepliesToRows(
              reviewsResult.value.reviews.map(mapGbpReviewToRow),
              nextDraftReplies,
            ),
          );
          setDraftReplies(nextDraftReplies);
        } else {
          setReviews([]);
          setDraftReplies({});
          toastRef.current.danger("Unable to load Google reviews.", {
            description:
              reviewsResult.reason instanceof Error
                ? reviewsResult.reason.message
                : "The reviews request failed.",
          });
        }
      } finally {
        if (isMounted()) {
          setIsRefreshing(false);
        }
      }
    },
    [clientId, getValidAccessToken, session],
  );

  useEffect(() => {
    let isMounted = true;

    void loadReviewData(() => isMounted);

    return () => {
      isMounted = false;
    };
  }, [loadReviewData]);

  const filteredRows = useMemo(() => {
    if (filter === "replied") {
      return reviews.filter((review) => review.status === "Replied");
    }

    if (filter === "not-replied") {
      return reviews.filter((review) => review.status === "No Replied");
    }

    return reviews;
  }, [filter, reviews]);
  const columns = useMemo(
    () => getColumns(handleReplyPress),
    [handleReplyPress],
  );
  const maxWeeklyValue = Math.max(...weeklyBreakdown.map((item) => item.value));
  const rating = getRatingNumber(gbpDetails?.rating);
  const summaryTotal =
    gbpDetails?.ratingSummary.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const reviewCount =
    summaryTotal > 0 ? summaryTotal : parseReviewCount(gbpDetails?.reviewCount);
  const reviewRatingBreakdown = useMemo(
    () =>
      ratingBreakdown.map((item) => {
        const stars = Number(item.label.match(/[1-5]/)?.[0] ?? 0);
        const summaryItem = gbpDetails?.ratingSummary.find(
          (ratingItem) => ratingItem.stars === stars,
        );
        const count =
          summaryTotal === 0 && stars === 5
            ? (reviewCount ?? 0)
            : (summaryItem?.amount ?? 0);

        return {
          ...item,
          count,
          value: count,
        };
      }),
    [gbpDetails?.ratingSummary, reviewCount, summaryTotal],
  );
  const maxRatingCount = Math.max(
    1,
    ...reviewRatingBreakdown.map((item) => item.value),
  );
  const roundedRating = rating !== null ? Math.round(rating) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-default-200 bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">
              {gbpDetails?.businessName || "GBP Profile"}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-[#98A2B3]">
              <MapPin size={16} />
              <span>{gbpDetails?.businessLocation || "No location saved"}</span>
            </div>
          </div>

          <div className="mt-12 grid gap-7 md:grid-cols-[120px_minmax(0,1fr)]">
            <div>
              <p className="mb-6 text-xs text-[#98A2B3]">Total Reviews</p>
              <p className="text-5xl font-semibold leading-none text-[#111827]">
                {rating !== null ? rating.toFixed(1) : "-"}
              </p>
              <p className="mt-4 text-sm text-[#98A2B3]">Average Star Rating</p>
              <div className="mt-3">
                {roundedRating > 0 ? renderStars(roundedRating, 18) : null}
              </div>
            </div>

            <div>
              <p className="mb-7 text-xs text-[#98A2B3]">
                Review Count by Star Rating
              </p>
              <div className="space-y-2">
                {reviewRatingBreakdown.map((item) => (
                  <div
                    key={item.label}
                    className="grid items-center gap-4 text-sm text-[#98A2B3] sm:grid-cols-[70px_minmax(0,1fr)_24px_24px]"
                  >
                    <span>{item.label}</span>
                    <div className="h-4 overflow-hidden rounded-full bg-[#EEF2FF]">
                      <div
                        className="h-full rounded-full bg-[#F5B400]"
                        style={{
                          width: `${Math.max(
                            item.value > 0 ? 4 : 0,
                            (item.value / maxRatingCount) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-right">{item.count}</span>
                    <span className="text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-default-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#111827]">
              Breakdown
            </h2>
            <Button
              className="border-default-300 text-[#111827]"
              endContent={<CalendarDays size={16} />}
              radius="md"
              size="sm"
              variant="bordered"
            >
              This Week
            </Button>
          </div>

          <div className="mt-7 flex h-[232px] items-end justify-between gap-4">
            {weeklyBreakdown.map((item) => (
              <div
                key={item.day}
                className="flex h-full flex-1 flex-col justify-end gap-3"
              >
                <div
                  className="w-full bg-[#7BBE47]"
                  style={{
                    height: `${(item.value / maxWeeklyValue) * 100}%`,
                  }}
                />
                <span className="text-center text-xs text-[#4B5563]">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <DashboardDataTable
        showPagination
        ariaLabel="Client reviews"
        columns={columns}
        getRowKey={(item) => item.id}
        headerRight={
          <div className="flex w-full flex-wrap items-center justify-end gap-3">
            <Tabs
              aria-label="Review filters"
              classNames={{
                base: "rounded-lg bg-[#F3F4F6] p-1",
                cursor: "bg-white shadow-sm",
                tab: "h-8 px-5",
                tabList: "gap-1 bg-transparent p-0",
                tabContent:
                  "text-sm text-[#111827] group-data-[selected=true]:font-medium",
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
              isLoading={isRefreshing}
              startContent={!isRefreshing ? <RefreshCw size={16} /> : null}
              variant="bordered"
              onPress={() => void loadReviewData(() => true)}
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
        title="All Reviews"
      />

      <Modal
        isOpen={Boolean(selectedReview)}
        placement="center"
        size="xl"
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeReplyModal();
          }
        }}
      >
        <ModalContent>
          <ModalHeader className="border-b border-default-200">
            Reply to Review
          </ModalHeader>
          <ModalBody className="space-y-4 py-5">
            {selectedReview ? (
              <div className="rounded-lg bg-[#F9FAFB] p-3">
                <div className="flex items-center gap-2">
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
              className="bg-[#022279] text-white"
              isDisabled={!replyText.trim()}
              isLoading={isSavingDraft}
              onPress={() => void handleSaveDraft()}
            >
              Save as Draft
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
