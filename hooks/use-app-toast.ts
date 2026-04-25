"use client";

import { addToast } from "@heroui/toast";

type ToastTone =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger";

interface ShowToastOptions {
  description?: string;
  timeout?: number;
  tone?: ToastTone;
}

const DEFAULT_TIMEOUT = 3000;

export const useAppToast = () => {
  const showToast = (title: string, options?: ShowToastOptions) => {
    const tone = options?.tone ?? "default";

    addToast({
      color: tone,
      description: options?.description,
      severity: tone,
      timeout: options?.timeout ?? DEFAULT_TIMEOUT,
      title,
    });
  };

  return {
    danger: (title: string, options?: Omit<ShowToastOptions, "tone">) =>
      showToast(title, { ...options, tone: "danger" }),
    info: (title: string, options?: Omit<ShowToastOptions, "tone">) =>
      showToast(title, { ...options, tone: "primary" }),
    show: showToast,
    success: (title: string, options?: Omit<ShowToastOptions, "tone">) =>
      showToast(title, { ...options, tone: "success" }),
    warning: (title: string, options?: Omit<ShowToastOptions, "tone">) =>
      showToast(title, { ...options, tone: "warning" }),
  };
};
