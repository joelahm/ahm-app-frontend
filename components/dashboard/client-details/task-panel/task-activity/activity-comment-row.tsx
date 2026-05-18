"use client";

import type { TaskActivityCommentItem } from "@/apis/clients";

import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Trash2 } from "lucide-react";

import {
  RichTextEditor,
  type JSONContent,
} from "@/components/dashboard/client-details/task-panel/editor/rich-text-editor";
import { resolveServerAssetUrl } from "@/components/dashboard/client-details/task-panel/task-panel-utils";
import { getRelativeTime } from "@/components/dashboard/client-details/task-panel/task-activity/activity-utils";
import { formatCommentPreview } from "@/lib/comment-preview";

interface ActivityCommentRowProps {
  currentUserId?: string | number | null;
  item: TaskActivityCommentItem;
  onDelete: (commentId: string | number) => void;
}

export const ActivityCommentRow = ({
  currentUserId,
  item,
  onDelete,
}: ActivityCommentRowProps) => {
  const authorName = item.createdBy?.name ?? "User";
  const isOwnComment =
    currentUserId !== undefined &&
    currentUserId !== null &&
    String(currentUserId) === String(item.createdBy?.id ?? "");
  const fallbackBody = formatCommentPreview(item.body);

  return (
    <div className={`group flex gap-2 ${isOwnComment ? "py-1.5" : "py-2"}`}>
      <Avatar
        className={
          isOwnComment
            ? "h-8 min-h-8 w-8 min-w-8 flex-none"
            : "h-8 min-h-8 w-8 min-w-8 flex-none"
        }
        name={authorName}
        src={resolveServerAssetUrl(item.createdBy?.avatarUrl)}
      />
      <div
        className={`min-w-0 flex-1 rounded-lg bg-default-50 ${
          isOwnComment ? "px-2.5 py-1.5" : "px-3 py-2"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <p className="truncate text-xs font-semibold text-default-900">
              {authorName}
            </p>
            <p className="whitespace-nowrap text-xs text-default-400">
              {getRelativeTime(item.createdAt)}
            </p>
          </div>
          <div className="flex h-7 w-8 items-center justify-end">
            {isOwnComment ? (
              <Button
                isIconOnly
                className="h-7 min-h-7 w-7 min-w-7 text-default-400 opacity-0 transition-opacity group-hover:opacity-100"
                radius="full"
                size="sm"
                variant="light"
                onPress={() => onDelete(item.id)}
              >
                <Trash2 size={14} />
              </Button>
            ) : null}
          </div>
        </div>
        {item.bodyJson ? (
          <div className="mt-1">
            <RichTextEditor
              isCompact
              isReadOnly
              value={item.bodyJson as JSONContent}
            />
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-5 text-default-700">
            {fallbackBody}
          </p>
        )}
      </div>
    </div>
  );
};
