"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Textarea } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import {
  Image as ImageIcon,
  Columns3,
  EllipsisVertical,
  List,
  MapPin,
  Paperclip,
  ListOrdered,
  Plus,
  SendHorizontal,
  SlidersHorizontal,
  Trash2,
  UserCircle,
  X,
  Zap,
  Siren,
} from "lucide-react";

import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import {
  clientsApi,
  type ClientGbpPosting,
  type ClientGbpPostingComment,
} from "@/apis/clients";
import { usersApi, type UserListItem } from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";
import { AddGbpPostingKeywordsModal } from "@/components/dashboard/client-details/add-gbp-posting-keywords-modal";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  buildCommentMessage,
  buildPendingAttachmentsFromFileList,
  MAX_COMMENT_ATTACHMENT_BYTES,
  MAX_COMMENT_ATTACHMENTS,
  MAX_COMMENT_ATTACHMENTS_TOTAL_BYTES,
  MAX_COMMENT_PAYLOAD_BYTES,
  parseCommentAttachments,
  type ParsedCommentAttachment,
  type PendingAttachmentItem,
  validateCommentPayloadSize,
} from "@/lib/comment-attachments";

type GbpPostingRow = {
  action: string;
  assigneeId: string | null;
  assigneeAvatar: string | undefined;
  assigneeName: string;
  buttonType: string | null;
  datePublished: string;
  description: string;
  id: string;
  images: string[];
  keyword: string;
  lastDateUpdated: string;
  liveLink: string;
  status: string;
  type: string;
  isSelected: boolean;
};

const typeChipClass = "bg-[#B9EFFF] text-[#0284C7]";
const statusChipClass = "bg-[#B9EFFF] text-[#0284C7]";
const BUTTON_OPTIONS = [
  "Learn more",
  "Book",
  "Order Online",
  "Buy",
  "Sign Up",
  "Call Now",
  "View Offer",
];
const POST_TYPE_OPTIONS = ["Update", "Offer", "Event"];
const STATUS_OPTIONS = [
  "Draft",
  "Client Review",
  "Scheduled",
  "Published",
  "Rejected",
  "Completed",
];
const DESCRIPTION_MAX_LENGTH = 1500;
const MAX_POST_IMAGE_BYTES = 3 * 1024 * 1024;

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const resolveServerAssetUrl = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  const normalizedPath = value.replace(/^\/+/, "");

  return baseUrl ? `${baseUrl}/${normalizedPath}` : value;
};

const mapPostingToRow = (posting: ClientGbpPosting): GbpPostingRow => ({
  action: "",
  assigneeId: posting.assigneeId ? String(posting.assigneeId) : null,
  assigneeAvatar: resolveServerAssetUrl(posting.assignee?.avatar),
  assigneeName: posting.assignee?.name ?? "-",
  buttonType: posting.buttonType,
  datePublished: formatDateTime(posting.publishedAt),
  description: posting.description ?? posting.postContent ?? "-",
  id: String(posting.id),
  images: posting.images,
  isSelected: false,
  keyword: posting.keyword,
  lastDateUpdated: formatDateTime(posting.updatedAt),
  liveLink: posting.liveLink ?? "",
  status: posting.status,
  type: posting.contentType,
});

const getUserName = (user: UserListItem) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });

const formatCommentAuthor = (comment: ClientGbpPostingComment) => {
  if (!comment.author) {
    return "Unknown";
  }
  return (
    [comment.author.firstName, comment.author.lastName]
      .filter(Boolean)
      .join(" ") ||
    comment.author.email ||
    "Unknown"
  );
};

const formatCommentTime = (value: string | null) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const sanitizeCommentHtml = (html: string) =>
  html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");

