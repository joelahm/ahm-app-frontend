"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/button";

import { clientsApi, type TaskActivityEventItem } from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { ActivityEventRow } from "@/components/dashboard/client-details/task-panel/task-activity/activity-event-row";
import { useTaskActivityRefresh } from "@/components/dashboard/client-details/task-panel/task-activity/use-task-activity-refresh";
import { useAppToast } from "@/hooks/use-app-toast";

interface ProjectActivityFeedProps {
  projectId: string | number;
  taskIds?: Array<string | number>;
}

export const ProjectActivityFeed = ({
  projectId,
  taskIds = [],
}: ProjectActivityFeedProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const { version } = useTaskActivityRefresh();
  const [items, setItems] = useState<TaskActivityEventItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadActivity = async (before?: string | null) => {
    if (!session?.accessToken || !projectId) return;

    try {
      setIsLoading(true);
      const accessToken = await getValidAccessToken();
      let response;

      if (!before && taskIds.length > 0) {
        const taskActivityResponses = await Promise.all(
          taskIds.slice(0, 25).map((taskId) =>
            clientsApi.listTaskActivity(accessToken, taskId, {
              limit: 20,
            }),
          ),
        );

        response = {
          cursor: null,
          items: taskActivityResponses
            .flatMap((item) => item.items)
            .filter((item) => item.kind === "event")
            .sort(
              (left, right) =>
                new Date(right.createdAt).getTime() -
                new Date(left.createdAt).getTime(),
            )
            .slice(0, 50),
        };
      } else {
        response = await clientsApi.listProjectActivity(
          accessToken,
          projectId,
          {
            before,
            limit: 50,
          },
        );
      }

      const events = response.items.filter(
        (item): item is TaskActivityEventItem => item.kind === "event",
      );

      setItems((current) => (before ? [...current, ...events] : events));
      setCursor(response.cursor);
    } catch (error) {
      toast.danger("Failed to load project activity.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setCursor(null);
    void loadActivity(null);
  }, [projectId, taskIds, version]);

  return (
    <div className="space-y-4">
      <div className="divide-y divide-default-100">
        {items.map((item) => (
          <ActivityEventRow
            key={`${item.kind}-${item.id}`}
            showTaskName
            item={item}
          />
        ))}
      </div>

      {!isLoading && items.length === 0 ? (
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
