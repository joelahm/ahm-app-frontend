import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";

import { RemoveEmbedButton } from "./embed-utils";

export const matchYouTubeUrl = (url: string) => {
  const match =
    url.match(/youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/i) ??
    url.match(/youtu\.be\/([\w-]{11})/i);

  return match?.[1] ?? null;
};

const YouTubeNodeView = (props: NodeViewProps) =>
  React.createElement(
    NodeViewWrapper,
    { className: "group relative my-3 overflow-hidden rounded-lg border border-default-200 bg-black" },
    React.createElement(RemoveEmbedButton, { deleteNode: props.deleteNode }),
    React.createElement("iframe", {
      allow:
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
      allowFullScreen: true,
      className: "aspect-video w-full",
      src: `https://www.youtube.com/embed/${props.node.attrs.videoId}`,
      title: "YouTube video",
    }),
  );

export const YouTubeEmbed = Node.create({
  name: "youtubeEmbed",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      videoId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-youtube-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-youtube-id": HTMLAttributes.videoId,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YouTubeNodeView);
  },
});