export const ClientGbpPostingsTable = ({
  clientId,
  openPostId,
}: {
  clientId?: string;
  openPostId?: string | null;
}) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const toastRef = useRef(toast);
  const openedPostIdRef = useRef<string | null>(null);
  const commentEditorRef = useRef<HTMLDivElement | null>(null);
  const commentAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const commentImageInputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<GbpPostingRow[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [isAddKeywordsModalOpen, setIsAddKeywordsModalOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [editingRow, setEditingRow] = useState<GbpPostingRow | null>(null);
  const [editForm, setEditForm] = useState({
    assigneeId: "",
    buttonType: "",
    description: "",
    images: [] as string[],
    status: "Draft",
    type: "Update",
  });
  const [comments, setComments] = useState<ClientGbpPostingComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachmentItem[]
  >([]);
  const [previewAttachment, setPreviewAttachment] = useState<{
    name: string;
    url: string;
  } | null>(null);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isGeneratingPostContent, setIsGeneratingPostContent] = useState(false);
  const [isSavingPosting, setIsSavingPosting] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isDeletingPostingId, setIsDeletingPostingId] = useState<string | null>(
    null,
  );
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const loadPostings = useCallback(async () => {
    if (!clientId || !session) {
      setRows([]);

      return;
    }

    setIsLoadingRows(true);

    try {
      const accessToken = await getValidAccessToken();
      const response = await clientsApi.listClientGbpPostings(
        accessToken,
        clientId,
      );

      setRows(response.postings.map(mapPostingToRow));
    } catch (error) {
      setRows([]);
      toastRef.current.danger("Failed to load GBP postings.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoadingRows(false);
    }
  }, [clientId, getValidAccessToken, session]);

  useEffect(() => {
    void loadPostings();
  }, [loadPostings]);

  useEffect(() => {
    if (!session) {
      setUsers([]);

      return;
    }

    let isMounted = true;

    const loadUsers = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const response = await usersApi.getUsers(accessToken, { limit: 100 });

        if (isMounted) {
          setUsers(response.users);
        }
      } catch {
        if (isMounted) {
          setUsers([]);
        }
      }
    };

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, session]);

  const openEditModal = useCallback(
    async (row: GbpPostingRow) => {
      setEditingRow(row);
      setEditForm({
        assigneeId: row.assigneeId ?? "",
        buttonType: row.buttonType ?? "",
        description: row.description === "-" ? "" : row.description,
        images: row.images,
        status: row.status,
        type: row.type,
      });
      setCommentInput("");
      setPendingAttachments([]);
      setComments([]);

      if (!clientId || !session) {
        return;
      }

      try {
        setIsCommentsLoading(true);
        const accessToken = await getValidAccessToken();
        const response = await clientsApi.getClientGbpPostingComments(
          accessToken,
          clientId,
          row.id,
        );
        setComments(response.comments);
      } catch (error) {
        toastRef.current.danger("Failed to load comments.", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setIsCommentsLoading(false);
      }
    },
    [clientId, getValidAccessToken, session],
  );

  useEffect(() => {
    if (!openPostId || openedPostIdRef.current === openPostId) {
      return;
    }

    const requestedRow = rows.find((row) => row.id === openPostId);

    if (!requestedRow) {
      return;
    }

    openedPostIdRef.current = openPostId;
    void openEditModal(requestedRow);
  }, [openEditModal, openPostId, rows]);

  const closeEditModal = useCallback(() => {
    setEditingRow(null);
    setComments([]);
    setCommentInput("");
    pendingAttachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
    setPendingAttachments([]);
    setIsCommentsLoading(false);
    if (commentEditorRef.current) {
      commentEditorRef.current.innerText = "";
    }
  }, [pendingAttachments]);

  const handleCreateFromKeywords = async (payload: {
    audience: string;
    languageCode: string;
    language: string;
    items: Array<{
      contentType: string;
      keyword: string;
      numberOfPosts: number;
    }>;
  }) => {
    if (!clientId) {
      throw new Error("Client id is required.");
    }

    const accessToken = await getValidAccessToken();
    const response = await clientsApi.generateClientGbpPostings(
      accessToken,
      clientId,
      payload,
    );

    setRows((current) => [
      ...response.postings.map(mapPostingToRow),
      ...current,
    ]);
    toastRef.current.success("GBP postings saved.");
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    try {
      const selectedFiles = Array.from(files);
      const oversizedFiles = selectedFiles.filter(
        (file) => file.size > MAX_POST_IMAGE_BYTES,
      );

      if (oversizedFiles.length > 0) {
        toastRef.current.warning("Image is too large.", {
          description: "PNG or JPG images must be smaller than 3MB.",
        });

        return;
      }

      const images = await Promise.all(
        selectedFiles
          .filter((file) => file.type.startsWith("image/"))
          .map(fileToDataUrl),
      );
      setEditForm((current) => ({
        ...current,
        images: [...images, ...current.images],
      }));
    } catch (error) {
      toastRef.current.danger("Failed to upload image.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleCommentUpload = async (
    files: FileList | null,
    options?: { imageOnly?: boolean },
  ) => {
    if (!files?.length) {
      return;
    }

    const {
      attachments,
      countExceededFiles,
      oversizedFiles,
      totalSizeExceededFiles,
      unsupportedFiles,
    } = await buildPendingAttachmentsFromFileList(files, {
      currentAttachments: pendingAttachments,
      imageOnly: options?.imageOnly,
    });

    if (attachments.length > 0) {
      setPendingAttachments((current) => [...current, ...attachments]);
    }

    if (unsupportedFiles.length > 0) {
      toastRef.current.warning("Unsupported file type.", {
        description: options?.imageOnly
          ? "Please upload image files only."
          : "Please upload a supported file format.",
      });
    }

    if (oversizedFiles.length > 0) {
      toastRef.current.warning("File is too large.", {
        description: `Each file must be ${Math.floor(
          MAX_COMMENT_ATTACHMENT_BYTES / 1024,
        )}KB or less.`,
      });
    }

    if (totalSizeExceededFiles.length > 0) {
      toastRef.current.warning("Total attachment size exceeded.", {
        description: `Combined attachments must stay under ${Math.floor(
          MAX_COMMENT_ATTACHMENTS_TOTAL_BYTES / 1024,
        )}KB.`,
      });
    }

    if (countExceededFiles.length > 0) {
      toastRef.current.warning("Attachment limit reached.", {
        description: `You can attach up to ${MAX_COMMENT_ATTACHMENTS} files per comment.`,
      });
    }
  };

  const handleRemovePendingAttachment = (indexToRemove: number) => {
    setPendingAttachments((current) => {
      const target = current[indexToRemove];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((_, index) => index !== indexToRemove);
    });
  };

  const handleOpenAttachment = (attachment: ParsedCommentAttachment) => {
    const attachmentUrl = attachment.dataUrl;

    if (!attachmentUrl) {
      toastRef.current.warning("Attachment is unavailable.");

      return;
    }

    if (attachment.isImage) {
      setPreviewAttachment({
        name: attachment.name,
        url: attachmentUrl,
      });

      return;
    }

    const openedWindow = window.open(
      attachmentUrl,
      "_blank",
      "noopener,noreferrer",
    );

    if (!openedWindow) {
      const link = document.createElement("a");

      link.href = attachmentUrl;
      link.download = attachment.name;
      link.click();
    }
  };

  const handleSavePosting = async () => {
    if (!clientId || !editingRow || isSavingPosting) {
      return;
    }

    setIsSavingPosting(true);

    try {
      const accessToken = await getValidAccessToken();
      const posting = await clientsApi.updateClientGbpPosting(
        accessToken,
        clientId,
        editingRow.id,
        {
          assigneeId: editForm.assigneeId || null,
          buttonType: editForm.buttonType || null,
          contentType: editForm.type,
          description: editForm.description.trim() || null,
          images: editForm.images,
          postContent: editForm.description.trim() || null,
          status: editForm.status,
        },
      );
      const nextRow = mapPostingToRow(posting);
      setRows((current) =>
        current.map((row) => (row.id === nextRow.id ? nextRow : row)),
      );
      toastRef.current.success("GBP posting saved.");
      closeEditModal();
    } catch (error) {
      toastRef.current.danger("Failed to save GBP posting.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSavingPosting(false);
    }
  };

  const handleGeneratePostContent = async () => {
    if (!clientId || !editingRow || isGeneratingPostContent) {
      return;
    }

    setIsGeneratingPostContent(true);

    try {
      const accessToken = await getValidAccessToken();
      const response = await clientsApi.generateClientGbpPostingContent(
        accessToken,
        clientId,
        editingRow.id,
        {
          contentType: editForm.type,
          keyword: editingRow.keyword,
        },
      );
      const content = response.content.trim();

      if (!content) {
        throw new Error("AI returned empty content.");
      }

      setEditForm((current) => ({
        ...current,
        description: content.slice(0, DESCRIPTION_MAX_LENGTH),
      }));
      toastRef.current.success("AI content generated.");
    } catch (error) {
      toastRef.current.danger("Failed to generate AI content.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsGeneratingPostContent(false);
    }
  };

  const handleAddComment = async () => {
    const editorHtml = commentEditorRef.current?.innerHTML?.trim() ?? "";
    const message = buildCommentMessage({
      editorHtml,
      pendingAttachments,
      plainText: commentInput,
    });

    if (!clientId || !editingRow || !message || isSendingComment) {
      return;
    }

    const payloadValidation = validateCommentPayloadSize(message);
    if (!payloadValidation.isValid) {
      toastRef.current.warning("Comment is too large to send.", {
        description: `Please reduce text or attachments (max ${Math.floor(
          MAX_COMMENT_PAYLOAD_BYTES / 1024,
        )}KB payload).`,
      });

      return;
    }

    setIsSendingComment(true);

    try {
      const accessToken = await getValidAccessToken();
      const created = await clientsApi.createClientGbpPostingComment(
        accessToken,
        clientId,
        editingRow.id,
        { comment: message },
      );
      setComments((current) => [...current, created]);
      setCommentInput("");
      pendingAttachments.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
      setPendingAttachments([]);
      if (commentEditorRef.current) {
        commentEditorRef.current.innerHTML = "";
      }
    } catch (error) {
      toastRef.current.danger("Failed to add comment.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!clientId || !editingRow || isDeletingCommentId) {
      return;
    }

    setIsDeletingCommentId(commentId);

    try {
      const accessToken = await getValidAccessToken();
      await clientsApi.deleteClientGbpPostingComment(
        accessToken,
        clientId,
        editingRow.id,
        commentId,
      );
      setComments((current) =>
        current.filter((comment) => String(comment.id) !== commentId),
      );
    } catch (error) {
      toastRef.current.danger("Failed to delete comment.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeletingCommentId(null);
    }
  };

  const handleDeletePosting = async (postingId: string) => {
    if (!clientId || isDeletingPostingId) {
      return;
    }

    setIsDeletingPostingId(postingId);

    try {
      const accessToken = await getValidAccessToken();
      await clientsApi.deleteClientGbpPosting(accessToken, clientId, postingId);
      setRows((current) => current.filter((row) => row.id !== postingId));
      if (editingRow?.id === postingId) {
        closeEditModal();
      }
      toastRef.current.success("GBP post deleted.");
    } catch (error) {
      toastRef.current.danger("Failed to delete GBP post.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeletingPostingId(null);
    }
  };

  const columns = useMemo<DashboardDataTableColumn<GbpPostingRow>[]>(
    () => [
      {
        key: "select",
        label: "",
        className: "w-12 bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (
          <Checkbox
            aria-label={`Select ${item.keyword}`}
            isSelected={item.isSelected}
            onValueChange={(isSelected) => {
              setRows((current) =>
                current.map((row) =>
                  row.id === item.id ? { ...row, isSelected } : row,
                ),
              );
            }}
          />
        ),
      },
      {
        key: "keyword",
        label: "Keyword",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (
          <Chip className="bg-[#E5ECFD] text-[#0E3DA8]" radius="full" size="sm">
            {item.keyword}
          </Chip>
        ),
      },
      {
        key: "assignee",
        label: "Assignee",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (
          <div className="flex items-center gap-2">
            <Avatar
              className="h-8 w-8 flex-none"
              name={item.assigneeName}
              src={item.assigneeAvatar}
            />
            <span className="text-sm text-[#111827]">{item.assigneeName}</span>
          </div>
        ),
      },
      {
        key: "description",
        label: "Description",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (
          <span className="line-clamp-2 max-w-[180px] text-sm text-[#111827]">
            {item.description}
          </span>
        ),
      },
      {
        key: "images",
        label: "Images",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (
          <div className="flex items-center">
            {item.images.slice(0, 2).map((image, index) => (
              <Avatar
                key={`${item.id}-image-${image}`}
                className={`h-8 w-8 border border-white grayscale ${index > 0 ? "-ml-2" : ""}`}
                src={image}
              />
            ))}
          </div>
        ),
      },
      {
        key: "type",
        label: "Type",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (
          <Chip className={typeChipClass} radius="full" size="sm">
            {item.type}
          </Chip>
        ),
      },
      {
        key: "status",
        label: "Status",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (
          <Chip className={statusChipClass} radius="full" size="sm">
            {item.status}
          </Chip>
        ),
      },
      {
        key: "live-link",
        label: "Link to live link",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) =>
          item.liveLink ? (
            <a
              className="text-sm text-[#0E3DA8] underline"
              href={item.liveLink}
              rel="noreferrer"
              target="_blank"
            >
              {item.liveLink}
            </a>
          ) : (
            <span className="text-sm text-[#6B7280]">-</span>
          ),
      },
      {
        key: "last-updated",
        label: "Last Date Updated",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (
          <span className="text-sm text-[#111827]">{item.lastDateUpdated}</span>
        ),
      },
      {
        key: "date-published",
        label: "Date Published",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (
          <span className="text-sm text-[#111827]">{item.datePublished}</span>
        ),
      },
      {
        key: "action",
        label: "Action",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button isIconOnly radius="md" size="sm" variant="bordered">
                <EllipsisVertical size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="GBP posting actions"
              onAction={(key) => {
                if (key === "edit") {
                  void openEditModal(item);
                }
                if (key === "delete") {
                  void handleDeletePosting(item.id);
                }
              }}
            >
              <DropdownItem key="edit">Edit</DropdownItem>
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                isDisabled={isDeletingPostingId === item.id}
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        ),
      },
    ],
    [handleDeletePosting, isDeletingPostingId, openEditModal],
  );

  return (
    <>
      <DashboardDataTable
        showPagination
        ariaLabel="GBP Postings table"
        columns={columns}
        getRowKey={(item) => item.id}
        headerActions={[
          {
            key: "filter",
            label: "Filter",
            startContent: <SlidersHorizontal size={14} />,
            variant: "bordered",
          },
          {
            key: "show-10",
            label: "Show 10",
            startContent: <ListOrdered size={14} />,
            variant: "bordered",
          },
          {
            key: "columns",
            label: "Columns",
            startContent: <Columns3 size={14} />,
            variant: "bordered",
          },
          {
            key: "add-keyword-bulk",
            label: "Add Keywords",
            variant: "solid",
            color: "primary",
            startContent: <Plus size={14} />,
            onPress: () => {
              setIsAddKeywordsModalOpen(true);
            },
          },
        ]}
        rows={rows}
        title={isLoadingRows ? "GBP Postings (Loading...)" : "GBP Postings"}
      />
      <AddGbpPostingKeywordsModal
        isOpen={isAddKeywordsModalOpen}
        onOpenChange={setIsAddKeywordsModalOpen}
        onSubmit={handleCreateFromKeywords}
      />
      <Modal
        isOpen={Boolean(editingRow)}
        size="5xl"
        scrollBehavior="inside"
        onOpenChange={(open) => {
          if (!open) {
            closeEditModal();
          }
        }}
        classNames={{
          closeButton: "top-3 right-3",
        }}
      >
        <ModalContent className="max-h-[92vh]">
          <ModalHeader>
            <h2 className="text-lg font-semibold text-[#111827]">Edit Post</h2>
          </ModalHeader>
          <ModalBody className="grid gap-8 overflow-y-auto pb-7 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <div className="relative h-[250px] overflow-hidden rounded-xl">
                {editForm.images[0] ? (
                  <img
                    alt="GBP post preview"
                    className="h-full w-full object-cover"
                    src={editForm.images[0]}
                  />
                ) : (
                  <button
                    className="flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 text-center"
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    onDragOver={(event) => {
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleImageUpload(event.dataTransfer.files);
                    }}
                  >
                    <ImageIcon className="text-[#022279]" size={34} />
                    <span className="mt-4 text-sm text-[#98A2B3]">
                      PNG or JPG, smaller than 3MB
                    </span>
                    <span className="mt-4 text-base text-[#111827]">
                      Drag and Drop your file here or
                    </span>
                    <span className="mt-3 rounded-full bg-[#022279] px-5 py-2 text-sm font-medium text-white">
                      Choose File
                    </span>
                  </button>
                )}
                {editForm.images[0] ? (
                  <Button
                    isIconOnly
                    className="absolute right-4 top-4 bg-[#FFE8E8] text-danger"
                    radius="full"
                    onPress={() =>
                      setEditForm((current) => ({
                        ...current,
                        images: current.images.slice(1),
                      }))
                    }
                  >
                    <Trash2 size={18} />
                  </Button>
                ) : null}
                <input
                  ref={imageInputRef}
                  accept="image/*"
                  className="hidden"
                  type="file"
                  onChange={(event) => {
                    void handleImageUpload(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Select
                  label="Button"
                  labelPlacement="outside"
                  placeholder="+ Book more"
                  radius="sm"
                  selectedKeys={
                    editForm.buttonType ? [editForm.buttonType] : []
                  }
                  onSelectionChange={(keys) => {
                    const key = keys === "all" ? null : keys.currentKey;
                    setEditForm((current) => ({
                      ...current,
                      buttonType: key ? String(key) : "",
                    }));
                  }}
                >
                  {BUTTON_OPTIONS.map((option) => (
                    <SelectItem key={option}>{option}</SelectItem>
                  ))}
                </Select>
                <Select
                  isRequired
                  label="Select Post Type"
                  labelPlacement="outside"
                  placeholder="Select Post Type"
                  radius="sm"
                  selectedKeys={editForm.type ? [editForm.type] : []}
                  onSelectionChange={(keys) => {
                    const key = keys === "all" ? null : keys.currentKey;
                    setEditForm((current) => ({
                      ...current,
                      type: key ? String(key) : "Update",
                    }));
                  }}
                >
                  {POST_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option}>{option}</SelectItem>
                  ))}
                </Select>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-[#111827]">
                  Description <span className="text-danger">*</span>
                </p>
                <div className="rounded-md border border-default-200 bg-white p-4">
                  <Textarea
                    classNames={{
                      input: "min-h-[112px] resize-none text-sm leading-6",
                      inputWrapper:
                        "bg-transparent p-0 shadow-none data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent",
                    }}
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    minRows={5}
                    placeholder="Write the post description..."
                    value={editForm.description}
                    variant="flat"
                    onValueChange={(value) =>
                      setEditForm((current) => ({
                        ...current,
                        description: value.slice(0, DESCRIPTION_MAX_LENGTH),
                      }))
                    }
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <Button
                      className="border-[#8B73FF] bg-[#F4F0FF] text-[#111827]"
                      isLoading={isGeneratingPostContent}
                      radius="full"
                      size="sm"
                      startContent={
                        <Zap className="text-[#6D5DF5]" size={16} />
                      }
                      variant="bordered"
                      onPress={() => void handleGeneratePostContent()}
                    >
                      Generate with AI
                    </Button>
                    <span className="text-xs text-[#667085]">
                      {editForm.description.length}/{DESCRIPTION_MAX_LENGTH}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-xl bg-[#EEF2FF] p-4">
                <h3 className="font-semibold text-[#111827]">
                  {editingRow?.keyword || "GBP Post"}
                </h3>
                <div className="mt-2 flex items-center gap-2 text-sm text-[#667085]">
                  <MapPin className="text-[#4F46E5]" size={18} />
                  <span>2B Bedford Avenue. Barnet EN5 2EP</span>
                </div>
                <div className="mt-5 grid gap-4 text-sm">
                  <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                    <span className="flex items-center gap-2 text-[#667085]">
                      <UserCircle className="text-[#4F46E5]" size={18} />
                      Assignee:
                    </span>
                    <Select
                      aria-label="Assignee"
                      classNames={{
                        trigger: "bg-white",
                      }}
                      selectedKeys={
                        editForm.assigneeId ? [editForm.assigneeId] : []
                      }
                      size="sm"
                      onSelectionChange={(keys) => {
                        const key = keys === "all" ? null : keys.currentKey;
                        setEditForm((current) => ({
                          ...current,
                          assigneeId: key ? String(key) : "",
                        }));
                      }}
                    >
                      {users.map((user) => (
                        <SelectItem key={String(user.id)}>
                          {getUserName(user)}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                    <span className="flex items-center gap-2 text-[#667085]">
                      <Siren className="text-[#4F46E5]" size={18} />
                      Status:
                    </span>
                    <Select
                      aria-label="Status"
                      classNames={{
                        trigger: "bg-white",
                      }}
                      selectedKeys={editForm.status ? [editForm.status] : []}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const key = keys === "all" ? null : keys.currentKey;
                        setEditForm((current) => ({
                          ...current,
                          status: key ? String(key) : "Draft",
                        }));
                      }}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option}>{option}</SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#111827]">
                  Comments
                </h3>
                <div className="mt-4 space-y-4">
                  {isCommentsLoading ? (
                    <p className="text-sm text-[#6B7280]">
                      Loading comments...
                    </p>
                  ) : comments.length ? (
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
                              {parsedComment.body}
                            </p>
                          )}
                          {parsedComment.attachments.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {parsedComment.attachments.map(
                                (attachment, index) => (
                                  <button
                                    key={`${attachment.id ?? attachment.name}-${index}`}
                                    className="inline-flex max-w-full items-center gap-2 rounded-full bg-default-100 px-2 py-1 text-xs text-[#111827]"
                                    type="button"
                                    onClick={() =>
                                      handleOpenAttachment(attachment)
                                    }
                                  >
                                    {attachment.isImage &&
                                    attachment.dataUrl ? (
                                      <Avatar
                                        className="h-6 w-6"
                                        name={attachment.name}
                                        size="sm"
                                        src={attachment.dataUrl}
                                      />
                                    ) : (
                                      <Paperclip size={14} />
                                    )}
                                    <span className="max-w-[180px] truncate">
                                      {attachment.name}
                                    </span>
                                  </button>
                                ),
                              )}
                            </div>
                          ) : null}
                          <div className="flex items-center justify-between gap-2 text-sm text-[#6B7280]">
                            <div className="flex items-center gap-2">
                              <Avatar
                                showFallback
                                className="h-7 w-7"
                                name={formatCommentAuthor(comment)}
                                size="sm"
                                src={comment.author?.avatar ?? undefined}
                              />
                              <span className="font-medium">
                                {formatCommentAuthor(comment)}
                              </span>
                              <span>-</span>
                              <span>
                                {formatCommentTime(comment.createdAt)}
                              </span>
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
                                onPress={() =>
                                  void handleDeleteComment(String(comment.id))
                                }
                              >
                                <Trash2 size={14} />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="py-4 text-sm text-[#667085]">
                      No comments yet.
                    </p>
                  )}
                </div>

                <div className="mt-4 overflow-visible rounded-xl border border-default-200">
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
                      }}
                    />
                    {!commentInput.trim() ? (
                      <span className="pointer-events-none absolute left-3 top-2 text-sm text-[#9CA3AF]">
                        Write a comment... Use @ to mention
                      </span>
                    ) : null}
                  </div>
                  {pendingAttachments.length > 0 ? (
                    <div className="border-t border-default-200 px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {pendingAttachments.map((attachment, index) => (
                          <button
                            key={`${attachment.id}-${index}`}
                            className="inline-flex max-w-full items-center gap-2 rounded-full bg-default-100 px-2 py-1 text-xs text-[#111827]"
                            type="button"
                            onClick={() => handleRemovePendingAttachment(index)}
                          >
                            {attachment.isImage && attachment.previewUrl ? (
                              <Avatar
                                className="h-6 w-6"
                                name={attachment.name}
                                size="sm"
                                src={attachment.previewUrl}
                              />
                            ) : (
                              <Paperclip size={14} />
                            )}
                            <span className="max-w-[180px] truncate">
                              {attachment.name}
                            </span>
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
                        radius="sm"
                        size="sm"
                        variant="light"
                        onPress={() => document.execCommand("bold")}
                      >
                        <span className="font-semibold">B</span>
                      </Button>
                      <Button
                        isIconOnly
                        radius="sm"
                        size="sm"
                        variant="light"
                        onPress={() => document.execCommand("italic")}
                      >
                        <span className="italic">I</span>
                      </Button>
                      <Button
                        isIconOnly
                        radius="sm"
                        size="sm"
                        variant="light"
                        onPress={() => document.execCommand("underline")}
                      >
                        <span className="underline">U</span>
                      </Button>
                      <Button
                        isIconOnly
                        radius="sm"
                        size="sm"
                        variant="light"
                        onPress={() => document.execCommand("strikeThrough")}
                      >
                        <span className="line-through">S</span>
                      </Button>
                      <Button
                        isIconOnly
                        radius="sm"
                        size="sm"
                        variant="light"
                        onPress={() =>
                          document.execCommand("insertUnorderedList")
                        }
                      >
                        <List size={16} />
                      </Button>
                      <Button
                        isIconOnly
                        radius="sm"
                        size="sm"
                        variant="light"
                        onPress={() =>
                          commentAttachmentInputRef.current?.click()
                        }
                      >
                        <Paperclip size={16} />
                      </Button>
                      <Button
                        isIconOnly
                        radius="sm"
                        size="sm"
                        variant="light"
                        onPress={() => commentImageInputRef.current?.click()}
                      >
                        <ImageIcon size={16} />
                      </Button>
                    </div>
                    <Button
                      className="bg-[#022279] text-white"
                      isDisabled={
                        !commentInput.trim() && pendingAttachments.length === 0
                      }
                      isLoading={isSendingComment}
                      size="sm"
                      onPress={() => void handleAddComment()}
                    >
                      <SendHorizontal size={14} />
                      Send
                    </Button>
                  </div>
                  <input
                    ref={commentAttachmentInputRef}
                    multiple
                    className="hidden"
                    type="file"
                    onChange={(event) => {
                      void handleCommentUpload(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  <input
                    ref={commentImageInputRef}
                    multiple
                    accept="image/*"
                    className="hidden"
                    type="file"
                    onChange={(event) => {
                      void handleCommentUpload(event.target.files, {
                        imageOnly: true,
                      });
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>
            </aside>
          </ModalBody>
          <ModalFooter className="border-t border-default-200">
            <Button radius="sm" variant="bordered" onPress={closeEditModal}>
              Cancel
            </Button>
            <Button
              className="bg-[#022279] text-white"
              isLoading={isSavingPosting}
              radius="sm"
              onPress={() => void handleSavePosting()}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={Boolean(previewAttachment)}
        size="3xl"
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachment(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader>
            <h2 className="truncate text-base font-semibold text-[#111827]">
              {previewAttachment?.name}
            </h2>
          </ModalHeader>
          <ModalBody className="pb-6">
            {previewAttachment ? (
              <img
                alt={previewAttachment.name}
                className="max-h-[70vh] w-full rounded-lg object-contain"
                src={previewAttachment.url}
              />
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
