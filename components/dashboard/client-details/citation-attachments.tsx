"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { FileText, Paperclip, Trash2, Upload, X } from "lucide-react";

import { clientsApi, type ClientCitationAttachment } from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { resolveServerAssetUrl } from "@/components/dashboard/client-details/task-panel/task-panel-utils";
import { useAppToast } from "@/hooks/use-app-toast";

interface CitationAttachmentsProps {
  citationId: string | number | null;
  clientId: string | number;
  refreshKey?: number;
}

const formatSize = (sizeBytes: number) => {
  if (sizeBytes < 1024) return `${sizeBytes}B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)}KB`;

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`;
};

const getAttachmentUrl = (attachment: ClientCitationAttachment) =>
  resolveServerAssetUrl(attachment.url) ?? attachment.url;

export const CitationAttachments = ({
  citationId,
  clientId,
  refreshKey = 0,
}: CitationAttachmentsProps) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<ClientCitationAttachment[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] =
    useState<ClientCitationAttachment | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<ClientCitationAttachment | null>(null);

  const loadAttachments = async () => {
    if (!session?.accessToken || !citationId) {
      setAttachments([]);

      return;
    }

    try {
      setIsLoading(true);
      const accessToken = await getValidAccessToken();
      const response = await clientsApi.listClientCitationAttachments(
        accessToken,
        clientId,
        citationId,
      );

      setAttachments(response.attachments);
    } catch (error) {
      toast.danger("Failed to load attachments.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!session?.accessToken || !citationId || isUploading) return;

    try {
      setIsUploading(true);
      const accessToken = await getValidAccessToken();
      const attachment = await clientsApi.uploadClientCitationAttachment(
        accessToken,
        clientId,
        citationId,
        file,
      );

      setAttachments((current) => [attachment, ...current]);
      toast.success("Attachment uploaded.");
    } catch (error) {
      toast.danger("Failed to upload attachment.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!attachmentToDelete || !session?.accessToken || !citationId) return;

    try {
      const accessToken = await getValidAccessToken();

      await clientsApi.deleteClientCitationAttachment(
        accessToken,
        clientId,
        citationId,
        attachmentToDelete.id,
      );
      setAttachments((current) =>
        current.filter((item) => item.id !== attachmentToDelete.id),
      );
      setAttachmentToDelete(null);
      toast.success("Attachment deleted.");
    } catch (error) {
      toast.danger("Failed to delete attachment.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  useEffect(() => {
    void loadAttachments();
  }, [clientId, citationId, refreshKey]);

  if (!citationId) {
    return (
      <div className="rounded-lg border border-dashed border-default-200 px-4 py-8 text-center text-sm text-default-500">
        Save the citation before uploading attachments.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-default-500">
          {isLoading ? "Loading attachments..." : `${attachments.length} files`}
        </p>
        <Button
          className="bg-[#022279] text-white"
          isLoading={isUploading}
          radius="sm"
          size="sm"
          startContent={<Upload size={14} />}
          onPress={() => fileInputRef.current?.click()}
        >
          Upload
        </Button>
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void handleUpload(file);
            }
            event.target.value = "";
          }}
        />
      </div>

      {attachments.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {attachments.map((attachment) => {
            const isImage = attachment.mimeType.startsWith("image/");
            const url = getAttachmentUrl(attachment);

            return (
              <div
                key={attachment.id}
                className="group relative rounded-lg border border-default-200 bg-white p-3"
              >
                <button
                  aria-label={`Delete ${attachment.filename}`}
                  className="absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-white text-default-500 shadow-sm ring-1 ring-default-200 hover:text-danger group-hover:flex"
                  type="button"
                  onClick={() => setAttachmentToDelete(attachment)}
                >
                  <X size={14} />
                </button>
                <button
                  className="flex w-full min-w-0 flex-col items-start gap-2 text-left"
                  type="button"
                  onClick={() => {
                    if (isImage) {
                      setPreviewAttachment(attachment);

                      return;
                    }
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={attachment.filename}
                      className="h-20 w-20 rounded-md border border-default-200 object-cover"
                      src={url}
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-md bg-default-100 text-default-500">
                      {attachment.mimeType === "application/pdf" ? (
                        <FileText size={28} />
                      ) : (
                        <Paperclip size={28} />
                      )}
                    </div>
                  )}
                  <span className="line-clamp-2 break-all text-sm font-medium text-default-800">
                    {attachment.filename}
                  </span>
                  {!isImage ? (
                    <span className="text-xs text-default-500">
                      {formatSize(attachment.sizeBytes)}
                    </span>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-default-200 px-4 py-8 text-center text-sm text-default-500">
          No attachments yet.
        </div>
      )}

      <Modal
        isOpen={previewAttachment !== null}
        size="3xl"
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachment(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader>
            {previewAttachment?.filename ?? "Image preview"}
          </ModalHeader>
          <ModalBody className="pb-6">
            {previewAttachment ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={previewAttachment.filename}
                className="max-h-[70vh] w-full rounded-md object-contain"
                src={getAttachmentUrl(previewAttachment)}
              />
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={attachmentToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAttachmentToDelete(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader>Delete attachment</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Delete {attachmentToDelete?.filename ?? "this attachment"}?
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              radius="sm"
              variant="light"
              onPress={() => setAttachmentToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              radius="sm"
              startContent={<Trash2 size={14} />}
              onPress={() => {
                void handleDelete();
              }}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
