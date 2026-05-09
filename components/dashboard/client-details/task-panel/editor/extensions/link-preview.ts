import React, { useEffect } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";

import { RemoveEmbedButton } from "./embed-utils";

export interface UrlPreviewData {
  description: string | null;
  fetchedAt?: string | null;
  image: string | null;
  siteName: string | null;
  title: string | null;
  url: string;
}

interface LinkPreviewOptions {
  fetchPreview?: (url: string) => Promise<UrlPreviewData>;
}

const previewCache = new Map<string, UrlPreviewData>();

const replaceWithPlainLink = (props: NodeViewProps) => {
  const position = props.getPos();
  if (typeof position !== "number") {
    props.deleteNode();
    return;
  }

  const url = String(props.node.attrs.url || "");

  props.editor
    .chain()
    .focus()
    .deleteRange({ from: position, to: position + props.node.nodeSize })
    .insertContent(`<a href="${url}">${url}</a>`)
    .run();
};

const LinkPreviewNodeView = (props: NodeViewProps) => {
  const { fetchPreview } = props.extension.options as LinkPreviewOptions;
  const url = String(props.node.attrs.url || "");
  const status = String(props.node.attrs.status || "loading");

  useEffect(() => {
    if (!url || status !== "loading") return;

    const cached = previewCache.get(url);
    if (cached) {
      props.updateAttributes({ ...cached, status: "ready" });
      return;
    }

    if (!fetchPreview) {
      replaceWithPlainLink(props);
      return;
    }

    const timeout = window.setTimeout(() => {
      fetchPreview(url)
        .then((preview) => {
          previewCache.set(url, preview);
          props.updateAttributes({ ...preview, status: "ready" });
        })
        .catch(() => {
          replaceWithPlainLink(props);
        });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [fetchPreview, props, status, url]);

  const image = String(props.node.attrs.image || "");
  const title = String(props.node.attrs.title || "") || url;
  const description = String(props.node.attrs.description || "");
  const siteName = String(props.node.attrs.siteName || "");

  return React.createElement(
    NodeViewWrapper,
    {
      className:
        "group relative my-3 overflow-hidden rounded-lg border border-default-200 bg-white",
    },
    React.createElement(RemoveEmbedButton, { deleteNode: props.deleteNode }),
    React.createElement(
      "a",
      {
        className: "flex min-h-[104px] gap-3 p-3 no-underline",
        href: url,
        rel: "noopener noreferrer",
        target: "_blank",
      },
      image
        ? React.createElement("img", {
            alt: "",
            className: "h-20 w-24 flex-none rounded-md object-cover",
            src: image,
          })
        : null,
      React.createElement(
        "div",
        { className: "min-w-0 flex-1" },
        React.createElement(
          "p",
          { className: "line-clamp-1 text-sm font-semibold text-default-900" },
          status === "loading" ? "Loading preview..." : title,
        ),
        description
          ? React.createElement(
              "p",
              { className: "mt-1 line-clamp-2 text-xs leading-5 text-default-500" },
              description,
            )
          : null,
        React.createElement(
          "p",
          { className: "mt-2 line-clamp-1 text-xs text-default-400" },
          siteName || url,
        ),
      ),
    ),
  );
};

export const LinkPreview = Node.create<LinkPreviewOptions>({
  name: "linkPreview",
  group: "block",
  atom: true,
  selectable: true,

  addOptions() {
    return {
      fetchPreview: undefined,
    };
  },

  addAttributes() {
    return {
      url: { default: null },
      title: { default: null },
      description: { default: null },
      image: { default: null },
      siteName: { default: null },
      status: { default: "loading" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-link-preview-url]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-link-preview-url": HTMLAttributes.url,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkPreviewNodeView);
  },
});
