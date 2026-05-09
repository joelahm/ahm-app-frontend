import type { NodeViewProps } from "@tiptap/react";

import React from "react";

export const removeButtonClassName =
  "absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-white/95 text-default-500 shadow-sm ring-1 ring-default-200 hover:text-danger group-hover:flex";

export const RemoveEmbedButton = ({
  deleteNode,
}: Pick<NodeViewProps, "deleteNode">) =>
  React.createElement(
    "button",
    {
      "aria-label": "Remove embed",
      className: removeButtonClassName,
      type: "button",
      onClick: deleteNode,
    },
    "X",
  );

export const getPlainUrlFromText = (text: string) => {
  const trimmed = text.trim();

  if (!/^https?:\/\/\S+$/i.test(trimmed)) return null;

  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
};
