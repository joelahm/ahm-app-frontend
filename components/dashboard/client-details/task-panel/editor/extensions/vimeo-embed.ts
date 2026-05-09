import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";

import { RemoveEmbedButton } from "./embed-utils";

export const matchVimeoUrl = (url: string) => {
  const match = url.match(/vimeo\.com\/(\d+)/i);

  return match?.[1] ?? null;
};

const VimeoNodeView = (props: NodeViewProps) =>
  React.createElement(
    NodeViewWrapper,
    {
      className:
        "group relative my-3 overflow-hidden rounded-lg border border-default-200 bg-black",
    },
    React.createElement(RemoveEmbedButton, { deleteNode: props.deleteNode }),
    React.createElement("iframe", {
      allow: "autoplay; fullscreen; picture-in-picture",
      allowFullScreen: true,
      className: "aspect-video w-full",
      src: `https://player.vimeo.com/video/${props.node.attrs.videoId}`,
      title: "Vimeo video",
    }),
  );

export const VimeoEmbed = Node.create({
  name: "vimeoEmbed",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      videoId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-vimeo-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-vimeo-id": HTMLAttributes.videoId,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VimeoNodeView);
  },
});
