"use client";

import { useEffect, useRef } from "react";
import { Button } from "@heroui/button";
import TiptapImage from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";

interface RichTextEditorProps {
  editorId?: string;
  minHeightClassName?: string;
  placeholder?: string;
  value: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  onUploadError?: (message: string) => void;
  onUploadImage?: (file: File) => Promise<{ url: string }>;
  onUploadStateChange?: (isUploading: boolean) => void;
}

const buildPlaceholderImageSrc = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="24">Uploading image...</text></svg>`;

  return `data:image/svg+xml;base64,${window.btoa(svg)}`;
};

const replaceImageSrc = (
  editor: Editor,
  currentSrc: string,
  nextSrc: string,
) => {
  let imagePosition: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && node.attrs.src === currentSrc) {
      imagePosition = pos;

      return false;
    }

    return true;
  });

  if (imagePosition === null) return;

  const transaction = editor.state.tr.setNodeMarkup(imagePosition, undefined, {
    ...editor.state.doc.nodeAt(imagePosition)?.attrs,
    src: nextSrc,
  });

  editor.view.dispatch(transaction);
};

const removeImageBySrc = (editor: Editor, src: string) => {
  let imagePosition: number | null = null;
  let imageSize = 0;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && node.attrs.src === src) {
      imagePosition = pos;
      imageSize = node.nodeSize;

      return false;
    }

    return true;
  });

  if (imagePosition === null) return;

  editor.view.dispatch(
    editor.state.tr.delete(imagePosition, imagePosition + imageSize),
  );
};

export const RichTextEditor = ({
  editorId,
  minHeightClassName = "min-h-[260px]",
  onBlur,
  onChange,
  onUploadError,
  onUploadImage,
  onUploadStateChange,
  placeholder = "Write content...",
  value,
}: RichTextEditorProps) => {
  const editorRef = useRef<Editor | null>(null);
  const inFlightUploadsRef = useRef(0);
  const canUploadImages = Boolean(onUploadImage);

  const beginUpload = () => {
    inFlightUploadsRef.current += 1;
    if (inFlightUploadsRef.current === 1) onUploadStateChange?.(true);
  };

  const endUpload = () => {
    inFlightUploadsRef.current = Math.max(0, inFlightUploadsRef.current - 1);
    if (inFlightUploadsRef.current === 0) onUploadStateChange?.(false);
  };

  const uploadImageFile = async (editorInstance: Editor, file: File) => {
    if (!canUploadImages || !onUploadImage || !file.type.startsWith("image/")) {
      return false;
    }

    const placeholderSrc = buildPlaceholderImageSrc();

    editorInstance
      .chain()
      .focus()
      .setImage({ alt: file.name, src: placeholderSrc, title: file.name })
      .run();

    beginUpload();
    try {
      const uploaded = await onUploadImage(file);

      replaceImageSrc(editorInstance, placeholderSrc, uploaded.url);
      onChange(editorInstance.getHTML());
    } catch (error) {
      removeImageBySrc(editorInstance, placeholderSrc);
      onUploadError?.(
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      endUpload();
    }

    return true;
  };

  const uploadFirstImageFile = (
    editorInstance: Editor,
    files: FileList | File[],
  ) => {
    const imageFile = Array.from(files).find((file) =>
      file.type.startsWith("image/"),
    );

    if (!imageFile) return false;

    void uploadImageFile(editorInstance, imageFile);

    return true;
  };

  const editor = useEditor({
    content: value || "<p></p>",
    editorProps: {
      attributes: editorId
        ? {
            class: `rich-text-editor__surface px-3 py-3 text-[#111827] focus:outline-none ${minHeightClassName}`,
            id: editorId,
          }
        : {
            class: `rich-text-editor__surface px-3 py-3 text-[#111827] focus:outline-none ${minHeightClassName}`,
          },
      handleDrop: (view, event) => {
        if (
          !editorRef.current ||
          !canUploadImages ||
          !event.dataTransfer?.files?.length
        ) {
          return false;
        }

        const handled = uploadFirstImageFile(
          editorRef.current,
          event.dataTransfer.files,
        );

        if (handled) {
          event.preventDefault();
        }

        return handled;
      },
      handlePaste: (view, event) => {
        if (!editorRef.current || !canUploadImages || !event.clipboardData) {
          return false;
        }

        const pastedFiles = event.clipboardData.files.length
          ? event.clipboardData.files
          : Array.from(event.clipboardData.items)
              .filter((item) => item.kind === "file")
              .map((item) => item.getAsFile())
              .filter((file): file is File => file !== null);

        const handled = uploadFirstImageFile(editorRef.current, pastedFiles);

        if (handled) {
          event.preventDefault();
        }

        return handled;
      },
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TiptapImage.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "max-w-[500px] rounded-md border border-default-200",
        },
      }),
      Underline,
      Link.configure({
        autolink: true,
        openOnClick: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    immediatelyRender: false,
    onBlur: () => {
      onBlur?.();
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.getHTML();

    if (value !== current) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="rounded-xl border border-default-200">
        <div className="px-3 py-2 text-sm text-[#6B7280]">Loading editor…</div>
      </div>
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl || "");

    if (url === null) {
      return;
    }

    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();

      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  return (
    <div className="rich-text-editor rounded-xl border border-default-200">
      <div className="flex flex-wrap items-center gap-1 border-b border-default-200 px-2 py-1">
        <Button
          isIconOnly
          className={editor.isActive("bold") ? "bg-default-100" : ""}
          size="sm"
          variant="light"
          onPress={() => {
            editor.chain().focus().toggleBold().run();
          }}
        >
          <Bold size={14} />
        </Button>
        <Button
          isIconOnly
          className={editor.isActive("italic") ? "bg-default-100" : ""}
          size="sm"
          variant="light"
          onPress={() => {
            editor.chain().focus().toggleItalic().run();
          }}
        >
          <Italic size={14} />
        </Button>
        <Button
          isIconOnly
          className={editor.isActive("underline") ? "bg-default-100" : ""}
          size="sm"
          variant="light"
          onPress={() => {
            editor.chain().focus().toggleUnderline().run();
          }}
        >
          <UnderlineIcon size={14} />
        </Button>
        <Button
          isIconOnly
          className={editor.isActive("strike") ? "bg-default-100" : ""}
          size="sm"
          variant="light"
          onPress={() => {
            editor.chain().focus().toggleStrike().run();
          }}
        >
          <Strikethrough size={14} />
        </Button>
        <Button
          isIconOnly
          className={
            editor.isActive("heading", { level: 1 }) ? "bg-default-100" : ""
          }
          size="sm"
          variant="light"
          onPress={() => {
            editor.chain().focus().toggleHeading({ level: 1 }).run();
          }}
        >
          <Heading1 size={14} />
        </Button>
        <Button
          isIconOnly
          className={
            editor.isActive("heading", { level: 2 }) ? "bg-default-100" : ""
          }
          size="sm"
          variant="light"
          onPress={() => {
            editor.chain().focus().toggleHeading({ level: 2 }).run();
          }}
        >
          <Heading2 size={14} />
        </Button>
        <Button
          isIconOnly
          className={
            editor.isActive("heading", { level: 3 }) ? "bg-default-100" : ""
          }
          size="sm"
          variant="light"
          onPress={() => {
            editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
        >
          <Heading3 size={14} />
        </Button>
        <Button
          isIconOnly
          className={editor.isActive("bulletList") ? "bg-default-100" : ""}
          size="sm"
          variant="light"
          onPress={() => {
            editor.chain().focus().toggleBulletList().run();
          }}
        >
          <List size={14} />
        </Button>
        <Button
          isIconOnly
          className={editor.isActive("orderedList") ? "bg-default-100" : ""}
          size="sm"
          variant="light"
          onPress={() => {
            editor.chain().focus().toggleOrderedList().run();
          }}
        >
          <ListOrdered size={14} />
        </Button>
        <Button
          isIconOnly
          className={editor.isActive("link") ? "bg-default-100" : ""}
          size="sm"
          variant="light"
          onPress={setLink}
        >
          <Link2 size={14} />
        </Button>
      </div>
      <EditorContent editor={editor} />
      <style>{`
        .rich-text-editor__surface > *:first-child {
          margin-top: 0;
        }

        .rich-text-editor__surface > *:last-child {
          margin-bottom: 0;
        }

        .rich-text-editor__surface p {
          margin: 0 0 1rem;
          font-size: 0.95rem;
          line-height: 1.75;
        }

        .rich-text-editor__surface h1 {
          margin: 1.75rem 0 0.9rem;
          font-size: 1.875rem;
          font-weight: 700;
          line-height: 1.2;
          color: #111827;
        }

        .rich-text-editor__surface h2 {
          margin: 1.5rem 0 0.8rem;
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.25;
          color: #111827;
        }

        .rich-text-editor__surface h3 {
          margin: 1.25rem 0 0.7rem;
          font-size: 1.25rem;
          font-weight: 700;
          line-height: 1.3;
          color: #111827;
        }

        .rich-text-editor__surface ul,
        .rich-text-editor__surface ol {
          margin: 0 0 1rem;
          padding-left: 1.5rem;
        }

        .rich-text-editor__surface li {
          margin: 0.35rem 0;
          line-height: 1.75;
        }

        .rich-text-editor__surface strong {
          font-weight: 700;
        }

        .rich-text-editor__surface em {
          font-style: italic;
        }

        .rich-text-editor__surface a {
          color: #1d4ed8;
          text-decoration: underline;
        }

        .rich-text-editor__surface blockquote {
          margin: 0 0 1rem;
          border-left: 3px solid #d1d5db;
          padding-left: 1rem;
          color: #4b5563;
        }

        .rich-text-editor__surface p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};
