import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";

import { RemoveEmbedButton } from "./embed-utils";

export const matchFigmaUrl = (url: string) => {
  const match = url.match(
    /figma\.com\/(file|design|board|proto)\/[A-Za-z0-9]+/i,
  );

  return match ? url : null;
};

const FigmaNodeView = (props: NodeViewProps) =>
  React.createElement(
    NodeViewWrapper,
    {
      className:
        "group relative my-3 max-w-[500px] overflow-hidden rounded-lg border border-default-200 bg-white",
    },
    React.createElement(RemoveEmbedButton, { deleteNode: props.deleteNode }),
    React.createElement("iframe", {
      allowFullScreen: true,
      className: "h-[420px] w-full",
      src: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(
        props.node.attrs.url,
      )}`,
      title: "Figma embed",
    }),
  );

export const FigmaEmbed = Node.create({
  name: "figmaEmbed",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      url: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-figma-url]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-figma-url": HTMLAttributes.url,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigmaNodeView);
  },
});
