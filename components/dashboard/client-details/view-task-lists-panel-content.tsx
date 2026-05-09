"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { DatePicker } from "@heroui/date-picker";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { getLocalTimeZone, today } from "@internationalized/date";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Image as ImageIcon,
  List,
  LocateIcon,
  MapPin,
  Paperclip,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";

import { clientsApi, ProjectComment } from "@/apis/clients";
import { projectTemplatesApi } from "@/apis/project-templates";
import { useAuth } from "@/components/auth/auth-context";
import {
  RichTextEditor,
  buildDocFromPlainText,
  type JSONContent,
} from "@/components/dashboard/client-details/task-panel/editor/rich-text-editor";
import { TaskPanelAttachments } from "@/components/dashboard/client-details/task-panel/task-panel-attachments";
import { TaskPanelChecklists } from "@/components/dashboard/client-details/task-panel/task-panel-checklists";
import { TaskActivityFeed } from "@/components/dashboard/client-details/task-panel/task-activity/task-activity-feed";
import {
  TaskActivityRefreshProvider,
  useTaskActivityRefresh,
} from "@/components/dashboard/client-details/task-panel/task-activity/use-task-activity-refresh";
import { TaskStatusChip } from "@/components/dashboard/client-details/task-panel/task-status-chip";
import {
  calendarDateToIso,
  defaultProjectStatusOptions,
  extractSelectedLines,
  getCaretCharacterOffset,
  getInitials,
  getTaskDueDateTime,
  resolveServerAssetUrl,
  sanitizeCommentHtml,
  toCalendarDate,
  toFriendlyDate,
} from "@/components/dashboard/client-details/task-panel/task-panel-utils";
import { useAppToast } from "@/hooks/use-app-toast";
import { normalizeProjectStatus } from "@/lib/project-statuses";
import {
  buildCommentMessage,
  buildPendingAttachmentsFromFileList,
  MAX_COMMENT_ATTACHMENT_BYTES,
  MAX_COMMENT_ATTACHMENTS,
  MAX_COMMENT_ATTACHMENTS_TOTAL_BYTES,
  MAX_COMMENT_PAYLOAD_BYTES,
  parseCommentAttachments,
  PendingAttachmentItem,
  ParsedCommentAttachment,
  validateCommentPayloadSize,
} from "@/lib/comment-attachments";
import { normalizeTaskStatus, TASK_STATUS_OPTIONS } from "@/lib/task-statuses";

interface ViewTaskListsPanelContentProps {
  accountManagerAvatar?: string;
  accountManagerId?: string;
  accountManagerName: string;
  address: string;
  clientName: string;
  csmAvatar?: string;
  csmId?: string;
  csmName: string;
  description?: string;
  descriptionJson?: Record<string, unknown> | null;
  initialSelectedTaskId?: string | null;
  projectName: string;
  projectId: string;
  projectDueDate?: string | null;
  projectStartDate?: string | null;
  status?: string;
  onClose?: () => void;
  tasks?: Array<{
    assigneeAvatar?: string;
    assigneeId?: string | null;
    assigneeName: string;
    blockedTaskId?: string | null;
    description?: string | null;
    descriptionJson?: Record<string, unknown> | null;
    dueDate: string;
    dueDateOffsetDays?: number;
    dueDateRuleType?: string | null;
    id: string;
    name: string;
    parentTaskId?: string | null;
    status: string;
  }>;
  users?: Array<{ avatar?: string | null; id: string; name: string }>;
  onProjectMetaChange?: (payload: {
    accountManagerId?: string;
    csmId?: string;
    description?: string | null;
    descriptionJson?: Record<string, unknown> | null;
    dueDate?: string | null;
    startDate?: string | null;
    status?: string;
  }) => Promise<void> | void;
  onTaskDueDateChange?: (
    taskId: string,
    dueDate: string,
  ) => Promise<void> | void;
  onTaskChange?: (
    taskId: string,
    payload: {
      assigneeId?: string;
      dueDate?: string;
      status?: string;
    },
  ) => Promise<void> | void;
}

export const ViewTaskListsPanelContent = (
  props: ViewTaskListsPanelContentProps,
) => (
  <TaskActivityRefreshProvider>
    <ViewTaskListsPanelContentInner {...props} />
  </TaskActivityRefreshProvider>
);

