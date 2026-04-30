"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { DatePicker } from "@heroui/date-picker";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import {
  Calendar,
  CircleUserRound,
  Image as ImageIcon,
  List,
  MapPin,
  Paperclip,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";

import { clientsApi, TaskComment } from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { useAppToast } from "@/hooks/use-app-toast";
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
import { normalizeTaskStatus } from "@/lib/task-statuses";

type SubtaskRow = {
  assignee: {
    avatar?: string;
    name: string;
  };
  dueDate: string;
  id: string;
  status: string;
  taskName: string;
};

interface ViewTaskModalProps {
  clientAddress: string;
  clientName: string;
  isOpen: boolean;
  onTaskSaved?: (taskId: string) => void | Promise<void>;
  onOpenChange: (isOpen: boolean) => void;
  projectOptions: Array<{ id: string; label: string }>;
  statusOptions: string[];
  subtasks: SubtaskRow[];
  task: {
    assigneeId: string;
    assigneeName: string;
    comment: string;
    description: string;
    dueDate: string;
    id: string;
    projectId: string;
    startDate: string;
    status: string;
    taskName: string;
  } | null;
  users: Array<{ avatar?: string; id: string; name: string }>;
}

const toCalendarDate = (value?: string) => {
  if (!value || value === "-") {
    return null;
  }

  const normalized = value.includes("T") ? value.slice(0, 10) : value;

  try {
    return parseDate(normalized);
  } catch {
    return null;
  }
};

const toFriendlyDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value.includes("T") ? value.slice(0, 10) : value;
  }

  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

const getCaretCharacterOffset = (element: HTMLElement) => {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();

  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
};

const extractSelectedLines = (range: Range) => {
  const fragment = range.cloneContents();
  const container = document.createElement("div");

  container.appendChild(fragment);

  let buffer = "";

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      buffer += node.textContent ?? "";

      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    const blockTags = new Set(["div", "p", "li", "ul", "ol"]);

    if (tagName === "br") {
      buffer += "\n";

      return;
    }

    Array.from(element.childNodes).forEach((childNode) => {
      walk(childNode);
    });

    if (blockTags.has(tagName)) {
      buffer += "\n";
    }
  };

  Array.from(container.childNodes).forEach((childNode) => {
    walk(childNode);
  });

  return buffer
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const sanitizeCommentHtml = (html: string) => {
  if (typeof window === "undefined" || !html) {
    return "";
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(html, "text/html");
  const blockedTags = ["script", "style", "iframe", "object", "embed"];

  blockedTags.forEach((tagName) => {
    documentNode.querySelectorAll(tagName).forEach((node) => {
      node.remove();
    });
  });

  documentNode.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim().toLowerCase();

      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);

        return;
      }

      if (
        (attributeName === "href" || attributeName === "src") &&
        attributeValue.startsWith("javascript:")
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return documentNode.body.innerHTML;
};

