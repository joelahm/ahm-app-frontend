"use client";

import type { Editor, JSONContent } from "@tiptap/react";

import { useEffect, useRef } from "react";
import TiptapImage from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { getPlainUrlFromText } from "@/components/dashboard/client-details/task-panel/editor/extensions/embed-utils";
import { FigmaEmbed, matchFigmaUrl } from "@/components/dashboard/client-details/task-panel/editor/extensions/figma-embed";
import { LinkPreview, type UrlPreviewData } from "@/components/dashboard/client-details/task-panel/editor/extensions/link-preview";
import { VimeoEmbed, matchVimeoUrl } from "@/components/dashboard/client-details/task-panel/editor/extensions/vimeo-embed";
import { YouTubeEmbed, matchYouTubeUrl } from "@/components/dashboard/client-details/task-panel/editor/extensions/youtube-embed";

interface RichTextEditorProps {
  isReadOnly?: boolean;
  onChange?: (json: JSONContent) => void;
  onFetchUrlPreview?: (url: string) => Promise<UrlPreviewData>;
  onUploadError?: (msg: string) => void;
  onUploadImage?: (file: File) => Promise<{ url: string }>;
  onUploadStateChange?: (isBusy: boolean) => void;
  placeholder?: string;
  taskId?: string | number;
  value: JSONContent | null;
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

const baseToolbarButton =
  "inline-flex h-7 w-7 items-center justify-center rounded transition-colors text-default-600 hover:bg-default-100 hover:text-default-900 disabled:cursor-not-allowed disabled:opacity-40";
const activeToolbarButton = "bg-default-200 text-default-900";

const buildPlaceholderImageSrc = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="24">Uploading image...</text></svg>`;

  return `data:image/svg+xml;base64,${window.btoa(svg)}`;
};

const replaceImageSrc = (editor: Editor, currentSrc: string, nextSrc: string) => {
  let imagePosition: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && node.attrs.src === currentSrc) {
      imagePosition = pos;
      return false;
    }

    return true;
  });

  if (imagePosition === null) return;

  const transaction = editor.state.tr.setNodeMarkup(
    imagePosition,
    undefined,
    {
      ...editor.state.doc.nodeAt(imagePosition)?.attrs,
      src: nextSrc,
    },
  );

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

  editor.view.dispatch(editor.state.tr.delete(imagePosition, imagePosition + imageSize));
};

export const RichTextEditor = ({
  isReadOnly = false,
  onChange,
  onFetchUrlPreview,
  onUploadError,
  onUploadImage,
  onUploadStateChange,
  placeholder = "Add a description…",
  taskId: _taskId,
  value,
}: RichTextEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const inFlightUploadsRef = useRef(0);
  const canUploadImages = Boolean(onUploadImage && !isReadOnly);

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

  const uploadFirstImageFile = (editorInstance: Editor, files: FileList | File[]) => {
    const imageFile = Array.from(files).find((file) =>
      file.type.startsWith("image/"),
    );

    if (!imageFile) return false;

    void uploadImageFile(editorInstance, imageFile);

    return true;
  };

  const insertEmbedFromUrl = (editorInstance: Editor, url: string) => {
    const youtubeId = matchYouTubeUrl(url);
    if (youtubeId) {
      editorInstance
        .chain()
        .focus()
        .insertContent({ type: "youtubeEmbed", attrs: { videoId: youtubeId } })
        .run();
      return true;
    }

    const vimeoId = matchVimeoUrl(url);
    if (vimeoId) {
      editorInstance
        .chain()
        .focus()
        .insertContent({ type: "vimeoEmbed", attrs: { videoId: vimeoId } })
        .run();
      return true;
    }

    const figmaUrl = matchFigmaUrl(url);
    if (figmaUrl) {
      editorInstance
        .chain()
        .focus()
        .insertContent({ type: "figmaEmbed", attrs: { url: figmaUrl } })
        .run();
      return true;
    }

    if (onFetchUrlPreview) {
      editorInstance
        .chain()
        .focus()
        .insertContent({
          type: "linkPreview",
          attrs: { status: "loading", url },
        })
        .run();
      return true;
    }

    return false;
  };

  const editor = useEditor({
    editable: !isReadOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        autolink: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        openOnClick: !isReadOnly ? false : true,
      }),
      TiptapImage.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "max-w-[500px] rounded-md border border-default-200",
        },
      }),
      YouTubeEmbed,
      VimeoEmbed,
      FigmaEmbed,
      LinkPreview.configure({
        fetchPreview: onFetchUrlPreview,
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: value ?? EMPTY_DOC,
    onUpdate: ({ editor: nextEditor }) => {
      onChange?.(nextEditor.getJSON());
    },
    editorProps: {
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
        const plainUrl = getPlainUrlFromText(
          event.clipboardData?.getData("text/plain") ?? "",
        );

        if (editorRef.current && plainUrl) {
          const handled = insertEmbedFromUrl(editorRef.current, plainUrl);
          if (handled) {
            event.preventDefault();
            return true;
          }
        }

        if (
          !editorRef.current ||
          !canUploadImages ||
          !event.clipboardData?.files?.length
        ) {
          return false;
        }

        const handled = uploadFirstImageFile(
          editorRef.current,
          event.clipboardData.files,
        );
        if (handled) {
          event.preventDefault();
        }

        return handled;
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const incoming = value ?? EMPTY_DOC;
    if (JSON.stringify(editor.getJSON()) === JSON.stringify(incoming)) return;
    // Defer setContent to a microtask: TipTap calls flushSync internally,
    // which React forbids during commit/lifecycle.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      editor.commands.setContent(incoming, { emitUpdate: false });
    });
    return () => {
      cancelled = true;
    };
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable === !isReadOnly) return;
    editor.setEditable(!isReadOnly);
  }, [editor, isReadOnly]);

  if (!editor) {
    return (
      <div className="rounded-lg border border-default-200 bg-default-50 p-4 text-sm text-default-500">
        Loading editor…
      </div>
    );
  }

  const button = (
    label: string,
    icon: React.ReactNode,
    isActive: boolean,
    onClick: () => void,
    disabled = false,
  ) => (
    <button
      key={label}
      aria-label={label}
      className={`${baseToolbarButton} ${isActive ? activeToolbarButton : ""}`}
      disabled={disabled}
      title={label}
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
    >
      {icon}
    </button>
  );

  return (
    <div className="rounded-lg border border-default-200 bg-white">
      {!isReadOnly ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-default-200 px-2 py-1.5">
          {button(
            "Bold",
            <Bold size={14} />,
            editor.isActive("bold"),
            () => editor.chain().focus().toggleBold().run(),
          )}
          {button(
            "Italic",
            <Italic size={14} />,
            editor.isActive("italic"),
            () => editor.chain().focus().toggleItalic().run(),
          )}
          {button(
            "Underline",
            <UnderlineIcon size={14} />,
            editor.isActive("underline"),
            () => editor.chain().focus().toggleUnderline().run(),
          )}
          {button(
            "Strikethrough",
            <Strikethrough size={14} />,
            editor.isActive("strike"),
            () => editor.chain().focus().toggleStrike().run(),
          )}
          <span className="mx-1 h-4 w-px bg-default-200" />
          {button(
            "Heading 1",
            <Heading1 size={14} />,
            editor.isActive("heading", { level: 1 }),
            () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          )}
          {button(
            "Heading 2",
            <Heading2 size={14} />,
            editor.isActive("heading", { level: 2 }),
            () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          )}
          {button(
            "Heading 3",
            <Heading3 size={14} />,
            editor.isActive("heading", { level: 3 }),
            () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          )}
          <span className="mx-1 h-4 w-px bg-default-200" />
          {button(
            "Bullet list",
            <List size={14} />,
            editor.isActive("bulletList"),
            () => editor.chain().focus().toggleBulletList().run(),
          )}
          {button(
            "Numbered list",
            <ListOrdered size={14} />,
            editor.isActive("orderedList"),
            () => editor.chain().focus().toggleOrderedList().run(),
          )}
          {button(
            "Checklist",
            <CheckSquare size={14} />,
            editor.isActive("taskList"),
            () => editor.chain().focus().toggleTaskList().run(),
          )}
          <span className="mx-1 h-4 w-px bg-default-200" />
          {button(
            "Code block",
            <Code2 size={14} />,
            editor.isActive("codeBlock"),
            () => editor.chain().focus().toggleCodeBlock().run(),
          )}
          {button(
            "Link",
            <LinkIcon size={14} />,
            editor.isActive("link"),
            () => {
              const previousUrl =
                (editor.getAttributes("link") as { href?: string }).href ?? "";
              const url = window.prompt("Link URL", previousUrl);
              if (url === null) return;
              if (url.trim() === "") {
                editor.chain().focus().unsetLink().run();
                return;
              }
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: url.trim() })
                .run();
            },
          )}
          {button(
            "Image",
            <ImageIcon size={14} />,
            false,
            () => fileInputRef.current?.click(),
            !canUploadImages,
          )}
          <span className="mx-1 h-4 w-px bg-default-200" />
          {button(
            "Undo",
            <Undo2 size={14} />,
            false,
            () => editor.chain().focus().undo().run(),
            !editor.can().undo(),
          )}
          {button(
            "Redo",
            <Redo2 size={14} />,
            false,
            () => editor.chain().focus().redo().run(),
            !editor.can().redo(),
          )}
          <input
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadImageFile(editor, file);
              }
              event.target.value = "";
            }}
          />
        </div>
      ) : null}
      <EditorContent
        className="prose prose-sm max-w-none px-3 py-3 text-sm leading-6 focus:outline-none [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:h-0 [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-default-400 [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
        editor={editor}
      />
    </div>
  );
};

export const buildDocFromPlainText = (plain: string | null): JSONContent => {
  if (!plain) return EMPTY_DOC;
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: plain }],
      },
    ],
  };
};

export type { JSONContent, Editor };