const ViewTaskListsPanelContentInner = ({
  accountManagerAvatar,
  accountManagerId,
  accountManagerName,
  address,
  clientName,
  csmAvatar,
  csmId,
  csmName,
  description,
  descriptionJson: projectDescriptionJsonProp,
  initialSelectedTaskId,
  onClose,
  onProjectMetaChange,
  onTaskChange,
  onTaskDueDateChange,
  projectName,
  projectId,
  projectDueDate,
  projectStartDate,
  status,
  tasks = [],
  users = [],
}: ViewTaskListsPanelContentProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const { bump: bumpActivity } = useTaskActivityRefresh();
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const commentEditorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [activeAccountManagerId, setActiveAccountManagerId] =
    useState(accountManagerId);
  const [caretPosition, setCaretPosition] = useState(0);
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [commentAttachmentLibrary, setCommentAttachmentLibrary] = useState<
    Record<
      string,
      { isImage: boolean; mimeType?: string; name: string; previewUrl: string }
    >
  >({});
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachmentItem[]
  >([]);
  const [previewAttachment, setPreviewAttachment] = useState<{
    name: string;
    url: string;
  } | null>(null);
  const [activeCsmId, setActiveCsmId] = useState(csmId);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<string | null>(
    null,
  );
  const [isSendingComment, setIsSendingComment] = useState(false);
  const todayDate = useMemo(() => today(getLocalTimeZone()), []);
  const [startDate, setStartDate] = useState(todayDate);
  const [dueDate, setDueDate] = useState(todayDate);
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    strikeThrough: false,
    underline: false,
  });
  const [activeStatus, setActiveStatus] = useState(
    normalizeProjectStatus(status),
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [projectStatusOptions, setProjectStatusOptions] = useState<string[]>(
    defaultProjectStatusOptions,
  );
  const [isSavingProjectMeta, setIsSavingProjectMeta] = useState(false);
  const [isSavingTaskDueDate, setIsSavingTaskDueDate] = useState(false);
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDueDate, setTaskDueDate] = useState(todayDate);
  const [taskStatus, setTaskStatus] = useState<string>(TASK_STATUS_OPTIONS[0]);
  const [taskOverridesById, setTaskOverridesById] = useState<
    Record<
      string,
      Partial<
        Pick<
          (typeof tasks)[number],
          | "assigneeAvatar"
          | "assigneeId"
          | "assigneeName"
          | "description"
          | "descriptionJson"
          | "dueDate"
          | "status"
        >
      >
    >
  >({});
  const [descriptionDraft, setDescriptionDraft] = useState<JSONContent | null>(
    null,
  );
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [descriptionDirty, setDescriptionDirty] = useState(false);
  const [projectDescriptionDraft, setProjectDescriptionDraft] =
    useState<JSONContent | null>(null);
  const [projectDescriptionDirty, setProjectDescriptionDirty] = useState(false);
  const [isSavingProjectDescription, setIsSavingProjectDescription] =
    useState(false);
  const [
    isUploadingProjectDescriptionImage,
    setIsUploadingProjectDescriptionImage,
  ] = useState(false);
  const [isUploadingDescriptionImage, setIsUploadingDescriptionImage] =
    useState(false);

  useEffect(() => {
    setActiveAccountManagerId(accountManagerId);
  }, [accountManagerId]);

  useEffect(() => {
    setActiveCsmId(csmId);
  }, [csmId]);

  useEffect(() => {
    setActiveStatus(normalizeProjectStatus(status));
  }, [status]);

  useEffect(() => {
    setSelectedTaskId(initialSelectedTaskId ?? null);
    setExpandedTaskIds(new Set());
    setTaskOverridesById({});
    setProjectDescriptionDraft(null);
    setProjectDescriptionDirty(false);
  }, [initialSelectedTaskId, projectId]);

  useEffect(() => {
    setDescriptionDirty(false);
  }, [selectedTaskId]);

  useEffect(() => {
    const nextStartDate = toCalendarDate(projectStartDate) ?? todayDate;
    const nextDueDate = toCalendarDate(projectDueDate) ?? nextStartDate;

    setStartDate(nextStartDate);
    setDueDate(
      nextDueDate.compare(nextStartDate) < 0 ? nextStartDate : nextDueDate,
    );
  }, [projectDueDate, projectStartDate, todayDate]);

  const originalStartDate = useMemo(
    () => calendarDateToIso(toCalendarDate(projectStartDate) ?? todayDate),
    [projectStartDate, todayDate],
  );
  const originalDueDate = useMemo(() => {
    const nextStartDate = toCalendarDate(projectStartDate) ?? todayDate;
    const nextDueDate = toCalendarDate(projectDueDate) ?? nextStartDate;

    return calendarDateToIso(
      nextDueDate.compare(nextStartDate) < 0 ? nextStartDate : nextDueDate,
    );
  }, [projectDueDate, projectStartDate, todayDate]);

  const hasMetaChanges =
    (activeAccountManagerId ?? "") !== (accountManagerId ?? "") ||
    (activeCsmId ?? "") !== (csmId ?? "") ||
    (activeStatus ?? "On Going") !== normalizeProjectStatus(status) ||
    calendarDateToIso(startDate) !== originalStartDate ||
    calendarDateToIso(dueDate) !== originalDueDate;

  useEffect(() => {
    if (!session || !projectId) {
      setProjectStatusOptions(defaultProjectStatusOptions);

      return;
    }

    let isMounted = true;

    const loadProjectStatusOptions = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const response =
          await projectTemplatesApi.listProjectTemplateStatusOptions(
            accessToken,
          );
        const options = Array.from(
          new Set(
            response.statusOptions
              .map((item) => normalizeProjectStatus(item))
              .filter(Boolean),
          ),
        );

        if (!isMounted) {
          return;
        }

        setProjectStatusOptions(
          options.length ? options : defaultProjectStatusOptions,
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setProjectStatusOptions(defaultProjectStatusOptions);
      }
    };

    void loadProjectStatusOptions();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, projectId, session]);

  useEffect(() => {
    if (!session || !projectId) {
      setComments([]);

      return;
    }

    let isMounted = true;

    setIsCommentsLoading(true);

    const loadComments = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const response = await clientsApi.getProjectComments(
          accessToken,
          projectId,
        );

        if (!isMounted) {
          return;
        }

        setComments(response.comments);
      } catch {
        if (!isMounted) {
          return;
        }

        setComments([]);
      } finally {
        if (isMounted) {
          setIsCommentsLoading(false);
        }
      }
    };

    void loadComments();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, projectId, session]);

  const subtitle = useMemo(
    () => `${clientName || "-"} | ${address || "-"}`,
    [address, clientName],
  );
  const panelTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        ...(taskOverridesById[task.id] ?? {}),
      })),
    [taskOverridesById, tasks],
  );
  const selectedTask = useMemo(
    () => panelTasks.find((task) => task.id === selectedTaskId) ?? null,
    [panelTasks, selectedTaskId],
  );
  const selectedTaskBlockedTask = useMemo(
    () =>
      selectedTask?.dueDateRuleType === "BLOCKED_TASK" &&
      selectedTask.blockedTaskId
        ? (panelTasks.find((task) => task.id === selectedTask.blockedTaskId) ??
          null)
        : null,
    [panelTasks, selectedTask],
  );
  const hasSelectedTaskDueDateChange = useMemo(
    () =>
      Boolean(selectedTask) &&
      calendarDateToIso(taskDueDate) !==
        calendarDateToIso(toCalendarDate(selectedTask?.dueDate) ?? todayDate),
    [selectedTask, taskDueDate, todayDate],
  );
  const hasSelectedTaskStatusChange = useMemo(
    () =>
      Boolean(selectedTask) &&
      taskStatus !== normalizeTaskStatus(selectedTask?.status ?? ""),
    [selectedTask, taskStatus],
  );
  const hasSelectedTaskAssigneeChange = useMemo(
    () =>
      Boolean(selectedTask) &&
      Boolean(taskAssigneeId) &&
      taskAssigneeId !== (selectedTask?.assigneeId ?? ""),
    [selectedTask, taskAssigneeId],
  );
  const canSaveSelectedTaskChanges = useMemo(
    () =>
      Boolean(selectedTask) &&
      ((hasSelectedTaskDueDateChange &&
        (Boolean(onTaskChange) || Boolean(onTaskDueDateChange))) ||
        ((hasSelectedTaskAssigneeChange || hasSelectedTaskStatusChange) &&
          Boolean(onTaskChange))),
    [
      hasSelectedTaskAssigneeChange,
      hasSelectedTaskDueDateChange,
      hasSelectedTaskStatusChange,
      onTaskChange,
      onTaskDueDateChange,
      selectedTask,
    ],
  );

  useEffect(() => {
    setTaskAssigneeId(selectedTask?.assigneeId ?? "");
    setTaskDueDate(toCalendarDate(selectedTask?.dueDate) ?? todayDate);
    setTaskStatus(
      normalizeTaskStatus(selectedTask?.status ?? TASK_STATUS_OPTIONS[0]),
    );
  }, [
    selectedTask?.assigneeId,
    selectedTask?.dueDate,
    selectedTask?.status,
    todayDate,
  ]);

  const orderedTasks = useMemo(
    () => panelTasks.map((task, index) => ({ index, task })),
    [panelTasks],
  );
  const taskOrderById = useMemo(
    () =>
      orderedTasks.reduce<Record<string, number>>((acc, { index, task }) => {
        acc[task.id] = index;

        return acc;
      }, {}),
    [orderedTasks],
  );
  const sortTasksByDueDate = useMemo(
    () => (items: typeof panelTasks) =>
      [...items].sort((left, right) => {
        const dueDateDifference =
          getTaskDueDateTime(left.dueDate) - getTaskDueDateTime(right.dueDate);

        if (dueDateDifference !== 0) {
          return dueDateDifference;
        }

        return (taskOrderById[left.id] ?? 0) - (taskOrderById[right.id] ?? 0);
      }),
    [taskOrderById],
  );
  const taskById = useMemo(
    () =>
      panelTasks.reduce<Record<string, (typeof panelTasks)[number]>>(
        (acc, task) => {
          acc[task.id] = task;

          return acc;
        },
        {},
      ),
    [panelTasks],
  );
  const childrenByParentId = useMemo(() => {
    const groups = new Map<string, typeof panelTasks>();

    orderedTasks.forEach(({ task }) => {
      if (!task.parentTaskId || !taskById[task.parentTaskId]) {
        return;
      }

      const current = groups.get(task.parentTaskId) ?? [];

      current.push(task);
      groups.set(task.parentTaskId, current);
    });

    return new Map(
      Array.from(groups.entries()).map(([taskId, children]) => [
        taskId,
        sortTasksByDueDate(children),
      ]),
    );
  }, [orderedTasks, sortTasksByDueDate, taskById]);
  const rootTasks = useMemo(
    () =>
      sortTasksByDueDate(
        orderedTasks
          .filter(
            ({ task }) =>
              !task.parentTaskId || !taskById[String(task.parentTaskId)],
          )
          .map(({ task }) => task),
      ),
    [orderedTasks, sortTasksByDueDate, taskById],
  );
  const parentTaskIds = useMemo(
    () =>
      new Set(
        Array.from(childrenByParentId.entries())
          .filter(([, children]) => children.length > 0)
          .map(([taskId]) => taskId),
      ),
    [childrenByParentId],
  );

  useEffect(() => {
    setExpandedTaskIds(new Set(parentTaskIds));
  }, [parentTaskIds, projectId]);

  const flattenedTaskRows = useMemo(() => {
    const rows: Array<{
      depth: number;
      isSubtask: boolean;
      task: (typeof panelTasks)[number];
    }> = [];

    const appendChildren = (
      taskId: string,
      depth: number,
      visited = new Set<string>(),
    ) => {
      const children = childrenByParentId.get(taskId) ?? [];

      children.forEach((child) => {
        if (visited.has(child.id)) {
          return;
        }

        const nextVisited = new Set(visited);

        nextVisited.add(child.id);
        rows.push({ depth, isSubtask: true, task: child });

        if (expandedTaskIds.has(child.id)) {
          appendChildren(child.id, depth + 1, nextVisited);
        }
      });
    };

    if (selectedTask) {
      appendChildren(selectedTask.id, 0, new Set([selectedTask.id]));

      return rows;
    }

    rootTasks.forEach((rootTask) => {
      rows.push({ depth: 0, isSubtask: false, task: rootTask });

      if (expandedTaskIds.has(rootTask.id)) {
        appendChildren(rootTask.id, 1, new Set([rootTask.id]));
      }
    });

    return rows;
  }, [
    childrenByParentId,
    expandedTaskIds,
    panelTasks,
    rootTasks,
    selectedTask,
  ]);
  const displayedTasks = useMemo(() => flattenedTaskRows, [flattenedTaskRows]);
  const hasTaskHierarchy = useMemo(
    () => tasks.some((task) => Boolean(task.parentTaskId)),
    [tasks],
  );
  const displayedDescription =
    selectedTask?.description?.trim() ||
    description?.trim() ||
    "No project template description found.";

  const selectedTaskDescriptionValue = useMemo<JSONContent | null>(() => {
    if (!selectedTask) return null;
    if (descriptionDirty) return descriptionDraft;
    if (selectedTask.descriptionJson) {
      return selectedTask.descriptionJson as JSONContent;
    }
    return buildDocFromPlainText(selectedTask.description ?? null);
  }, [descriptionDirty, descriptionDraft, selectedTask]);

  const projectDescriptionValue = useMemo<JSONContent | null>(() => {
    if (projectDescriptionDirty) return projectDescriptionDraft;
    if (projectDescriptionJsonProp) {
      return projectDescriptionJsonProp as JSONContent;
    }
    return buildDocFromPlainText(description ?? null);
  }, [
    description,
    projectDescriptionDirty,
    projectDescriptionDraft,
    projectDescriptionJsonProp,
  ]);

  const handleSaveProjectDescription = async () => {
    if (
      !projectDescriptionDirty ||
      isSavingProjectDescription ||
      !onProjectMetaChange
    ) {
      return;
    }

    try {
      setIsSavingProjectDescription(true);
      await onProjectMetaChange({
        descriptionJson: projectDescriptionDraft as
          | Record<string, unknown>
          | null,
      });
      setProjectDescriptionDirty(false);
      toast.success("Project description saved.");
    } catch (error) {
      toast.danger("Failed to save project description.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSavingProjectDescription(false);
    }
  };

  const handleSaveTaskDescription = async () => {
    if (!selectedTask || !descriptionDirty || isSavingDescription) return;
    if (!session?.accessToken) return;

    try {
      setIsSavingDescription(true);
      const accessToken = await getValidAccessToken();
      const payload = {
        descriptionJson: descriptionDraft as Record<string, unknown> | null,
      } as unknown as Partial<
        Parameters<typeof clientsApi.updateProjectTask>[2]
      >;
      const response = await clientsApi.updateProjectTask(
        accessToken,
        selectedTask.id,
        payload as Parameters<typeof clientsApi.updateProjectTask>[2],
      );
      const nextDescriptionJson =
        (response?.descriptionJson ?? null) as Record<string, unknown> | null;
      const nextDescriptionPlain = response?.description ?? null;

      setTaskOverridesById((current) => ({
        ...current,
        [selectedTask.id]: {
          ...(current[selectedTask.id] ?? {}),
          description: nextDescriptionPlain,
          descriptionJson: nextDescriptionJson,
        },
      }));
      setDescriptionDirty(false);
      toast.success("Description saved.");
    } catch (error) {
      toast.danger("Failed to save description.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSavingDescription(false);
    }
  };

  const activeMention = useMemo(() => {
    if (!commentInput || caretPosition < 0) {
      return null;
    }

    const beforeCaret = commentInput.slice(0, caretPosition);
    const mentionStart = beforeCaret.lastIndexOf("@");

    if (mentionStart < 0) {
      return null;
    }

    const query = beforeCaret.slice(mentionStart + 1);

    if (/\s/.test(query)) {
      return null;
    }

    return { query: query.toLowerCase(), startIndex: mentionStart };
  }, [caretPosition, commentInput]);
  const mentionOptions = useMemo(() => {
    if (!activeMention) {
      return [];
    }

    return users
      .filter((user) =>
        activeMention.query
          ? user.name.toLowerCase().includes(activeMention.query)
          : true,
      )
      .slice(0, 6);
  }, [activeMention, users]);

  const formatCommentAuthor = (comment: ProjectComment) => {
    if (!comment.author) {
      return "User";
    }

    const parts = [comment.author.firstName, comment.author.lastName]
      .map((value) => value?.trim() ?? "")
      .filter(Boolean);

    return parts.join(" ") || "User";
  };

  const formatCommentTime = (value?: string | null) => {
    if (!value) {
      return "-";
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString();
  };

  const renderCommentWithMentions = (message: string) => {
    if (!message) {
      return null;
    }

    const mentionTokens = users
      .map((user) => `@${user.name}`)
      .sort((left, right) => right.length - left.length);
    const elements: Array<JSX.Element | string> = [];
    let cursor = 0;

    while (cursor < message.length) {
      const matchedToken = mentionTokens.find((token) =>
        message.startsWith(token, cursor),
      );

      if (matchedToken) {
        elements.push(
          <span key={`${cursor}-${matchedToken}`} className="text-[#2563EB]">
            {matchedToken}
          </span>,
        );
        cursor += matchedToken.length;

        continue;
      }

      elements.push(message[cursor] ?? "");
      cursor += 1;
    }

    return elements;
  };

  const handleAddComment = async () => {
    const editorHtml = commentEditorRef.current?.innerHTML?.trim() ?? "";
    const message = buildCommentMessage({
      editorHtml,
      pendingAttachments,
      plainText: commentInput,
    });

    if (!session || !projectId || !message || isSendingComment) {
      return;
    }

    const payloadValidation = validateCommentPayloadSize(message);

    if (!payloadValidation.isValid) {
      toast.warning("Comment is too large to send.", {
        description: `Please reduce text or attachments (max ${Math.floor(
          MAX_COMMENT_PAYLOAD_BYTES / 1024,
        )}KB payload).`,
      });

      return;
    }

    setIsSendingComment(true);

    try {
      const accessToken = await getValidAccessToken();
      const createdComment = await clientsApi.createProjectComment(
        accessToken,
        projectId,
        { comment: message },
      );

      setCommentAttachmentLibrary((previous) => {
        const next = { ...previous };

        pendingAttachments.forEach((attachment) => {
          if (!attachment.previewUrl && !attachment.dataUrl) {
            return;
          }

          next[attachment.id] = {
            isImage: attachment.isImage,
            mimeType: attachment.mimeType,
            name: attachment.name,
            previewUrl: attachment.dataUrl ?? attachment.previewUrl ?? "",
          };
        });

        return next;
      });

      setComments((previous) => [...previous, createdComment]);
      setCommentInput("");
      setPendingAttachments([]);
      if (commentEditorRef.current) {
        commentEditorRef.current.innerHTML = "";
      }
    } finally {
      setIsSendingComment(false);
    }
  };

  const refreshFormatState = () => {
    const editor = commentEditorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) {
      setFormatState({
        bold: false,
        italic: false,
        strikeThrough: false,
        underline: false,
      });

      return;
    }

    const range = selection.getRangeAt(0);
    const isInsideEditor =
      editor.contains(range.startContainer) &&
      editor.contains(range.endContainer);

    if (!isInsideEditor) {
      setFormatState({
        bold: false,
        italic: false,
        strikeThrough: false,
        underline: false,
      });

      return;
    }

    setFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      underline: document.queryCommandState("underline"),
    });
  };

  const applyEditorCommand = (
    command: string,
    value?: string,
    options?: { requireSelection?: boolean },
  ) => {
    const editor = commentEditorRef.current;
    const selection = window.getSelection();

    if (!editor) {
      return;
    }

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedTextLength = range.toString().trim().length;

    if (options?.requireSelection && selectedTextLength === 0) {
      return;
    }

    editor.focus();
    document.execCommand(command, false, value);
    setCommentInput(editor.innerText || "");
    setCaretPosition(getCaretCharacterOffset(editor));
    refreshFormatState();
  };

  const applyListFromSelection = () => {
    const editor = commentEditorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const lines = extractSelectedLines(range);

    if (lines.length === 0) {
      return;
    }

    const bulletText = lines.map((line) => `- ${line}`).join("\n");
    const textNode = document.createTextNode(bulletText);

    range.deleteContents();
    range.insertNode(textNode);
    selection.removeAllRanges();

    const collapseRange = document.createRange();

    collapseRange.selectNodeContents(editor);
    collapseRange.collapse(false);
    selection.addRange(collapseRange);

    editor.focus();
    setCommentInput(editor.innerText || "");
    setCaretPosition(getCaretCharacterOffset(editor));
    refreshFormatState();
  };

  const handleInsertMention = (name: string) => {
    const editor = commentEditorRef.current;

    if (!activeMention) {
      return;
    }

    if (!editor) {
      return;
    }

    editor.focus();

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const queryLength = activeMention.query.length + 1;

    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = range.startContainer as Text;
      const startOffset = Math.max(0, range.startOffset - queryLength);

      range.setStart(textNode, startOffset);
      range.deleteContents();
    }

    const mentionSpan = document.createElement("span");

    mentionSpan.className = "text-[#2563EB]";
    mentionSpan.textContent = `@${name}`;
    const trailingSpace = document.createTextNode(" ");

    range.insertNode(trailingSpace);
    range.insertNode(mentionSpan);
    range.setStartAfter(trailingSpace);
    range.setEndAfter(trailingSpace);
    selection.removeAllRanges();
    selection.addRange(range);

    requestAnimationFrame(() => {
      const target = commentEditorRef.current;

      if (!target) {
        return;
      }

      target.focus();
      setCommentInput(target.innerText || "");
      setCaretPosition(getCaretCharacterOffset(target));
      refreshFormatState();
    });
  };

  const handleAddPendingFiles = async (
    fileList: FileList | null,
    options?: { imageOnly?: boolean },
  ) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const {
      attachments,
      countExceededFiles,
      oversizedFiles,
      totalSizeExceededFiles,
      unsupportedFiles,
    } = await buildPendingAttachmentsFromFileList(fileList, {
      currentAttachments: pendingAttachments,
      imageOnly: options?.imageOnly,
    });

    if (attachments.length === 0) {
      if (unsupportedFiles.length > 0) {
        toast.warning("Unsupported file type.", {
          description: options?.imageOnly
            ? "Please upload image files only."
            : "Please upload a supported file format.",
        });
      }

      if (oversizedFiles.length > 0) {
        toast.warning("File is too large.", {
          description: `Each file must be ${Math.floor(MAX_COMMENT_ATTACHMENT_BYTES / 1024)}KB or less.`,
        });
      }

      if (totalSizeExceededFiles.length > 0) {
        toast.warning("Total attachment size exceeded.", {
          description: `Combined attachments must stay under ${Math.floor(
            MAX_COMMENT_ATTACHMENTS_TOTAL_BYTES / 1024,
          )}KB.`,
        });
      }

      if (countExceededFiles.length > 0) {
        toast.warning("Attachment limit reached.", {
          description: `You can attach up to ${MAX_COMMENT_ATTACHMENTS} files per comment.`,
        });
      }

      return;
    }

    setPendingAttachments((previous) => [...previous, ...attachments]);

    if (unsupportedFiles.length > 0) {
      toast.warning("Some files were skipped because they are not images.");
    }

    if (oversizedFiles.length > 0) {
      toast.warning("Some files were skipped for size limits.");
    }

    if (totalSizeExceededFiles.length > 0) {
      toast.warning("Some files were skipped because total size is too large.");
    }

    if (countExceededFiles.length > 0) {
      toast.warning(
        "Some files were skipped because attachment limit is reached.",
      );
    }
  };

  const handleRemovePendingAttachment = (indexToRemove: number) => {
    setPendingAttachments((previous) => {
      const target = previous[indexToRemove];

      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return previous.filter((_, index) => index !== indexToRemove);
    });
  };

  const handleOpenAttachment = (attachment: ParsedCommentAttachment) => {
    const mapped = attachment.id
      ? (commentAttachmentLibrary[attachment.id] ?? null)
      : null;
    const attachmentUrl = attachment.dataUrl ?? mapped?.previewUrl;
    const attachmentName = mapped?.name ?? attachment.name;
    const isImage = attachment.isImage ?? mapped?.isImage;

    if (!attachmentUrl) {
      toast.warning("Attachment is unavailable.");

      return;
    }

    if (isImage) {
      setPreviewAttachment({
        name: attachmentName,
        url: attachmentUrl,
      });

      return;
    }

    const openedWindow = window.open(
      attachmentUrl,
      "_blank",
      "noopener,noreferrer",
    );

    if (openedWindow) {
      return;
    }

    const link = document.createElement("a");

    link.href = attachmentUrl;
    link.download = attachmentName;
    link.click();
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!session || !commentId || isDeletingCommentId) {
      return;
    }

    setIsDeletingCommentId(commentId);

    try {
      const accessToken = await getValidAccessToken();

      await clientsApi.deleteProjectComment(accessToken, commentId);
      setComments((previous) =>
        previous.filter((comment) => String(comment.id) !== commentId),
      );
    } finally {
      setIsDeletingCommentId(null);
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      refreshFormatState();
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          {selectedTask ? (
            <button
              className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-[#111827]"
              type="button"
              onClick={() => {
                setSelectedTaskId(null);
              }}
            >
              <ArrowLeft size={14} />
              {projectName || "-"}
            </button>
          ) : null}
          <h2 className="text-lg font-semibold leading-none text-[#111827]">
            {selectedTask?.name || projectName || "-"}
          </h2>
          <div className="mt-2 flex items-center gap-2 text-sm text-[#6B7280]">
            <MapPin className="text-[#022279]" size={14} />
            <span>{subtitle}</span>
          </div>
        </div>
        {onClose ? (
          <Button
            isIconOnly
            aria-label="Close task details"
            radius="full"
            size="sm"
            variant="light"
            onPress={onClose}
          >
            <X size={20} />
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl bg-[#F3F6FA] p-4">
        {selectedTask ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <CircleUserRound className="text-[#022279]" size={16} />
                <span>Assignee</span>
                {users.length > 0 ? (
                  <Select
                    aria-label="Task assignee"
                    className="ml-auto max-w-[220px]"
                    isDisabled={isSavingTaskDueDate}
                    selectedKeys={taskAssigneeId ? [taskAssigneeId] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const nextValue = Array.from(keys as Set<string>)[0];

                      if (!nextValue) {
                        return;
                      }

                      setTaskAssigneeId(nextValue);
                    }}
                  >
                    {users.map((user) => (
                      <SelectItem key={user.id}>{user.name}</SelectItem>
                    ))}
                  </Select>
                ) : (
                  <div className="ml-auto flex items-center gap-1 font-semibold text-[#111827]">
                    <Avatar
                      className="h-5 w-5"
                      name={selectedTask.assigneeName || "-"}
                      size="sm"
                      src={selectedTask.assigneeAvatar}
                    />
                    <span>{selectedTask.assigneeName || "-"}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-[#6B7280]">
                <LocateIcon className="text-[#022279]" size={16} />
                <span>Status</span>
                <Select
                  aria-label="Task status"
                  className="ml-auto max-w-[160px]"
                  isDisabled={isSavingTaskDueDate}
                  selectedKeys={taskStatus ? [taskStatus] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const first =
                      Array.from(keys as Set<string>)[0] ??
                      TASK_STATUS_OPTIONS[0];

                    setTaskStatus(first);
                  }}
                >
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option}>{option}</SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Calendar className="text-[#022279]" size={16} />
                <span>Due Date</span>
                <DatePicker
                  aria-label="Task due date"
                  className="ml-auto max-w-[150px]"
                  isDisabled={isSavingTaskDueDate}
                  size="sm"
                  value={taskDueDate}
                  onChange={(value) => {
                    if (value) {
                      setTaskDueDate(value);
                    }
                  }}
                />
              </div>
              {selectedTaskBlockedTask ? (
                <div className="flex items-center gap-2 text-[#6B7280]">
                  <List className="text-[#022279]" size={16} />
                  <span>Blocked Task</span>
                  <span className="ml-auto max-w-[260px] truncate font-semibold text-[#111827]">
                    {selectedTaskBlockedTask.name}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="col-span-2 flex justify-end">
              <Button
                className="bg-[#022279] text-white"
                isDisabled={!canSaveSelectedTaskChanges}
                isLoading={isSavingTaskDueDate}
                size="sm"
                onPress={async () => {
                  if (!selectedTask || !canSaveSelectedTaskChanges) {
                    return;
                  }

                  setIsSavingTaskDueDate(true);

                  try {
                    const taskPatch = {
                      ...(hasSelectedTaskAssigneeChange
                        ? { assigneeId: taskAssigneeId }
                        : {}),
                      ...(hasSelectedTaskDueDateChange
                        ? { dueDate: calendarDateToIso(taskDueDate) }
                        : {}),
                      ...(hasSelectedTaskStatusChange
                        ? { status: taskStatus }
                        : {}),
                    };

                    if (onTaskChange) {
                      await onTaskChange(selectedTask.id, taskPatch);
                    } else if (hasSelectedTaskDueDateChange) {
                      await onTaskDueDateChange?.(
                        selectedTask.id,
                        calendarDateToIso(taskDueDate),
                      );
                    }

                    setTaskOverridesById((current) => ({
                      ...current,
                      [selectedTask.id]: {
                        ...(current[selectedTask.id] ?? {}),
                        ...taskPatch,
                        ...(hasSelectedTaskAssigneeChange
                          ? {
                              assigneeAvatar:
                                users.find((user) => user.id === taskAssigneeId)
                                  ?.avatar ?? undefined,
                              assigneeName:
                                users.find((user) => user.id === taskAssigneeId)
                                  ?.name ?? selectedTask.assigneeName,
                            }
                          : {}),
                      },
                    }));

                    bumpActivity();
                    toast.success("Task updated.");
                  } catch (error) {
                    setTaskDueDate(
                      toCalendarDate(selectedTask.dueDate) ?? todayDate,
                    );
                    setTaskAssigneeId(selectedTask.assigneeId ?? "");
                    setTaskStatus(
                      normalizeTaskStatus(
                        selectedTask.status ?? TASK_STATUS_OPTIONS[0],
                      ),
                    );
                    toast.danger("Failed to update task", {
                      description:
                        error instanceof Error
                          ? error.message
                          : "Please try again.",
                    });
                  } finally {
                    setIsSavingTaskDueDate(false);
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <CircleUserRound className="text-[#022279]" size={16} />
                <span>CSM</span>
                {users.length > 0 ? (
                  <Select
                    aria-label="Select CSM"
                    className="ml-auto max-w-[220px]"
                    selectedKeys={activeCsmId ? [activeCsmId] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const nextValue = Array.from(keys as Set<string>)[0];

                      if (!nextValue) {
                        return;
                      }

                      setActiveCsmId(nextValue);
                    }}
                  >
                    {users.map((user) => (
                      <SelectItem key={user.id}>{user.name}</SelectItem>
                    ))}
                  </Select>
                ) : (
                  <div className="ml-auto flex items-center gap-1 font-semibold text-[#111827]">
                    <Avatar
                      className="h-5 w-5"
                      name={csmName || "-"}
                      size="sm"
                      src={csmAvatar}
                    />
                    <span>{csmName || "-"}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-[#6B7280]">
                <CircleUserRound className="text-[#022279]" size={16} />
                <span>Account Manager</span>
                {users.length > 0 ? (
                  <Select
                    aria-label="Select account manager"
                    className="ml-auto max-w-[220px]"
                    selectedKeys={
                      activeAccountManagerId ? [activeAccountManagerId] : []
                    }
                    size="sm"
                    onSelectionChange={(keys) => {
                      const nextValue = Array.from(keys as Set<string>)[0];

                      if (!nextValue) {
                        return;
                      }

                      setActiveAccountManagerId(nextValue);
                    }}
                  >
                    {users.map((user) => (
                      <SelectItem key={user.id}>{user.name}</SelectItem>
                    ))}
                  </Select>
                ) : (
                  <div className="ml-auto flex items-center gap-1 font-semibold text-[#111827]">
                    <Avatar
                      className="h-5 w-5"
                      name={accountManagerName || "-"}
                      size="sm"
                      src={accountManagerAvatar}
                    />
                    <span>{accountManagerName || "-"}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-[#6B7280]">
                <LocateIcon className="text-[#022279]" size={16} />
                <span>Status</span>
                <Select
                  aria-label="Select status"
                  className="ml-auto max-w-[160px]"
                  selectedKeys={activeStatus ? [activeStatus] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const first =
                      Array.from(keys as Set<string>)[0] ??
                      projectStatusOptions[0] ??
                      defaultProjectStatusOptions[0];

                    setActiveStatus(normalizeProjectStatus(first));
                  }}
                >
                  {projectStatusOptions.map((option) => (
                    <SelectItem key={option}>{option}</SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Calendar className="text-[#022279]" size={16} />
                <span>Start Date</span>
                <DatePicker
                  isReadOnly
                  aria-label="Select start date"
                  className="ml-auto max-w-[160px]"
                  minValue={todayDate}
                  size="sm"
                  value={startDate}
                />
              </div>
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Calendar className="text-[#022279]" size={16} />
                <span>Due Date</span>
                <DatePicker
                  isReadOnly
                  aria-label="Select due date"
                  className="ml-auto max-w-[160px]"
                  minValue={startDate}
                  size="sm"
                  value={dueDate}
                />
              </div>
            </div>
          </div>
        )}
        {!selectedTask ? (
          <div className="mt-4 flex justify-end">
            <Button
              className="bg-[#022279] text-white"
              isDisabled={!hasMetaChanges}
              isLoading={isSavingProjectMeta}
              size="sm"
              onPress={async () => {
                if (!onProjectMetaChange || !hasMetaChanges) {
                  return;
                }

                setIsSavingProjectMeta(true);

                try {
                  await onProjectMetaChange({
                    accountManagerId: activeAccountManagerId,
                    csmId: activeCsmId,
                    dueDate: calendarDateToIso(dueDate),
                    startDate: calendarDateToIso(startDate),
                    status: activeStatus,
                  });
                  toast.success("Project changes saved successfully.");
                } catch (error) {
                  toast.danger("Failed to save project changes", {
                    description:
                      error instanceof Error
                        ? error.message
                        : "Please try again.",
                  });
                } finally {
                  setIsSavingProjectMeta(false);
                }
              }}
            >
              Save
            </Button>
          </div>
        ) : null}
      </div>

      <Accordion
        className="space-y-5"
        defaultExpandedKeys={[
          "description",
          selectedTask ? "subtasks" : "task",
          "checklists",
          "attachments",
          "activity",
        ]}
        itemClasses={{
          base: "border-0 rounded-none shadow-none px-0 pb-4 last:pb-0",
          content: "pt-4 pb-0 px-0",
          heading: "px-0",
          title: "text-lg font-semibold text-[#111827]",
          trigger:
            "px-0 py-0 min-h-0 h-auto border-b border-default-200 pb-2 data-[hover=true]:bg-transparent",
        }}
        selectionMode="multiple"
        variant="splitted"
      >
        <AccordionItem
          key="description"
          aria-label="Description"
          title="Description"
        >
          {selectedTask ? (
            <div className="space-y-3">
              <RichTextEditor
                placeholder="Add a description for this task…"
                taskId={selectedTask.id}
                value={selectedTaskDescriptionValue}
                onChange={(json) => {
                  setDescriptionDraft(json);
                  setDescriptionDirty(true);
                }}
                onFetchUrlPreview={async (url) => {
                  const accessToken = await getValidAccessToken();

                  return clientsApi.getUrlPreview(accessToken, url);
                }}
                onUploadError={(message) => {
                  toast.danger("Image upload failed", {
                    description: message,
                  });
                }}
                onUploadImage={async (file) => {
                  const accessToken = await getValidAccessToken();
                  const attachment = await clientsApi.uploadTaskAttachment(
                    accessToken,
                    selectedTask.id,
                    file,
                  );

                  return {
                    url:
                      resolveServerAssetUrl(attachment.url) ?? attachment.url,
                  };
                }}
                onUploadStateChange={setIsUploadingDescriptionImage}
              />
              <div className="flex items-center justify-end gap-2">
                {isUploadingDescriptionImage ? (
                  <span className="text-xs text-default-500">Uploading…</span>
                ) : null}
                {descriptionDirty ? (
                  <Button
                    isDisabled={isSavingDescription}
                    radius="sm"
                    size="sm"
                    variant="light"
                    onPress={() => {
                      setDescriptionDirty(false);
                      setDescriptionDraft(null);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
                <Button
                  className="bg-[#022279] text-white"
                  isDisabled={
                    !descriptionDirty || isUploadingDescriptionImage
                  }
                  isLoading={isSavingDescription}
                  radius="sm"
                  size="sm"
                  onPress={() => {
                    void handleSaveTaskDescription();
                  }}
                >
                  Save description
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <RichTextEditor
                placeholder="Describe this project…"
                value={projectDescriptionValue}
                onChange={(json) => {
                  setProjectDescriptionDraft(json);
                  setProjectDescriptionDirty(true);
                }}
                onFetchUrlPreview={async (url) => {
                  const accessToken = await getValidAccessToken();
                  return clientsApi.getUrlPreview(accessToken, url);
                }}
                onUploadError={(message) =>
                  toast.danger("Image upload failed", { description: message })
                }
                onUploadStateChange={setIsUploadingProjectDescriptionImage}
              />
              <div className="flex items-center justify-end gap-2">
                {isUploadingProjectDescriptionImage ? (
                  <span className="text-xs text-default-500">Uploading…</span>
                ) : null}
                {projectDescriptionDirty ? (
                  <Button
                    isDisabled={isSavingProjectDescription}
                    radius="sm"
                    size="sm"
                    variant="light"
                    onPress={() => {
                      setProjectDescriptionDirty(false);
                      setProjectDescriptionDraft(null);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
                <Button
                  className="bg-[#022279] text-white"
                  isDisabled={
                    !projectDescriptionDirty ||
                    isUploadingProjectDescriptionImage
                  }
                  isLoading={isSavingProjectDescription}
                  radius="sm"
                  size="sm"
                  onPress={() => {
                    void handleSaveProjectDescription();
                  }}
                >
                  Save description
                </Button>
              </div>
            </div>
          )}
        </AccordionItem>

        <AccordionItem
          key={selectedTask ? "subtasks" : "task"}
          aria-label={selectedTask ? "Subtasks" : "Task"}
          title={selectedTask ? "Subtasks" : "Task"}
        >
          <div className="overflow-hidden rounded-lg border border-default-200 bg-white">
            {displayedTasks.map(({ depth, isSubtask, task }) => (
                <div
                  key={task.id}
                  className="grid min-h-[54px] grid-cols-[minmax(300px,1fr)_88px_170px_120px] items-center border-b border-default-200 text-sm last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3 px-3 py-2">
                    <div
                      className="flex min-w-0 items-center gap-2"
                      style={{ paddingLeft: `${depth * 18}px` }}
                    >
                    {parentTaskIds.has(task.id) ? (
                      <button
                        className="rounded p-0.5 text-[#6B7280] hover:bg-default-100"
                        type="button"
                        onClick={() => {
                          setExpandedTaskIds((current) => {
                            const next = new Set(current);

                            if (next.has(task.id)) {
                              next.delete(task.id);
                            } else {
                              next.add(task.id);
                            }

                            return next;
                          });
                        }}
                      >
                        {expandedTaskIds.has(task.id) ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                    ) : (
                      <span className="inline-block w-[18px] flex-none" />
                    )}
                    <span
                      className={`h-8 w-1 flex-none rounded-full ${
                        isSubtask ? "bg-[#10B981]" : "bg-[#60A5FA]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <button
                        className="block max-w-full truncate text-left text-sm font-semibold text-[#111827]"
                        type="button"
                        onClick={() => {
                          setSelectedTaskId(task.id);
                        }}
                      >
                        {task.name}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="border-l border-default-100 px-2 py-2">
                  <TaskStatusChip status={task.status} />
                </div>
                <div className="flex min-w-0 items-center gap-2 border-l border-default-100 px-2 py-2 text-xs text-[#6B7280]">
                  <Avatar
                    className="h-5 w-5 flex-none"
                    name={task.assigneeName || "-"}
                    size="sm"
                    src={task.assigneeAvatar}
                  />
                  <span className="truncate">{task.assigneeName || "-"}</span>
                </div>
                <div className="border-l border-default-100 px-2 py-2 text-xs font-semibold text-[#DC2626]">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={13} />
                    {toFriendlyDate(task.dueDate)}
                  </span>
                </div>
              </div>
            ))}
            {!selectedTask && !hasTaskHierarchy && displayedTasks.length > 0 ? (
              <p className="text-xs text-[#9CA3AF] m-3">
                No saved subtask hierarchy found for this project yet.
              </p>
            ) : null}
            {displayedTasks.length === 0 ? (
              <p className="text-sm text-[#6B7280] m-3">
                {selectedTask
                  ? "No subtasks for this task yet."
                  : "No tasks for this project yet."}
              </p>
            ) : null}
          </div>
        </AccordionItem>

        {selectedTask ? (
          <AccordionItem
            key="checklists"
            aria-label="Checklists"
            title="Checklists"
          >
            <TaskPanelChecklists taskId={selectedTask.id} />
          </AccordionItem>
        ) : null}

        {selectedTask ? (
          <AccordionItem
            key="attachments"
            aria-label="Attachments"
            title="Attachments"
          >
            <TaskPanelAttachments taskId={selectedTask.id} />
          </AccordionItem>
        ) : null}

        {selectedTask ? (
          <AccordionItem key="activity" aria-label="Activity" title="Activity">
            <TaskActivityFeed taskId={selectedTask.id} />
          </AccordionItem>
        ) : null}
      </Accordion>

      <Modal
        isOpen={previewAttachment !== null}
        size="3xl"
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachment(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader>
            {previewAttachment?.name ?? "Image preview"}
          </ModalHeader>
          <ModalBody className="pb-6">
            {previewAttachment ? (
              <div className="relative h-[70vh] w-full">
                <Image
                  fill
                  unoptimized
                  alt={previewAttachment.name}
                  className="rounded-md object-contain"
                  src={previewAttachment.url}
                />
              </div>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
};
