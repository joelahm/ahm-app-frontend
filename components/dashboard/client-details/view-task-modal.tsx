"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { DatePicker } from "@heroui/date-picker";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { parseDate } from "@internationalized/date";
import { SendHorizontal, Trash2, X } from "lucide-react";

import { useAuth } from "@/components/auth/auth-context";

const taskStatusOptions = ["TODO", "IN PROGRESS", "DONE", "ON HOLD"];

type ViewTaskFormValues = {
  assigneeId: string;
  comment: string;
  description: string;
  dueDate: string;
  projectId: string;
  startDate: string;
  status: string;
  taskName: string;
};

type TaskComment = {
  author: string;
  createdAt: string;
  message: string;
  userId?: string;
};

interface ViewTaskModalProps {
  isOpen: boolean;
  onDelete?: () => Promise<void> | void;
  onOpenChange: (isOpen: boolean) => void;
  onSave?: (values: ViewTaskFormValues) => Promise<void> | void;
  projectOptions: Array<{ id: string; label: string }>;
  task: {
    assigneeId: string;
    assigneeName: string;
    comment: string;
    description: string;
    dueDate: string;
    projectId: string;
    startDate: string;
    status: string;
    taskName: string;
  } | null;
  users: Array<{ id: string; name: string }>;
}

const labelClassName = "mb-1.5 block text-sm text-[#4B5563]";

const toCalendarDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const normalized = value.includes("T") ? value.slice(0, 10) : value;

  try {
    return parseDate(normalized);
  } catch {
    return null;
  }
};

const toDateString = (value?: string) => {
  if (!value) {
    return "";
  }

  return value.includes("T") ? value.slice(0, 10) : value;
};

