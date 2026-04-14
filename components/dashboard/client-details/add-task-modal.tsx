"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { X } from "lucide-react";

const addTaskSchema = yup.object({
  description: yup.string().required("Description is required"),
  taskName: yup.string().required("Task name is required"),
});

export type AddTaskFormValues = yup.InferType<typeof addTaskSchema>;

interface AddTaskModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (payload: AddTaskFormValues) => void | Promise<void>;
  users?: Array<{
    avatar?: string | null;
    id: string;
    name: string;
  }>;
}

const labelClassName = "mb-1.5 block text-sm text-[#4B5563]";

export const AddTaskModal = ({
  isOpen,
  onOpenChange,
  onSubmit,
  users: _users,
}: AddTaskModalProps) => {
  const [submitError, setSubmitError] = useState("");
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddTaskFormValues>({
    defaultValues: {
      description: "",
      taskName: "",
    },
    mode: "onBlur",
  });
  const closeModal = () => {
    onOpenChange(false);
    reset();
    clearErrors();
    setSubmitError("");
  };

  const submitTask = async (values: AddTaskFormValues) => {
    clearErrors();
    setSubmitError("");

    try {
      const validatedValues = await addTaskSchema.validate(values, {
        abortEarly: false,
      });

      await onSubmit(validatedValues);
      closeModal();
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (!issue.path) {
            return;
          }

          setError(issue.path as keyof AddTaskFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      setSubmitError(
        error instanceof Error ? error.message : "Failed to add task.",
      );
    }
  };

  return (
    <Modal
      hideCloseButton
      isDismissable={false}
      isOpen={isOpen}
      size="xl"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between border-b border-default-200">
          <h2 className="text-lg font-semibold text-[#111827]">Add Task</h2>
          <Button
            isIconOnly
            radius="full"
            size="sm"
            variant="light"
            onPress={closeModal}
          >
            <X size={20} />
          </Button>
        </ModalHeader>
        <ModalBody className="space-y-4 py-5">
          {submitError ? (
            <p className="text-sm text-danger">{submitError}</p>
          ) : null}
          <div>
            <p className={labelClassName}>Task name</p>
            <Controller
              control={control}
              name="taskName"
              render={({ field }) => (
                <Input
                  errorMessage={errors.taskName?.message}
                  isInvalid={!!errors.taskName}
                  radius="sm"
                  size="sm"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <div>
            <p className={labelClassName}>Description</p>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Textarea
                  errorMessage={errors.description?.message}
                  isInvalid={!!errors.description}
                  minRows={3}
                  radius="sm"
                  size="sm"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </ModalBody>
        <ModalFooter className="border-t border-default-200">
          <Button radius="sm" variant="bordered" onPress={closeModal}>
            Cancel
          </Button>
          <Button
            className="bg-[#022279] text-white"
            isLoading={isSubmitting}
            radius="sm"
            onPress={() => {
              void handleSubmit(submitTask)();
            }}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
