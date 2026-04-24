const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const safeDecodeUriComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const decodePercentEncodedText = (value: string) => {
  let decoded = value;

  // Run a few passes to handle double-encoded content safely.
  for (let index = 0; index < 3; index += 1) {
    const next = safeDecodeUriComponent(decoded);

    if (next === decoded) {
      break;
    }

    decoded = next;
  }

  return decoded;
};

export const formatCommentPreview = (value?: string | null) => {
  const raw = (value ?? "").trim();

  if (!raw) {
    return "-";
  }

  let workingMessage = raw;
  const richHtmlParts: string[] = [];
  const richHtmlRegex = /\[COMMENT_HTML\]([\s\S]*?)\[\/COMMENT_HTML\]/gi;

  workingMessage = workingMessage.replace(richHtmlRegex, (_, encodedHtml) => {
    const decodedHtml = decodePercentEncodedText(String(encodedHtml ?? ""));

    if (decodedHtml.trim()) {
      richHtmlParts.push(decodedHtml);
    }

    return " ";
  });

  workingMessage = decodePercentEncodedText(workingMessage);
  workingMessage = workingMessage
    .replace(/^\s*\[Attachment:[^\]]+\]\s*$/gim, " ")
    .replace(/^\s*\[AttachmentMeta:[^\]]+\]\s*$/gim, " ")
    .replace(/^\s*\[Attachment\]\s+.+$/gim, " ");

  const merged = [richHtmlParts.join(" "), workingMessage]
    .filter(Boolean)
    .join(" ");

  const textOnly = merged
    .replace(/<[^>]*>/g, " ")
    .replace(/\[COMMENT_HTML\]/gi, " ")
    .replace(/\[\/COMMENT_HTML\]/gi, " ");

  const cleaned = decodeHtmlEntities(textOnly).replace(/\s+/g, " ").trim();

  return cleaned || "-";
};
