"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@heroui/button";
import { InputOtp } from "@heroui/input-otp";
import { Input, Textarea } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import {
  Bold,
  ImageIcon,
  Italic,
  List,
  Paperclip,
  SendHorizontal,
  Strikethrough,
  Trash2,
  Underline,
  X,
} from "lucide-react";
import Image from "next/image";

import {
  websiteContentReviewsApi,
  type PublicWebsiteContentArticle,
  type PublicWebsiteContentResponse,
} from "@/apis/website-content-reviews";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  buildCommentMessage,
  buildPendingAttachmentsFromFileList,
  parseCommentAttachments,
  PendingAttachmentItem,
  validateCommentPayloadSize,
} from "@/lib/comment-attachments";

interface WebsiteContentReviewScreenProps {
  token: string;
}

type VerificationStep = "details" | "otp";

const FieldLabel = ({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor: string;
}) => (
  <label
    className="mb-1.5 block text-sm font-medium text-[#374151]"
    htmlFor={htmlFor}
  >
    {children}
  </label>
);

const sessionStorageKey = (token: string) =>
  `website-content-review-session:${token}`;

const emptyArticle: PublicWebsiteContentArticle = {
  altDescription: "",
  altTitle: "",
  contentType: null,
  featuredImage: null,
  generatedContent: "<p></p>",
  keyword: null,
  metaDescription: "",
  metaTitle: "",
  title: "",
  urlSlug: "",
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const formatSlugValue = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const resolveServerAssetUrl = (value?: string | null) => {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  const normalizedPath = value.replace(/^\/+/, "");

  return baseUrl ? `${baseUrl}/${normalizedPath}` : value;
};

const readFeaturedImageUrl = (value: unknown) => {
  if (typeof value === "string") {
    return resolveServerAssetUrl(value);
  }

  if (value && typeof value === "object") {
    const source = value as {
      previewUrl?: unknown;
      url?: unknown;
    };

    if (typeof source.previewUrl === "string") {
      return resolveServerAssetUrl(source.previewUrl);
    }

    if (typeof source.url === "string") {
      return resolveServerAssetUrl(source.url);
    }
  }

  return "";
};

const sanitizeCommentHtml = (html: string) => {
  if (typeof window === "undefined" || !html) {
    return "";
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(html, "text/html");
  const blockedTags = ["script", "style", "iframe", "object", "embed"];

  blockedTags.forEach((tagName) => {
    documentNode.querySelectorAll(tagName).forEach((node) => {
      node.remove();
    });
  });

  documentNode.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim().toLowerCase();

      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);

        return;
      }

      if (
        (attributeName === "href" || attributeName === "src") &&
        attributeValue.startsWith("javascript:")
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return documentNode.body.innerHTML;
};

export const WebsiteContentReviewScreen = ({
  token,
}: WebsiteContentReviewScreenProps) => {
  const toast = useAppToast();
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const commentEditorRef = useRef<HTMLDivElement | null>(null);
  const featuredImageInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<{
    articleTitle: string;
    clientName: string;
    expiresAt: string;
  } | null>(null);
  const [reviewSessionToken, setReviewSessionToken] = useState("");
  const [verificationStep, setVerificationStep] =
    useState<VerificationStep>("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [article, setArticle] =
    useState<PublicWebsiteContentArticle>(emptyArticle);
  const [contentData, setContentData] =
    useState<PublicWebsiteContentResponse | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [error, setError] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachmentItem[]
  >([]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState("");

  const isVerified = Boolean(reviewSessionToken);
  const comments = contentData?.comments ?? [];
  const reviewerEmail = contentData?.reviewer.email?.toLowerCase() ?? "";

  const pageTitle = useMemo(
    () =>
      status?.articleTitle ||
      article.title ||
      article.keyword ||
      "Website Content Review",
    [article.keyword, article.title, status?.articleTitle],
  );
  const featuredImageDetails = useMemo(() => {
    const url = readFeaturedImageUrl(article.featuredImage);

    if (!article.featuredImage || typeof article.featuredImage !== "object") {
      return {
        name: url ? "Featured image" : "",
        sizeLabel: "",
        url,
      };
    }

    const source = article.featuredImage as {
      name?: unknown;
      sizeLabel?: unknown;
    };

    return {
      name: typeof source.name === "string" ? source.name : "Featured image",
      sizeLabel: typeof source.sizeLabel === "string" ? source.sizeLabel : "",
      url,
    };
  }, [article.featuredImage]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(sessionStorageKey(token));

    if (savedToken) {
      setReviewSessionToken(savedToken);
    }
  }, [token]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCooldown]);

  useEffect(() => {
    let isMounted = true;

    const loadStatus = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await websiteContentReviewsApi.getPublicStatus(token);

        if (!isMounted) {
          return;
        }

        setStatus(response);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "This review link is unavailable.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!reviewSessionToken) {
      return;
    }

    let isMounted = true;

    const loadContent = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await websiteContentReviewsApi.getPublicContent(
          token,
          reviewSessionToken,
        );

        if (!isMounted) {
          return;
        }

        setContentData(response);
        setArticle({
          ...emptyArticle,
          ...response.article,
          generatedContent: response.article.generatedContent || "<p></p>",
        });
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        window.localStorage.removeItem(sessionStorageKey(token));
        setReviewSessionToken("");
        toast.warning("Please verify your email to continue.", {
          description:
            loadError instanceof Error ? loadError.message : undefined,
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadContent();

    return () => {
      isMounted = false;
    };
  }, [reviewSessionToken, token]);

  const handleSendOtp = async () => {
    if (verificationStep === "otp" && resendCooldown > 0) {
      return;
    }

    setIsSendingOtp(true);
    setError("");

    try {
      await websiteContentReviewsApi.sendOtp(token, { email, fullName });
      toast.success("Verification code sent.");
      setVerificationStep("otp");
      setResendCooldown(60);
    } catch (sendError) {
      toast.danger("Failed to send verification code.", {
        description: sendError instanceof Error ? sendError.message : undefined,
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsVerifying(true);
    setError("");

    try {
      const response = await websiteContentReviewsApi.verifyOtp(token, {
        email,
        otp,
      });

      window.localStorage.setItem(
        sessionStorageKey(token),
        response.reviewSessionToken,
      );
      setReviewSessionToken(response.reviewSessionToken);
      toast.success("Email verified.");
    } catch (verifyError) {
      toast.danger("Failed to verify code.", {
        description:
          verifyError instanceof Error ? verifyError.message : undefined,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    try {
      const articlePayload = {
        ...article,
        urlSlug: formatSlugValue(article.urlSlug ?? ""),
      };
      const response = await websiteContentReviewsApi.savePublicContent(
        token,
        reviewSessionToken,
        articlePayload,
      );
      const refreshed = await websiteContentReviewsApi.getPublicContent(
        token,
        reviewSessionToken,
      );

      setArticle({
        ...emptyArticle,
        ...response.article,
        generatedContent: response.article.generatedContent || "<p></p>",
      });
      setContentData(refreshed);
      toast.success("Content saved.");
    } catch (saveError) {
      toast.danger("Failed to save content.", {
        description: saveError instanceof Error ? saveError.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFeaturedImageUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) {
        return;
      }

      const file = fileList[0];

      if (!file.type.startsWith("image/")) {
        toast.danger("Please upload an image file.");

        return;
      }

      try {
        if (!reviewSessionToken) {
          throw new Error(
            "Please verify your email before uploading an image.",
          );
        }

        const formData = new FormData();

        formData.append("featuredImage", file);
        const uploadedImage =
          await websiteContentReviewsApi.uploadPublicFeaturedImage(
            token,
            reviewSessionToken,
            formData,
          );

        setArticle((current) => ({
          ...current,
          featuredImage: {
            name: uploadedImage.name,
            previewUrl: uploadedImage.previewUrl,
            sizeLabel: uploadedImage.sizeLabel,
            url: uploadedImage.url,
          },
        }));
      } catch (uploadError) {
        toast.danger("Failed to upload image.", {
          description:
            uploadError instanceof Error ? uploadError.message : undefined,
        });
      }
    },
    [reviewSessionToken, toast, token],
  );

  const handleRemoveFeaturedImage = useCallback(() => {
    setArticle((current) => ({
      ...current,
      featuredImage: null,
    }));
  }, []);

  const applyEditorCommand = useCallback((command: string) => {
    commentEditorRef.current?.focus();
    document.execCommand(command);
    setCommentInput(commentEditorRef.current?.innerText ?? "");
  }, []);

  const handleAttachmentSelection = useCallback(
    async (
      fileList: FileList | null,
      options?: {
        imageOnly?: boolean;
      },
    ) => {
      if (!fileList || fileList.length === 0) {
        return;
      }

      try {
        const result = await buildPendingAttachmentsFromFileList(fileList, {
          currentAttachments: pendingAttachments,
          imageOnly: options?.imageOnly,
        });

        if (result.attachments.length > 0) {
          setPendingAttachments((current) => [
            ...current,
            ...result.attachments,
          ]);
        }

        if (
          result.countExceededFiles.length ||
          result.oversizedFiles.length ||
          result.totalSizeExceededFiles.length ||
          result.unsupportedFiles.length
        ) {
          toast.warning("Some attachments were not added.", {
            description: [
              result.countExceededFiles.length
                ? "Too many files selected."
                : "",
              result.oversizedFiles.length
                ? "Some files are over the attachment limit."
                : "",
              result.totalSizeExceededFiles.length
                ? "The selected files are too large together."
                : "",
              result.unsupportedFiles.length
                ? "Some file types are not supported."
                : "",
            ]
              .filter(Boolean)
              .join(" "),
          });
        }
      } catch (attachmentError) {
        toast.danger("Failed to attach file.", {
          description:
            attachmentError instanceof Error
              ? attachmentError.message
              : undefined,
        });
      }
    },
    [pendingAttachments, toast],
  );

  const handleAddComment = async () => {
    const editorHtml = commentEditorRef.current?.innerHTML?.trim() ?? "";
    const message = buildCommentMessage({
      editorHtml,
      pendingAttachments,
      plainText: commentInput,
    });

    if (!message.trim()) {
      return;
    }

    const payloadSize = validateCommentPayloadSize(message);

    if (!payloadSize.isValid) {
      toast.danger("Comment is too large.", {
        description: "Remove some text or attachments, then try again.",
      });

      return;
    }

    setIsAddingComment(true);
    setError("");

    try {
      const response = await websiteContentReviewsApi.addPublicComment(
        token,
        reviewSessionToken,
        message,
      );

      setContentData((current) =>
        current
          ? {
              ...current,
              comments: [...current.comments, response.comment],
            }
          : current,
      );
      setCommentInput("");
      setPendingAttachments([]);
      if (commentEditorRef.current) {
        commentEditorRef.current.innerHTML = "";
      }
      toast.success("Comment added.");
    } catch (commentError) {
      toast.danger("Failed to add comment.", {
        description:
          commentError instanceof Error ? commentError.message : undefined,
      });
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setIsDeletingCommentId(commentId);

    try {
      await websiteContentReviewsApi.deletePublicComment(
        token,
        reviewSessionToken,
        commentId,
      );
      setContentData((current) =>
        current
          ? {
              ...current,
              comments: current.comments.filter(
                (commentItem) => commentItem.id !== commentId,
              ),
            }
          : current,
      );
      toast.success("Comment deleted.");
    } catch (deleteError) {
      toast.danger("Failed to delete comment.", {
        description:
          deleteError instanceof Error ? deleteError.message : undefined,
      });
    } finally {
      setIsDeletingCommentId("");
    }
  };

  if (isLoading && !status && !contentData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB]">
        <Spinner size="lg" />
      </main>
    );
  }

  if (error && !status) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-4">
        <div className="w-full max-w-md rounded-lg border border-danger-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-[#111827]">
            Review Link Unavailable
          </h1>
          <p className="mt-2 text-sm text-danger">{error}</p>
        </div>
      </main>
    );
  }

  if (!isVerified) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-4 py-10">
        <div className="w-full max-w-lg rounded-lg border border-default-200 bg-white p-6">
          <p className="text-sm font-medium text-[#6B7280]">
            {status?.clientName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[#111827]">
            {pageTitle}
          </h1>
          {verificationStep === "details" ? (
            <>
              <p className="mt-2 text-sm text-[#6B7280]">
                Enter your details to receive a verification code.
              </p>
              <div className="mt-6 space-y-3">
                <div>
                  <FieldLabel htmlFor="reviewer-full-name">
                    Full Name
                  </FieldLabel>
                  <Input
                    id="reviewer-full-name"
                    size="sm"
                    value={fullName}
                    variant="bordered"
                    onValueChange={setFullName}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="reviewer-email">Email</FieldLabel>
                  <Input
                    id="reviewer-email"
                    size="sm"
                    type="email"
                    value={email}
                    variant="bordered"
                    onValueChange={setEmail}
                  />
                </div>
                <Button
                  fullWidth
                  className="bg-[#022279] text-white"
                  isLoading={isSendingOtp}
                  onPress={() => {
                    void handleSendOtp();
                  }}
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-[#6B7280]">
                Enter the six-digit code sent to{" "}
                <span className="font-medium text-[#111827]">{email}</span>.
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex justify-start">
                  <InputOtp
                    allowedKeys="^[0-9]*$"
                    aria-label="Verification code"
                    length={6}
                    size="lg"
                    value={otp}
                    variant="bordered"
                    onComplete={(value) => {
                      setOtp(value ?? "");
                    }}
                    onValueChange={setOtp}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="w-full"
                    variant="bordered"
                    onPress={() => {
                      setVerificationStep("details");
                      setOtp("");
                      setError("");
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    className="bg-[#022279] text-white w-full"
                    isDisabled={otp.length !== 6}
                    isLoading={isVerifying}
                    onPress={() => {
                      void handleVerifyOtp();
                    }}
                  >
                    Verify
                  </Button>
                </div>
                <div className="flex justify-start">
                  <Button
                    isDisabled={resendCooldown > 0}
                    isLoading={isSendingOtp}
                    size="sm"
                    variant="light"
                    onPress={() => {
                      void handleSendOtp();
                    }}
                  >
                    {resendCooldown > 0
                      ? `Resend Code (${resendCooldown}s)`
                      : "Resend Code"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-lg border border-default-200 bg-white p-4">
          <p className="text-sm font-medium text-[#6B7280]">
            {contentData?.clientName || status?.clientName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[#111827]">
            {pageTitle}
          </h1>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-4 rounded-lg border border-default-200 bg-white p-4">
            <div>
              <FieldLabel htmlFor="review-article-title">
                Article Title
              </FieldLabel>
              <Input
                id="review-article-title"
                value={article.title ?? ""}
                variant="bordered"
                onValueChange={(value) => {
                  setArticle((current) => ({ ...current, title: value }));
                }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="review-url-slug">URL Slug</FieldLabel>
              <Input
                id="review-url-slug"
                value={article.urlSlug ?? ""}
                variant="bordered"
                onBlur={(event) => {
                  setArticle((current) => ({
                    ...current,
                    urlSlug: formatSlugValue(event.target.value),
                  }));
                }}
                onValueChange={(value) => {
                  setArticle((current) => ({
                    ...current,
                    urlSlug: value,
                  }));
                }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="review-meta-title">Meta Title</FieldLabel>
              <Input
                id="review-meta-title"
                value={article.metaTitle ?? ""}
                variant="bordered"
                onValueChange={(value) => {
                  setArticle((current) => ({ ...current, metaTitle: value }));
                }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="review-meta-description">
                Meta Description
              </FieldLabel>
              <Textarea
                id="review-meta-description"
                value={article.metaDescription ?? ""}
                variant="bordered"
                onValueChange={(value) => {
                  setArticle((current) => ({
                    ...current,
                    metaDescription: value,
                  }));
                }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#374151]">Content</p>
              <RichTextEditor
                minHeightClassName="min-h-[360px]"
                value={article.generatedContent || "<p></p>"}
                onChange={(value) => {
                  setArticle((current) => ({
                    ...current,
                    generatedContent: value,
                  }));
                }}
              />
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <section className="rounded-lg border border-default-200 bg-white p-4">
              <Button
                fullWidth
                className="bg-[#022279] text-white"
                isLoading={isSaving}
                onPress={() => {
                  void handleSave();
                }}
              >
                Save Changes
              </Button>
            </section>

            <section className="space-y-4 rounded-lg border border-default-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-[#111827]">
                Featured Image
              </h2>
              <div className="w-full rounded-xl border border-default-200 p-2">
                <button
                  className="block w-full"
                  type="button"
                  onClick={() => {
                    if (featuredImageDetails.url) {
                      window.open(
                        featuredImageDetails.url,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    } else {
                      featuredImageInputRef.current?.click();
                    }
                  }}
                >
                  {featuredImageDetails.url ? (
                    <Image
                      unoptimized
                      alt={featuredImageDetails.name}
                      className="aspect-[2/1.3] w-full rounded-lg object-cover"
                      height={96}
                      src={featuredImageDetails.url}
                      width={160}
                    />
                  ) : (
                    <div className="flex aspect-[2/1.3] items-center justify-center rounded-lg bg-[#F3F4F6] text-xs text-[#6B7280]">
                      No image
                    </div>
                  )}
                </button>
                {featuredImageDetails.url ? (
                  <>
                    <p className="mt-2 truncate text-xs text-[#111827]">
                      {featuredImageDetails.name}
                    </p>
                    {featuredImageDetails.sizeLabel ? (
                      <p className="text-[11px] text-[#9CA3AF]">
                        {featuredImageDetails.sizeLabel}
                      </p>
                    ) : null}
                  </>
                ) : null}
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    isIconOnly
                    radius="full"
                    size="sm"
                    variant="flat"
                    onPress={() => {
                      featuredImageInputRef.current?.click();
                    }}
                  >
                    <ImageIcon size={14} />
                  </Button>
                  <Button
                    isIconOnly
                    isDisabled={!featuredImageDetails.url}
                    radius="full"
                    size="sm"
                    variant="flat"
                    onPress={handleRemoveFeaturedImage}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <input
                  ref={featuredImageInputRef}
                  accept="image/*"
                  className="hidden"
                  type="file"
                  onChange={(event) => {
                    void handleFeaturedImageUpload(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>
            </section>
            <section className="rounded-lg border border-default-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-[#111827]">Comments</h2>
              <div className="mt-3 max-h-[360px] space-y-3 overflow-y-auto">
                {comments.length ? (
                  comments.map((item) => {
                    const parsedComment = parseCommentAttachments(item.comment);
                    const canDelete =
                      item.authorEmail?.toLowerCase() === reviewerEmail;

                    return (
                      <div key={item.id} className="text-sm">
                        {parsedComment.richHtml ? (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: sanitizeCommentHtml(
                                parsedComment.richHtml,
                              ),
                            }}
                            className="prose prose-sm max-w-none text-sm text-[#111827]"
                          />
                        ) : (
                          <p className="whitespace-pre-wrap text-[#111827]">
                            {parsedComment.body || "Attachment"}
                          </p>
                        )}

                        {parsedComment.attachments.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {parsedComment.attachments.map(
                              (attachment, index) => (
                                <button
                                  key={attachment.id ?? `${item.id}-${index}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-default-200 bg-[#F9FAFB] px-3 py-1 text-xs text-[#374151]"
                                  type="button"
                                  onClick={() => {
                                    if (attachment.dataUrl) {
                                      window.open(
                                        attachment.dataUrl,
                                        "_blank",
                                        "noopener,noreferrer",
                                      );
                                    }
                                  }}
                                >
                                  <Paperclip size={12} />
                                  <span>{attachment.name}</span>
                                </button>
                              ),
                            )}
                          </div>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#6B7280]">
                          <span>
                            {item.authorName} • {formatDateTime(item.createdAt)}
                          </span>
                          {canDelete ? (
                            <Button
                              isIconOnly
                              className="text-danger"
                              isDisabled={isDeletingCommentId === item.id}
                              radius="full"
                              size="sm"
                              variant="light"
                              onPress={() => {
                                void handleDeleteComment(item.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-lg bg-[#F9FAFB] p-3 text-sm text-[#6B7280]">
                    No comments yet for this content.
                  </div>
                )}
              </div>
              <div className="mt-3">
                {pendingAttachments.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pb-3">
                    {pendingAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="inline-flex items-center gap-2 rounded-full border border-default-200 bg-[#F9FAFB] px-3 py-1 text-xs text-[#374151]"
                      >
                        <Paperclip size={12} />
                        <span>{attachment.name}</span>
                        <button
                          className="text-[#9CA3AF] hover:text-[#111827]"
                          type="button"
                          onClick={() => {
                            setPendingAttachments((current) =>
                              current.filter(
                                (pending) => pending.id !== attachment.id,
                              ),
                            );
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div
                  ref={commentEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[72px] rounded-md border border-default-200 px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#022279]"
                  role="textbox"
                  onInput={(event) => {
                    setCommentInput(event.currentTarget.innerText || "");
                  }}
                />
                <div className="mt-3 flex items-center justify-between border-t border-default-200 pt-2">
                  <div className="flex items-center gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => applyEditorCommand("bold")}
                    >
                      <Bold size={14} />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => applyEditorCommand("italic")}
                    >
                      <Italic size={14} />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => applyEditorCommand("underline")}
                    >
                      <Underline size={14} />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => applyEditorCommand("strikeThrough")}
                    >
                      <Strikethrough size={14} />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => applyEditorCommand("insertUnorderedList")}
                    >
                      <List size={14} />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => {
                        attachmentInputRef.current?.click();
                      }}
                    >
                      <Paperclip size={14} />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => {
                        imageInputRef.current?.click();
                      }}
                    >
                      <ImageIcon size={14} />
                    </Button>
                    <input
                      ref={attachmentInputRef}
                      multiple
                      className="hidden"
                      type="file"
                      onChange={(event) => {
                        void handleAttachmentSelection(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <input
                      ref={imageInputRef}
                      multiple
                      accept="image/*"
                      className="hidden"
                      type="file"
                      onChange={(event) => {
                        void handleAttachmentSelection(event.target.files, {
                          imageOnly: true,
                        });
                        event.target.value = "";
                      }}
                    />
                  </div>
                  <Button
                    className="bg-[#022279] text-white"
                    endContent={<SendHorizontal size={14} />}
                    isDisabled={
                      isAddingComment ||
                      (!commentInput.trim() && pendingAttachments.length === 0)
                    }
                    isLoading={isAddingComment}
                    size="sm"
                    onPress={() => {
                      void handleAddComment();
                    }}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
};
