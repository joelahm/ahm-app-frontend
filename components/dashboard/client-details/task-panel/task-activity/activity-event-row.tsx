"use client";

import type { TaskActivityEventItem } from "@/apis/clients";

import { Avatar } from "@heroui/avatar";

import { resolveServerAssetUrl } from "@/components/dashboard/client-details/task-panel/task-panel-utils";
import {
  getMetadataString,
  getRelativeTime,
} from "@/components/dashboard/client-details/task-panel/task-activity/activity-utils";

interface ActivityEventRowProps {
  item: TaskActivityEventItem;
  showTaskName?: boolean;
}

const buildVerb = (item: TaskActivityEventItem) => {
  const metadata = item.metadata;

  switch (item.type) {
    case "STATUS_CHANGED":
      return `changed status from ${getMetadataString(metadata, "from") || "-"} to ${getMetadataString(metadata, "to") || "-"}`;
    case "ASSIGNEE_CHANGED": {
      const toUserId = getMetadataString(metadata, "toUserId");

      return toUserId ? `assigned user #${toUserId}` : "unassigned the task";
    }
    case "DUE_DATE_CHANGED": {
      const to = getMetadataString(metadata, "to");

      return to
        ? `set due date to ${new Date(to).toLocaleDateString()}`
        : "removed the due date";
    }
    case "PRIORITY_CHANGED":
      return `changed priority from ${getMetadataString(metadata, "from") || "-"} to ${getMetadataString(metadata, "to") || "-"}`;
    case "PROJECT_UPDATED": {
      const updatedFields = metadata.updatedFields;
      const fields = Array.isArray(updatedFields)
        ? updatedFields.filter((field) => typeof field === "string")
        : [];

      return fields.length
        ? `updated project ${fields.join(", ")}`
        : "updated the project";
    }
    case "PROJECT_TASK_ASSIGNEES_RESYNCED":
      return "resynced project task assignees";
    case "PARENT_CHANGED":
      return "moved the task";
    case "ATTACHMENT_ADDED":
      return `attached ${getMetadataString(metadata, "filename") || "a file"}`;
    case "ATTACHMENT_REMOVED":
      return `removed attachment ${getMetadataString(metadata, "filename") || ""}`.trim();
    case "CHECKLIST_CREATED":
      return `added checklist "${getMetadataString(metadata, "title") || "Checklist"}"`;
    case "CHECKLIST_DELETED":
      return `deleted checklist "${getMetadataString(metadata, "title") || "Checklist"}"`;
    case "CHECKLIST_ITEM_COMPLETED":
      return `completed "${getMetadataString(metadata, "text") || "item"}"`;
    case "CHECKLIST_ITEM_REOPENED":
      return `reopened "${getMetadataString(metadata, "text") || "item"}"`;
    case "SUBTASK_ADDED":
      return `added subtask "${getMetadataString(metadata, "title") || "Untitled subtask"}"`;
    default:
      return "updated the task";
  }
};

export const ActivityEventRow = ({
  item,
  showTaskName = false,
}: ActivityEventRowProps) => {
  const actorName = item.actor?.name ?? "Someone";
  const taskName = getMetadataString(item.metadata, "taskName");

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
          {buildVerb(item)}
        </p>
        {showTaskName && taskName ? (
          <p className="mt-0.5 text-xs text-default-500">Task: {taskName}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-default-400">
          {getRelativeTime(item.createdAt)}
        </p>
      </div>
    </div>
  );
};
