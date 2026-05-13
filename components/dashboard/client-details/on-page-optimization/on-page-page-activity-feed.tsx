"use client";

import type {
  OnPageActivityCommentItem,
  OnPageActivityEventItem,
  OnPageActivityItem,
} from "@/apis/on-page-optimizations";
import type { JSONContent } from "@/components/dashboard/client-details/task-panel/editor/rich-text-editor";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Trash2 } from "lucide-react";

import { onPageOptimizationsApi } from "@/apis/on-page-optimizations";
import { clientsApi } from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { ActivityComposer } from "@/components/dashboard/client-details/task-panel/task-activity/activity-composer";
import { getRelativeTime } from "@/components/dashboard/client-details/task-panel/task-activity/activity-utils";
import { RichTextEditor } from "@/components/dashboard/client-details/task-panel/editor/rich-text-editor";
import { resolveServerAssetUrl } from "@/components/dashboard/client-details/task-panel/task-panel-utils";
import { useAppToast } from "@/hooks/use-app-toast";

type ActivityFilter = "all" | "comments" | "updates";

interface OnPagePageActivityFeedProps {
  clientId: string | number;
  pageUrl: string;
  runId: string | number;
}

const FILTERS: Array<{ key: ActivityFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "comments", label: "Comments" },
  { key: "updates", label: "Updates" },
];

const getMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) => {
  const value = metadata?.[key];

  return typeof value === "string" ? value : "";
};

const buildEventVerb = (item: OnPageActivityEventItem) => {
  switch (item.type) {
    case "PAGE_STATUS_CHANGED":
      return `changed status from ${getMetadataString(item.metadata, "from") || "-"} to ${getMetadataString(item.metadata, "to") || "-"}`;
    default:
      return "updated the page";
  }
};

const OnPageActivityEventRow = ({
  item,
}: {
  item: OnPageActivityEventItem;
}) => {
  const actorName = item.actor?.name ?? "Someone";

  return (
    <div className="flex gap-3 py-3">
      <Avatar
        className="h-8 w-8 flex-none"
        name={actorName}
        src={resolveServerAssetUrl(item.actor?.avatarUrl)}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-default-700">
          <span className="font-semibold text-default-900">{actorName}</span>{" "}
          {buildEventVerb(item)}
        </p>
        <p className="mt-0.5 text-xs text-default-400">
          {getRelativeTime(item.createdAt)}
        </p>
      </div>
    </div>
  );
};

const OnPageActivityCommentRow = ({
  currentUserId,
  item,
  onDelete,
}: {
  currentUserId?: string | number | null;
  item: OnPageActivityCommentItem;
  onDelete: (commentId: string | number) => void;
}) => {
  const authorName = item.createdBy?.name ?? "User";
  const isOwnComment =
    currentUserId !== undefined &&
    currentUserId !== null &&
    String(currentUserId) === String(item.createdBy?.id ?? "");

  return (
    <div className="group flex gap-3 py-3">
      <Avatar
        className="h-8 w-8 flex-none"
        name={authorName}
        src={resolveServerAssetUrl(item.createdBy?.avatarUrl)}
      />
      <div className="min-w-0 flex-1 rounded-lg bg-default-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-default-900">{authorName}</p>
          <p className="text-xs text-default-400">
            {getRelativeTime(item.createdAt)}
          </p>
          {isOwnComment ? (
            <Button
              isIconOnly
              className="ml-auto hidden text-default-400 group-hover:flex"
              radius="full"
              size="sm"
              variant="light"
              onPress={() => onDelete(item.id)}
            >
              <Trash2 size={14} />
            </Button>
          ) : null}
        </div>
        {item.bodyJson ? (
          <div className="mt-2">
            <RichTextEditor isReadOnly value={item.bodyJson as JSONContent} />
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-default-700">
            {item.body}
          </p>
        )}
      </div>
    </div>
  );
};

export const OnPagePageActivityFeed = ({
  clientId,
  pageUrl,
  runId,
}: OnPagePageActivityFeedProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [items, setItems] = useState<OnPageActivityItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (filter === "comments") return item.kind === "comment";
        if (filter === "updates") return item.kind === "event";

        return true;
      }),
    [filter, items],
  );

  const loadActivity = async (before?: string | null) => {
    if (!session?.accessToken) return;

    try {
      setIsLoading(true);
      const accessToken = await getValidAccessToken();
      const response = await onPageOptimizationsApi.listPageActivity(
        accessToken,
        clientId,
        runId,
        {
          before,
          limit: 50,
          pageUrl,
        },
      );

      setItems((current) =>
        before ? [...current, ...response.items] : response.items,
      );
      setCursor(response.cursor);
    } catch (error) {
      toast.danger("Failed to load activity.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitComment = async (payload: {
    bodyJson: Record<string, unknown>;
    comment: string;
  }) => {
    if (!session?.accessToken || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const accessToken = await getValidAccessToken();

      await onPageOptimizationsApi.createPageComment(
        accessToken,
        clientId,
        runId,
        {
          ...payload,
          pageUrl,
        },
      );
      await loadActivity(null);
    } catch (error) {
      toast.danger("Failed to post comment.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string | number) => {
    if (!session?.accessToken) return;

    try {
      const accessToken = await getValidAccessToken();

      await onPageOptimizationsApi.deletePageComment(
        accessToken,
        clientId,
        runId,
        commentId,
      );
      setItems((current) =>
        current.filter(
          (item) =>
            !(item.kind === "comment" && String(item.id) === String(commentId)),
        ),
      );
    } catch (error) {
      toast.danger("Failed to delete comment.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  useEffect(() => {
    setItems([]);
    setCursor(null);
    void loadActivity(null);
  }, [clientId, pageUrl, runId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.key}
            className={
              filter === item.key ? "bg-[#022279] text-white" : undefined
            }
            radius="full"
            size="sm"
            variant={filter === item.key ? "solid" : "bordered"}
            onPress={() => setFilter(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <ActivityComposer
        isSubmitting={isSubmitting}
        onFetchUrlPreview={async (url) => {
          const accessToken = await getValidAccessToken();

          return clientsApi.getUrlPreview(accessToken, url);
        }}
        onSubmit={submitComment}
        onUploadError={(msg) =>
          toast.danger("Failed to upload image", { description: msg })
        }
      />

      <div className="divide-y divide-default-100">
        {visibleItems.map((item) =>
          item.kind === "comment" ? (
            <OnPageActivityCommentRow
              key={`${item.kind}-${item.id}`}
              currentUserId={session?.user?.id}
              item={item}
              onDelete={(commentId) => {
                void deleteComment(commentId);
              }}
            />
          ) : (
            <OnPageActivityEventRow
              key={`${item.kind}-${item.id}`}
              item={item}
            />
          ),
        )}
      </div>

      {!isLoading && visibleItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-default-200 px-4 py-8 text-center text-sm text-default-500">
          No activity yet.
        </p>
      ) : null}

      {cursor ? (
        <div className="flex justify-center">
          <Button
            isLoading={isLoading}
            radius="sm"
            size="sm"
            variant="bordered"
            onPress={() => {
              void loadActivity(cursor);
            }}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
};