const formatCommentAuthor = (comment: TaskComment) => {
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

  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const ViewTaskModal = ({
  clientAddress,
  clientName,
  isOpen,
  onTaskSaved,
  onOpenChange,
  projectOptions,
  statusOptions,
  subtasks,
  task,
  users,
}: ViewTaskModalProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const commentEditorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [caretPosition, setCaretPosition] = useState(0);
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<TaskComment[]>([]);
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
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    strikeThrough: false,
    underline: false,
  });
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<string | null>(
    null,
  );
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [localStatus, setLocalStatus] = useState("To Do");
  const [localAssigneeId, setLocalAssigneeId] = useState("");
  const todayDate = today(getLocalTimeZone());
  const [localStartDate, setLocalStartDate] = useState(todayDate);
  const [localDueDate, setLocalDueDate] = useState(todayDate);
  const lastInitializedTaskKeyRef = useRef<string>("");

  useEffect(() => {
    if (!isOpen || !task) {
      lastInitializedTaskKeyRef.current = "";

      return;
    }

    const taskSnapshotKey = [
      task.id,
      task.assigneeId ?? "",
      task.startDate ?? "",
      task.dueDate ?? "",
      task.status ?? "",
    ].join("|");

    if (lastInitializedTaskKeyRef.current === taskSnapshotKey) {
      return;
    }

    lastInitializedTaskKeyRef.current = taskSnapshotKey;

    const nextStartDate = toCalendarDate(task.startDate) ?? todayDate;
    const nextDueDate = toCalendarDate(task.dueDate) ?? nextStartDate;

    setCommentInput("");
    setLocalStatus(normalizeTaskStatus(task.status));
    setLocalAssigneeId(task.assigneeId || "");
    setLocalStartDate(nextStartDate);
    setLocalDueDate(nextDueDate);
    if (commentEditorRef.current) {
      commentEditorRef.current.innerHTML = "";
    }
    setPendingAttachments([]);
  }, [
    isOpen,
    task?.id,
    task?.assigneeId,
    task?.dueDate,
    task?.startDate,
    task?.status,
  ]);

  useEffect(() => {
    if (!isOpen || !task?.id || !session?.accessToken) {
      setComments([]);

      return;
    }

    let isMounted = true;

    setIsCommentsLoading(true);

    const loadComments = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const response = await clientsApi.getTaskComments(accessToken, task.id);

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
  }, [getValidAccessToken, isOpen, session?.accessToken, task?.id]);

  const selectedProjectLabel = useMemo(() => {
    if (!task?.projectId) {
      return "-";
    }

    return (
      projectOptions.find((project) => project.id === task.projectId)?.label ||
      "-"
    );
  }, [projectOptions, task?.projectId]);

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

  const closePanel = () => {
    if (isSavingTask || isSendingComment) {
      return;
    }

    onOpenChange(false);
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

    if (!editor || !selection || selection.rangeCount === 0) {
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

    if (!activeMention || !editor) {
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

  const handleSaveTask = async () => {
    if (!task?.id) {
      return;
    }

    if (!session?.accessToken) {
      toast.danger("Session expired", {
        description: "Please login again before updating this task.",
      });

      return;
    }

    setIsSavingTask(true);

    try {
      const accessToken = await getValidAccessToken();

      await clientsApi.updateProjectTask(accessToken, task.id, {
        assigneeId: localAssigneeId || undefined,
        dueDate: String(localDueDate),
        startDate: String(localStartDate),
        status: localStatus,
      });

      if (onTaskSaved) {
        await onTaskSaved(String(task.id));
      }

      toast.success("Task updated successfully.");
    } catch (error) {
      toast.danger("Failed to update task", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleAddComment = async () => {
    const editorHtml = commentEditorRef.current?.innerHTML?.trim() ?? "";
    const message = buildCommentMessage({
      editorHtml,
      pendingAttachments,
      plainText: commentInput,
    });

    if (!session?.accessToken || !task?.id || !message || isSendingComment) {
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
      const createdComment = await clientsApi.createTaskComment(
        accessToken,
        task.id,
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

  const handleDeleteComment = async (commentId: string) => {
    if (!session?.accessToken || !commentId || isDeletingCommentId) {
      return;
    }

    setIsDeletingCommentId(commentId);

    try {
      const accessToken = await getValidAccessToken();

      await clientsApi.deleteTaskComment(accessToken, commentId);
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
    <Drawer
      hideCloseButton
      isDismissable={false}
      isOpen={isOpen}
      placement="right"
      scrollBehavior="inside"
      size="3xl"
      onOpenChange={onOpenChange}
    >
      <DrawerContent className="h-screen max-h-screen rounded-none">
        <DrawerHeader className="flex items-start justify-between border-b border-default-200 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-[#111827]">
              {selectedProjectLabel || "Project"}
            </p>
            <h2 className="text-lg font-semibold text-[#111827]">
              {task?.taskName || "Task"}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-[#6B7280]">
              <MapPin className="text-[#022279]" size={14} />
              <span>{clientName || "-"}</span>
              <span>|</span>
              <span>{clientAddress || "-"}</span>
            </div>
          </div>
          <Button
            isIconOnly
            radius="full"
            size="sm"
            variant="light"
            onPress={closePanel}
          >
            <X size={20} />
          </Button>
        </DrawerHeader>

        <DrawerBody className="space-y-4 px-5 pb-5 pt-4">
          <div className="rounded-xl bg-[#F3F6FA] p-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <CircleUserRound className="text-[#022279]" size={16} />
                <span>Assignee</span>
                <Select
                  aria-label="Select assignee"
                  className="ml-auto max-w-[220px]"
                  selectedKeys={localAssigneeId ? [localAssigneeId] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const first = Array.from(keys as Set<string>)[0] ?? "";

                    setLocalAssigneeId(first);
                  }}
                >
                  {users.map((user) => (
                    <SelectItem key={user.id}>{user.name}</SelectItem>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Calendar className="text-[#022279]" size={16} />
                <span>Start Date</span>
                <DatePicker
                  aria-label="Select start date"
                  className="ml-auto max-w-[160px]"
                  minValue={todayDate}
                  size="sm"
                  value={localStartDate}
                  onChange={(value) => {
                    if (!value) {
                      return;
                    }

                    setLocalStartDate(value);

                    if (localDueDate.compare(value) < 0) {
                      setLocalDueDate(value);
                    }
                  }}
                />
              </div>

              <div className="flex items-center gap-2 text-[#6B7280]">
                <CircleUserRound className="text-[#022279]" size={16} />
                <span>Status</span>
                <Select
                  aria-label="Select status"
                  className="ml-auto max-w-[220px]"
                  selectedKeys={localStatus ? [localStatus] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const first = Array.from(keys as Set<string>)[0] ?? "To Do";

                    setLocalStatus(first);
                  }}
                >
                  {statusOptions.map((status) => (
                    <SelectItem key={status}>{status}</SelectItem>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2 text-[#6B7280]">
                <Calendar className="text-[#022279]" size={16} />
                <span>Due Date</span>
                <DatePicker
                  aria-label="Select due date"
                  className="ml-auto max-w-[160px]"
                  minValue={localStartDate}
                  size="sm"
                  value={localDueDate}
                  onChange={(value) => {
                    if (!value) {
                      return;
                    }

                    setLocalDueDate(value);
                  }}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                className="bg-[#022279] text-white"
                isLoading={isSavingTask}
                size="sm"
                onPress={() => {
                  void handleSaveTask();
                }}
              >
                Save
              </Button>
            </div>
          </div>

          <Accordion
            defaultExpandedKeys={["description", "subtasks", "comment"]}
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
              <p className="text-base leading-7 text-[#4B5563]">
                {task?.description?.trim() || "No description provided."}
              </p>
            </AccordionItem>

            <AccordionItem
              key="subtasks"
              aria-label="Subtasks"
              title="Subtasks"
            >
              <div className="space-y-3">
                {subtasks.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">
                    No subtasks for this task yet.
                  </p>
                ) : (
                  subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center justify-between text-sm text-[#111827]"
                    >
                      <div className="flex items-center gap-3">
                        <Chip
                          className="bg-[#E5E7EB] text-[#1F2937]"
                          radius="full"
                          size="sm"
                          variant="flat"
                        >
                          {normalizeTaskStatus(subtask.status)}
                        </Chip>
                        <span className="font-medium">{subtask.taskName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <CircleUserRound size={14} />
                        <Avatar
                          className="h-5 w-5"
                          name={subtask.assignee.name || "-"}
                          size="sm"
                          src={subtask.assignee.avatar}
                        />
                        <span>{subtask.assignee.name || "-"}</span>
                        <Calendar size={14} />
                        <span>{toFriendlyDate(subtask.dueDate)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AccordionItem>

            <AccordionItem key="comment" aria-label="Comment" title="Comment">
              <div className="space-y-4">
                {isCommentsLoading ? (
                  <p className="text-sm text-[#6B7280]">Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">No comments yet.</p>
                ) : (
                  comments.map((comment) => {
                    const parsedComment = parseCommentAttachments(
                      comment.comment,
                    );
                    const isOwnComment =
                      String(comment.createdBy ?? "") ===
                      String(session?.user?.id ?? "");

                    return (
                      <div
                        key={String(comment.id)}
                        className="space-y-2 border-b border-default-200 pb-3"
                      >
                        {parsedComment.richHtml ? (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: sanitizeCommentHtml(
                                parsedComment.richHtml,
                              ),
                            }}
                            className="text-base leading-7 text-[#374151] [&_a]:text-[#2563EB] [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc"
                          />
                        ) : (
                          <p className="whitespace-pre-line text-base leading-7 text-[#374151]">
                            {renderCommentWithMentions(parsedComment.body)}
                          </p>
                        )}
                        {parsedComment.attachments.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {parsedComment.attachments.map(
                              (attachment, index) => (
                                <button
                                  key={`${attachment.id ?? attachment.name}-${index}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-default-100 px-2 py-1 text-xs text-[#111827]"
                                  type="button"
                                  onClick={() => {
                                    handleOpenAttachment(attachment);
                                  }}
                                >
                                  {attachment.name}
                                </button>
                              ),
                            )}
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between gap-2 text-sm text-[#6B7280]">
                          <div className="flex items-center gap-2">
                            <Avatar
                              showFallback
                              className="h-5 w-5"
                              fallback={
                                <span className="text-[10px] font-semibold text-[#111827]">
                                  {getInitials(formatCommentAuthor(comment))}
                                </span>
                              }
                              name={formatCommentAuthor(comment)}
                              size="sm"
                              src={comment.author?.avatar ?? undefined}
                            />
                            <span className="font-medium">
                              {formatCommentAuthor(comment)}
                            </span>
                            <span>•</span>
                            <span>{formatCommentTime(comment.createdAt)}</span>
                          </div>
                          {isOwnComment ? (
                            <Button
                              isIconOnly
                              className="text-danger"
                              isLoading={
                                isDeletingCommentId === String(comment.id)
                              }
                              radius="full"
                              size="sm"
                              variant="light"
                              onPress={() => {
                                void handleDeleteComment(String(comment.id));
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-3 overflow-visible rounded-xl border border-default-200">
                <div className="relative">
                  <div
                    ref={commentEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-14 w-full whitespace-pre-wrap px-3 py-2 text-sm text-[#111827] outline-none [&_li]:list-item [&_ul]:list-disc [&_ul]:pl-5"
                    role="textbox"
                    tabIndex={0}
                    onInput={(event) => {
                      setCommentInput(event.currentTarget.innerText || "");
                      setCaretPosition(
                        getCaretCharacterOffset(event.currentTarget),
                      );
                      refreshFormatState();
                    }}
                    onKeyUp={(event) => {
                      setCaretPosition(
                        getCaretCharacterOffset(event.currentTarget),
                      );
                      refreshFormatState();
                    }}
                    onMouseUp={(event) => {
                      setCaretPosition(
                        getCaretCharacterOffset(event.currentTarget),
                      );
                      refreshFormatState();
                    }}
                  />
                  {!commentInput.trim() ? (
                    <span className="pointer-events-none absolute left-3 top-2 text-sm text-[#9CA3AF]">
                      Write a comment... Use @ to mention
                    </span>
                  ) : null}
                  {mentionOptions.length > 0 ? (
                    <div className="absolute left-3 top-[calc(100%-6px)] z-10 w-[280px] overflow-hidden rounded-md border border-default-200 bg-white shadow-md">
                      {mentionOptions.map((user) => (
                        <button
                          key={user.id}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#111827] hover:bg-default-100"
                          type="button"
                          onClick={() => {
                            handleInsertMention(user.name);
                          }}
                        >
                          <Avatar
                            className="h-5 w-5"
                            name={user.name}
                            size="sm"
                            src={user.avatar ?? undefined}
                          />
                          <span>{user.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {pendingAttachments.length > 0 ? (
                  <div className="border-t border-default-200 px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {pendingAttachments.map((attachment, index) => (
                        <button
                          key={`${attachment.name}-${index}`}
                          className="inline-flex items-center gap-1 rounded-full bg-default-100 px-2 py-1 text-xs text-[#111827]"
                          type="button"
                          onClick={() => {
                            handleRemovePendingAttachment(index);
                          }}
                        >
                          {attachment.isImage && attachment.previewUrl ? (
                            <Avatar
                              className="h-5 w-5"
                              name={attachment.name}
                              size="sm"
                              src={attachment.previewUrl}
                            />
                          ) : null}
                          {attachment.name}
                          <X size={12} />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-default-200 bg-white px-3 py-2">
                  <div className="flex items-center gap-1 text-[#6B7280]">
                    <Button
                      isIconOnly
                      className={
                        formatState.bold ? "bg-default-100 text-[#111827]" : ""
                      }
                      radius="sm"
                      size="sm"
                      variant="light"
                      onPress={() => {
                        applyEditorCommand("bold");
                      }}
                    >
                      <span className="font-semibold">B</span>
                    </Button>
                    <Button
                      isIconOnly
                      className={
                        formatState.italic
                          ? "bg-default-100 text-[#111827]"
                          : ""
                      }
                      radius="sm"
                      size="sm"
                      variant="light"
                      onPress={() => {
                        applyEditorCommand("italic");
                      }}
                    >
                      <span className="italic">I</span>
                    </Button>
                    <Button
                      isIconOnly
                      className={
                        formatState.underline
                          ? "bg-default-100 text-[#111827]"
                          : ""
                      }
                      radius="sm"
                      size="sm"
                      variant="light"
                      onPress={() => {
                        applyEditorCommand("underline");
                      }}
                    >
                      <span className="underline">U</span>
                    </Button>
                    <Button
                      isIconOnly
                      className={
                        formatState.strikeThrough
                          ? "bg-default-100 text-[#111827]"
                          : ""
                      }
                      radius="sm"
                      size="sm"
                      variant="light"
                      onPress={() => {
                        applyEditorCommand("strikeThrough");
                      }}
                    >
                      <span className="line-through">S</span>
                    </Button>
                    <Button
                      isIconOnly
                      radius="sm"
                      size="sm"
                      variant="light"
                      onPress={() => {
                        applyListFromSelection();
                      }}
                    >
                      <List size={16} />
                    </Button>
                    <Button
                      isIconOnly
                      radius="sm"
                      size="sm"
                      variant="light"
                      onPress={() => {
                        attachmentInputRef.current?.click();
                      }}
                    >
                      <Paperclip size={16} />
                    </Button>
                    <Button
                      isIconOnly
                      radius="sm"
                      size="sm"
                      variant="light"
                      onPress={() => {
                        imageInputRef.current?.click();
                      }}
                    >
                      <ImageIcon size={16} />
                    </Button>
                  </div>
                  <Button
                    className="bg-[#022279] text-white"
                    isDisabled={!task?.id || !commentInput.trim()}
                    isLoading={isSendingComment}
                    size="sm"
                    onPress={() => {
                      void handleAddComment();
                    }}
                  >
                    <SendHorizontal size={14} />
                    Send
                  </Button>
                </div>
                <input
                  ref={attachmentInputRef}
                  multiple
                  className="hidden"
                  type="file"
                  onChange={(event) => {
                    void handleAddPendingFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
                <input
                  ref={imageInputRef}
                  multiple
                  accept="image/*"
                  className="hidden"
                  type="file"
                  onChange={(event) => {
                    void handleAddPendingFiles(event.target.files, {
                      imageOnly: true,
                    });
                    event.target.value = "";
                  }}
                />
              </div>
            </AccordionItem>
          </Accordion>
        </DrawerBody>
      </DrawerContent>

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
    </Drawer>
  );
};
