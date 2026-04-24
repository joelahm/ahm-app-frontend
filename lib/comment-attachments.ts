export interface PendingAttachmentItem {
  id: string;
  isImage: boolean;
  mimeType?: string;
  name: string;
  sizeBytes: number;
  previewUrl?: string;
  dataUrl?: string;
}

export interface ParsedCommentAttachment {
  id?: string;
  name: string;
  dataUrl?: string;
  isImage?: boolean;
  mimeType?: string;
}

export interface ParsedCommentContent {
  attachments: ParsedCommentAttachment[];
  body: string;
  richHtml?: string;
}

const decodeSafely = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const MAX_COMMENT_ATTACHMENTS = 4;
export const MAX_COMMENT_ATTACHMENT_BYTES = 25 * 1024;
export const MAX_COMMENT_ATTACHMENTS_TOTAL_BYTES = 60 * 1024;
export const MAX_COMMENT_PAYLOAD_BYTES = 95 * 1024;

const ALLOWED_COMMENT_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const serializeAttachmentMeta = (attachment: PendingAttachmentItem) =>
  encodeURIComponent(
    JSON.stringify({
      dataUrl: attachment.dataUrl ?? "",
      isImage: attachment.isImage,
      mimeType: attachment.mimeType ?? "",
      name: attachment.name,
    }),
  );

export const buildCommentMessage = ({
  editorHtml,
  pendingAttachments,
  plainText,
}: {
  editorHtml?: string;
  pendingAttachments: PendingAttachmentItem[];
  plainText?: string;
}) => {
  const htmlBlock =
    editorHtml && editorHtml !== "<br>"
      ? `[COMMENT_HTML]${encodeURIComponent(editorHtml)}[/COMMENT_HTML]`
      : "";

  const attachmentLines = pendingAttachments.flatMap((attachment) => {
    const lines = [`[Attachment:${attachment.id}:${attachment.name}]`];

    if (attachment.dataUrl) {
      lines.push(
        `[AttachmentMeta:${attachment.id}:${serializeAttachmentMeta(attachment)}]`,
      );
    }

    return lines;
  });

  return [htmlBlock || (plainText ?? "").trim(), ...attachmentLines]
    .filter(Boolean)
    .join("\n");
};

export const getPendingAttachmentsTotalBytes = (
  pendingAttachments: PendingAttachmentItem[],
) =>
  pendingAttachments.reduce(
    (sum, attachment) => sum + (attachment.sizeBytes || 0),
    0,
  );

export const validateCommentPayloadSize = (message: string) => {
  const body = JSON.stringify({ comment: message });
  const encodedSize = new TextEncoder().encode(body).byteLength;

  return {
    isValid: encodedSize <= MAX_COMMENT_PAYLOAD_BYTES,
    limit: MAX_COMMENT_PAYLOAD_BYTES,
    size: encodedSize,
  };
};

