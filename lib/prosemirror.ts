import type { JSONContent } from "@/components/dashboard/client-details/task-panel/editor/rich-text-editor";

const BLOCK_TYPES = new Set([
  "blockquote",
  "bulletList",
  "heading",
  "listItem",
  "orderedList",
  "paragraph",
]);

export const proseMirrorToPlainText = (value: JSONContent | null): string => {
  if (!value || typeof value !== "object") return "";

  const parts: string[] = [];

  const walk = (node: JSONContent) => {
    if (typeof node.text === "string") {
      parts.push(node.text);
    }

    if (node.type === "hardBreak") {
      parts.push("\n");
    }

    if (
      node.type === "linkPreview" ||
      node.type === "figmaEmbed" ||
      node.type === "image"
    ) {
      const url = node.attrs?.url ?? node.attrs?.src;

      if (typeof url === "string") {
        parts.push(url);
      }
    }

    if (node.type === "youtubeEmbed" && typeof node.attrs?.videoId === "string") {
      parts.push(`https://youtu.be/${node.attrs.videoId}`);
    }

    if (node.type === "vimeoEmbed" && typeof node.attrs?.videoId === "string") {
      parts.push(`https://vimeo.com/${node.attrs.videoId}`);
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }

    if (node.type && BLOCK_TYPES.has(node.type)) {
      parts.push("\n");
    }
  };

  walk(value);

  return parts
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