export const ViewTaskModal = ({
  isOpen,
  onDelete,
  onOpenChange,
  onSave,
  projectOptions,
  task,
  users,
}: ViewTaskModalProps) => {
  const { session } = useAuth();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const { control, handleSubmit, reset } = useForm<ViewTaskFormValues>({
    defaultValues: {
      assigneeId: "",
      comment: "",
      description: "",
      dueDate: "",
      projectId: "",
      startDate: "",
      status: "TODO",
      taskName: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialComment = task?.comment?.trim();

    setComments(
      initialComment
        ? [
            {
              author: task?.assigneeName || "User",
              createdAt: "Just now",
              message: initialComment,
              userId: task?.assigneeId,
            },
          ]
        : [],
    );
    setComment("");
    reset({
      assigneeId: task?.assigneeId ?? "",
      comment: task?.comment ?? "",
      description: task?.description ?? "",
      dueDate: toDateString(task?.dueDate),
      projectId: task?.projectId ?? "",
      startDate: toDateString(task?.startDate),
      status: task?.status ?? "TODO",
      taskName: task?.taskName ?? "",
    });
  }, [isOpen, reset, task]);

  const currentUserId =
    session?.user?.id === undefined || session.user.id === null
      ? ""
      : String(session.user.id);

  const closeModal = () => {
    if (isSavingTask || isDeletingTask) {
      return;
    }

    onOpenChange(false);
    reset();
    setComment("");
    setComments([]);
  };

  const handleAddComment = () => {
    const normalizedComment = comment.trim();

    if (!normalizedComment) {
      return;
    }

    setComments((previousComments) => [
      ...previousComments,
      {
        author: "You",
        createdAt: "Just now",
        message: normalizedComment,
        userId: currentUserId,
      },
    ]);
    setComment("");
  };

  const handleDeleteComment = (commentIndex: number) => {
    setComments((previousComments) =>
      previousComments.filter((_, index) => index !== commentIndex),
    );
  };

  const handleSaveTask = handleSubmit(async (values) => {
    if (!onSave || isSavingTask) {
      return;
    }

    setIsSavingTask(true);

    try {
      await onSave(values);
      closeModal();
    } finally {
      setIsSavingTask(false);
    }
  });

  const handleDeleteTask = async () => {
    if (!onDelete || isDeletingTask) {
      return;
    }

    setIsDeletingTask(true);

    try {
      await onDelete();
      closeModal();
    } finally {
      setIsDeletingTask(false);
    }
  };

  return (
    <Modal
      hideCloseButton
      isDismissable={false}
      isOpen={isOpen}
      size="4xl"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between border-b border-default-200">
          <h2 className="text-lg font-semibold text-[#111827]">View Task</h2>
          <Button
            isIconOnly
            isDisabled={isDeletingTask || isSavingTask}
            radius="full"
            size="sm"
            variant="light"
            onPress={closeModal}
          >
            <X size={20} />
          </Button>
        </ModalHeader>
        <ModalBody className="max-h-[78vh] overflow-hidden py-5">
          <div className="grid h-full gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div>
                <p className={labelClassName}>Task name</p>
                <Controller
                  control={control}
                  name="taskName"
                  render={({ field }) => (
                    <Input {...field} radius="sm" size="sm" />
                  )}
                />
              </div>
              <div>
                <p className={labelClassName}>Project type</p>
                <Controller
                  control={control}
                  name="projectId"
                  render={({ field }) => (
                    <Select
                      disallowEmptySelection
                      items={projectOptions}
                      radius="sm"
                      selectedKeys={field.value ? [field.value] : []}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const [selected] = Array.from(keys).map(String);

                        field.onChange(selected ?? "");
                      }}
                    >
                      {(item) => (
                        <SelectItem key={item.id}>{item.label}</SelectItem>
                      )}
                    </Select>
                  )}
                />
              </div>
              <div>
                <p className={labelClassName}>Description</p>
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <Textarea {...field} minRows={3} radius="sm" size="sm" />
                  )}
                />
              </div>
              <div>
                <p className={labelClassName}>Status</p>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      disallowEmptySelection
                      items={taskStatusOptions.map((status) => ({
                        id: status,
                        label: status,
                      }))}
                      radius="sm"
                      selectedKeys={field.value ? [field.value] : []}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const [selected] = Array.from(keys).map(String);

                        field.onChange(selected ?? "");
                      }}
                    >
                      {(item) => (
                        <SelectItem key={item.id}>{item.label}</SelectItem>
                      )}
                    </Select>
                  )}
                />
              </div>
              <div>
                <p className={labelClassName}>Assignee</p>
                <Controller
                  control={control}
                  name="assigneeId"
                  render={({ field }) => (
                    <Select
                      disallowEmptySelection
                      items={users}
                      radius="sm"
                      selectedKeys={field.value ? [field.value] : []}
                      size="sm"
                      onSelectionChange={(keys) => {
                        const [selected] = Array.from(keys).map(String);

                        field.onChange(selected ?? "");
                      }}
                    >
                      {(item) => (
                        <SelectItem key={item.id}>{item.name}</SelectItem>
                      )}
                    </Select>
                  )}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className={labelClassName}>Start date</p>
                  <Controller
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                      <DatePicker
                        hideTimeZone
                        radius="sm"
                        size="sm"
                        value={toCalendarDate(field.value)}
                        onChange={(value) => {
                          field.onChange(value ? value.toString() : "");
                        }}
                      />
                    )}
                  />
                </div>
                <div>
                  <p className={labelClassName}>Due date</p>
                  <Controller
                    control={control}
                    name="dueDate"
                    render={({ field }) => (
                      <DatePicker
                        hideTimeZone
                        radius="sm"
                        size="sm"
                        value={toCalendarDate(field.value)}
                        onChange={(value) => {
                          field.onChange(value ? value.toString() : "");
                        }}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-col">
              <p className={labelClassName}>Comment</p>
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="max-h-[38vh] min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-sm text-default-500">No comments yet.</p>
                  ) : (
                    comments.map((item, index) => (
                      <div
                        key={`${item.message}-${index}`}
                        className="space-y-1.5 rounded-md border border-default-200 bg-default-50 px-2.5 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <div className="grid h-6 w-6 place-items-center rounded-full bg-default-200 text-xs font-semibold text-[#111827]">
                              {item.author.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#111827]">
                                {item.author}
                              </p>
                              <p className="text-xs text-default-500">
                                {item.createdAt}
                              </p>
                            </div>
                          </div>
                          {item.userId && item.userId === currentUserId ? (
                            <Button
                              isIconOnly
                              className="h-6 min-w-6 text-danger"
                              radius="full"
                              size="sm"
                              variant="light"
                              onPress={() => {
                                handleDeleteComment(index);
                              }}
                            >
                              <Trash2 size={16} />
                            </Button>
                          ) : null}
                        </div>
                        <p className="text-xs leading-5 text-[#111827]">
                          {item.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="sticky bottom-0 flex items-center gap-2 rounded-lg border border-default-200 bg-white p-2">
                  <Input
                    placeholder="Enter your comment"
                    radius="sm"
                    size="sm"
                    value={comment}
                    onChange={(event) => {
                      setComment(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && comment.trim()) {
                        event.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    isIconOnly
                    className="bg-[#022279] text-white"
                    isDisabled={!comment.trim()}
                    radius="sm"
                    onPress={handleAddComment}
                  >
                    <SendHorizontal size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="border-t border-default-200">
          {onDelete ? (
            <Button
              color="danger"
              isDisabled={isSavingTask}
              isLoading={isDeletingTask}
              radius="sm"
              startContent={<Trash2 size={16} />}
              variant="light"
              onPress={() => {
                void handleDeleteTask();
              }}
            >
              Delete
            </Button>
          ) : null}
          <Button
            isDisabled={isDeletingTask || isSavingTask}
            radius="sm"
            variant="bordered"
            onPress={closeModal}
          >
            Close
          </Button>
          <Button
            className="bg-[#022279] text-white"
            isDisabled={!onSave || isDeletingTask}
            isLoading={isSavingTask}
            radius="sm"
            onPress={() => {
              void handleSaveTask();
            }}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