export const parseCommentAttachments = (
  message: string,
): ParsedCommentContent => {
  let workingMessage = message;
  let richHtml: string | undefined;
  const richHtmlMatch = workingMessage.match(
    /\[COMMENT_HTML\]([\s\S]*?)\[\/COMMENT_HTML\]/i,
  );

  if (richHtmlMatch?.[1]) {
    richHtml = decodeSafely(richHtmlMatch[1]);
    workingMessage = workingMessage.replace(richHtmlMatch[0], "").trim();
  }

  const lines = workingMessage.split(/\r?\n/);
  const attachments: ParsedCommentAttachment[] = [];
  const metadataByAttachmentId = new Map<
    string,
    Pick<ParsedCommentAttachment, "dataUrl" | "isImage" | "mimeType" | "name">
  >();
  const bodyLines: string[] = [];

  lines.forEach((line) => {
    const normalized = line.trim();
    const structuredMatch = normalized.match(
      /^\[Attachment:([^:\]]+):(.+)\]$/i,
    );

    if (structuredMatch) {
      attachments.push({
        id: structuredMatch[1]?.trim(),
        name: structuredMatch[2]?.trim() || "Attachment",
      });

      return;
    }

    const metadataMatch = normalized.match(
      /^\[AttachmentMeta:([^:\]]+):([\s\S]+)\]$/i,
    );

    if (metadataMatch?.[1] && metadataMatch?.[2]) {
      const parsedId = metadataMatch[1].trim();
      const decodedMetadata = decodeSafely(metadataMatch[2]);

      try {
        const parsedMetadata = JSON.parse(decodedMetadata) as {
          dataUrl?: unknown;
          isImage?: unknown;
          mimeType?: unknown;
          name?: unknown;
        };

        metadataByAttachmentId.set(parsedId, {
          dataUrl:
            typeof parsedMetadata.dataUrl === "string"
              ? parsedMetadata.dataUrl
              : undefined,
          isImage:
            typeof parsedMetadata.isImage === "boolean"
              ? parsedMetadata.isImage
              : undefined,
          mimeType:
            typeof parsedMetadata.mimeType === "string"
              ? parsedMetadata.mimeType
              : undefined,
          name:
            typeof parsedMetadata.name === "string"
              ? parsedMetadata.name
              : "Attachment",
        });
      } catch {
        // Ignore malformed metadata line.
      }

      return;
    }

    const legacyMatch = normalized.match(/^\[Attachment\]\s+(.+)$/i);

    if (legacyMatch) {
      attachments.push({
        name: legacyMatch[1]?.trim() || "Attachment",
      });

      return;
    }

    bodyLines.push(line);
  });

  const mergedAttachments = attachments.map((attachment) => {
    if (!attachment.id) {
      return attachment;
    }

    const metadata = metadataByAttachmentId.get(attachment.id);

    if (!metadata) {
      return attachment;
    }

    return {
      ...attachment,
      dataUrl: metadata.dataUrl,
      isImage: metadata.isImage,
      mimeType: metadata.mimeType,
      name: attachment.name || metadata.name || "Attachment",
    };
  });

  metadataByAttachmentId.forEach((metadata, id) => {
    if (mergedAttachments.some((attachment) => attachment.id === id)) {
      return;
    }

    mergedAttachments.push({
      dataUrl: metadata.dataUrl,
      id,
      isImage: metadata.isImage,
      mimeType: metadata.mimeType,
      name: metadata.name || "Attachment",
    });
  });

  return {
    attachments: mergedAttachments,
    body: bodyLines.join("\n").trim(),
    richHtml,
  };
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file."));
    };
    reader.readAsDataURL(file);
  });

export const buildPendingAttachmentsFromFileList = async (
  fileList: FileList,
  options?: {
    currentAttachments?: PendingAttachmentItem[];
    imageOnly?: boolean;
  },
) => {
  const currentAttachments = options?.currentAttachments ?? [];
  const remainingSlots = Math.max(
    MAX_COMMENT_ATTACHMENTS - currentAttachments.length,
    0,
  );
  let currentTotalBytes = getPendingAttachmentsTotalBytes(currentAttachments);
  const countExceededFiles: string[] = [];
  const oversizedFiles: string[] = [];
  const totalSizeExceededFiles: string[] = [];
  const unsupportedFiles: string[] = [];
  const attachments: PendingAttachmentItem[] = [];
  const candidates = Array.from(fileList);

  for (let index = 0; index < candidates.length; index += 1) {
    const file = candidates[index];

    if (!file) {
      continue;
    }

    if (index >= remainingSlots) {
      countExceededFiles.push(file.name);
      continue;
    }

    if (options?.imageOnly && !file.type.startsWith("image/")) {
      unsupportedFiles.push(file.name);
      continue;
    }

    if (
      !options?.imageOnly &&
      file.type &&
      !ALLOWED_COMMENT_ATTACHMENT_MIME_TYPES.has(file.type.toLowerCase())
    ) {
      unsupportedFiles.push(file.name);
      continue;
    }

    if (file.size > MAX_COMMENT_ATTACHMENT_BYTES) {
      oversizedFiles.push(file.name);
      continue;
    }

    if (currentTotalBytes + file.size > MAX_COMMENT_ATTACHMENTS_TOTAL_BYTES) {
      totalSizeExceededFiles.push(file.name);
      continue;
    }

    const isImageFile = file.type.startsWith("image/");
    const dataUrl = await readFileAsDataUrl(file);

    attachments.push({
      dataUrl,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      isImage: isImageFile,
      mimeType: file.type,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      sizeBytes: file.size,
    });
    currentTotalBytes += file.size;
  }

  return {
    attachments,
    countExceededFiles,
    oversizedFiles,
    totalSizeExceededFiles,
    unsupportedFiles,
  };
};
