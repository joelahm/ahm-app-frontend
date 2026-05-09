"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";

import { clientsApi, type TaskActivityItem } from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { ActivityCommentRow } from "@/components/dashboard/client-details/task-panel/task-activity/activity-comment-row";
import { ActivityComposer } from "@/components/dashboard/client-details/task-panel/task-activity/activity-composer";
import { ActivityEventRow } from "@/components/dashboard/client-details/task-panel/task-activity/activity-event-row";
import { useTaskActivityRefresh } from "@/components/dashboard/client-details/task-panel/task-activity/use-task-activity-refresh";
import { resolveServerAssetUrl } from "@/components/dashboard/client-details/task-panel/task-panel-utils";
import { useAppToast } from "@/hooks/use-app-toast";

interface TaskActivityFeedProps {
  taskId: string | number;
}

type ActivityFilter = "all" | "comments" | "updates";

const FILTERS: Array<{ key: ActivityFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "comments", label: "Comments" },
  { key: "updates", label: "Updates" },
];

export const TaskActivityFeed = ({ taskId }: TaskActivityFeedProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const { version } = useTaskActivityRefresh();
  const [items, setItems] = useState<TaskActivityItem[]>([]);
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
      const response = await clientsApi.listTaskActivity(accessToken, taskId, {
        before,
        limit: 50,
      });

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

      await clientsApi.createTaskComment(accessToken, taskId, payload);
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

      await clientsApi.deleteTaskComment(accessToken, commentId);
      setItems((current) =>
        current.filter(
          (item) => !(item.kind === "comment" && String(item.id) === String(commentId)),
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
  }, [taskId, version]);

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
        onUploadImage={async (file) => {
          const accessToken = await getValidAccessToken();
          const attachment = await clientsApi.uploadTaskAttachment(
            accessToken,
            taskId,
            file,
          );
          return { url: resolveServerAssetUrl(attachment.url) ?? attachment.url };
        }}
      />

      <div className="divide-y divide-default-100">
        {visibleItems.map((item) =>
          item.kind === "comment" ? (
            <ActivityCommentRow
              key={`${item.kind}-${item.id}`}
              currentUserId={session?.user?.id}
              item={item}
              onDelete={(commentId) => {
                void deleteComment(commentId);
              }}
            />
          ) : (
            <ActivityEventRow key={`${item.kind}-${item.id}`} item={item} />
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
