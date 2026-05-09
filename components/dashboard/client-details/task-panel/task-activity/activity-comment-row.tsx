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
