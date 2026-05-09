"use client";

import type { UrlPreviewData } from "@/components/dashboard/client-details/task-panel/editor/extensions/link-preview";

import { useState } from "react";
import { Button } from "@heroui/button";

import {
  RichTextEditor,
  type JSONContent,
} from "@/components/dashboard/client-details/task-panel/editor/rich-text-editor";
import { proseMirrorToPlainText } from "@/lib/prosemirror";

interface ActivityComposerProps {
  isSubmitting?: boolean;
  onFetchUrlPreview?: (url: string) => Promise<UrlPreviewData>;
  onSubmit: (payload: { bodyJson: JSONContent; comment: string }) => void;
  onUploadError?: (msg: string) => void;
  onUploadImage?: (file: File) => Promise<{ url: string }>;
}

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const hasMeaningfulContent = (doc: JSONContent | null): boolean => {
  if (!doc) return false;
  if (doc.type === "text" && typeof doc.text === "string" && doc.text.trim()) {
    return true;
  }
  if (doc.type && doc.type !== "doc" && doc.type !== "paragraph") {
    // Atom blocks (image, figmaEmbed, youtubeEmbed, vimeoEmbed, linkPreview, codeBlock, etc.)
    return true;
  }
  if (Array.isArray(doc.content)) {
    return doc.content.some(hasMeaningfulContent);
  }

  return false;
};

export const ActivityComposer = ({
  isSubmitting,
  onFetchUrlPreview,
  onSubmit,
  onUploadError,
  onUploadImage,
}: ActivityComposerProps) => {
  const [value, setValue] = useState<JSONContent | null>(EMPTY_DOC);
  const [isUploading, setIsUploading] = useState(false);
  const body = proseMirrorToPlainText(value);
  const canSubmit = hasMeaningfulContent(value) && !isUploading;

  return (
    <div className="space-y-2">
      <RichTextEditor
        placeholder="Write a comment..."
        value={value}
        onChange={setValue}
        onFetchUrlPreview={onFetchUrlPreview}
        onUploadError={onUploadError}
        onUploadImage={onUploadImage}
        onUploadStateChange={setIsUploading}
      />
      <div className="flex items-center justify-end gap-2">
        {isUploading ? (
          <span className="text-xs text-default-500">Uploading…</span>
        ) : null}
        <Button
          className="bg-[#022279] text-white"
          isDisabled={!canSubmit}
          isLoading={isSubmitting}
          radius="sm"
          size="sm"
          onPress={() => {
            if (!canSubmit || !value) return;
            onSubmit({ bodyJson: value, comment: body });
            setValue(EMPTY_DOC);
          }}
        >
          Comment
        </Button>
      </div>
    </div>
  );
};
