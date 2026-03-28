"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { X } from "lucide-react";

const projectOptions = ["Local SEO", "Website", "Maintenance", "Production"];
const phaseOptions = ["Onboarding", "Design", "Ongoing", "Churned"];
const progressOptions = ["On Track", "Delayed"];

const addProjectSchema = yup.object({
  accountManagerId: yup.string().required("Account manager is required"),
  clientSuccessManagerId: yup
    .string()
    .required("Client success manager is required"),
  phase: yup.string().required("Phase is required"),
  progress: yup.string().required("Progress is required"),
  project: yup.string().required("Project is required"),
});

export type AddProjectFormValues = yup.InferType<typeof addProjectSchema>;

interface AddProjectModalProps {
  clientAddress?: string;
  clientName: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (payload: AddProjectFormValues) => void | Promise<void>;
  users: Array<{
    avatar?: string | null;
    id: string;
    name: string;
  }>;
}

const labelClassName = "mb-1.5 block text-sm text-[#4B5563]";

export const AddProjectModal = ({
  clientAddress,
  clientName,
  isOpen,
  onOpenChange,
  onSubmit,
  users,
}: AddProjectModalProps) => {
  const [submitError, setSubmitError] = useState("");
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddProjectFormValues>({
    defaultValues: {
      accountManagerId: "",
      clientSuccessManagerId: "",
      phase: "",
      progress: "",
      project: "",
    },
    mode: "onBlur",
  });

  const closeModal = () => {
    onOpenChange(false);
    reset();
    clearErrors();
    setSubmitError("");
  };

  const submitProject = async (values: AddProjectFormValues) => {
    clearErrors();
    setSubmitError("");

    try {
      const validatedValues = await addProjectSchema.validate(values, {
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

          setError(issue.path as keyof AddProjectFormValues, {
            message: issue.message,
            type: "manual",
          });
        });

        return;
      }

      setSubmitError(
        error instanceof Error ? error.message : "Failed to add project.",
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
          <h2 className="text-lg font-semibold text-[#111827]">Add Project</h2>
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
            <p className={labelClassName}>Client Name</p>
            <div className="rounded-lg border border-default-200 px-3 py-2.5">
              <p className="text-sm font-medium text-[#111827]">{clientName}</p>
              <p className="text-xs text-[#9CA3AF]">{clientAddress || "-"}</p>
            </div>
          </div>
          <div>
            <p className={labelClassName}>Project</p>
            <Controller
              control={control}
              name="project"
              render={({ field }) => (
                <Select
                  errorMessage={errors.project?.message}
                  isInvalid={!!errors.project}
                  placeholder="Select project"
                  radius="sm"
                  selectedKeys={field.value ? [field.value] : []}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys as Set<string>)[0] ?? "";

                    field.onChange(selected);
                  }}
                >
                  {projectOptions.map((option) => (
                    <SelectItem key={option}>{option}</SelectItem>
                  ))}
                </Select>
              )}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className={labelClassName}>Client Success Manager</p>
              <Controller
                control={control}
                name="clientSuccessManagerId"
                render={({ field }) => (
                  <Select
                    errorMessage={errors.clientSuccessManagerId?.message}
                    isInvalid={!!errors.clientSuccessManagerId}
                    placeholder="Select user"
                    radius="sm"
                    selectedKeys={field.value ? [field.value] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys as Set<string>)[0] ?? "";

                      field.onChange(selected);
                    }}
                  >
                    {users.map((user) => (
                      <SelectItem key={user.id}>{user.name}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
            <div>
              <p className={labelClassName}>Account Manager</p>
              <Controller
                control={control}
                name="accountManagerId"
                render={({ field }) => (
                  <Select
                    errorMessage={errors.accountManagerId?.message}
                    isInvalid={!!errors.accountManagerId}
                    placeholder="Select user"
                    radius="sm"
                    selectedKeys={field.value ? [field.value] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys as Set<string>)[0] ?? "";

                      field.onChange(selected);
                    }}
                  >
                    {users.map((user) => (
                      <SelectItem key={user.id}>{user.name}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className={labelClassName}>Phase</p>
              <Controller
                control={control}
                name="phase"
                render={({ field }) => (
                  <Select
                    errorMessage={errors.phase?.message}
                    isInvalid={!!errors.phase}
                    placeholder="Select phase"
                    radius="sm"
                    selectedKeys={field.value ? [field.value] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys as Set<string>)[0] ?? "";

                      field.onChange(selected);
                    }}
                  >
                    {phaseOptions.map((option) => (
                      <SelectItem key={option}>{option}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
            <div>
              <p className={labelClassName}>Progress</p>
              <Controller
                control={control}
                name="progress"
                render={({ field }) => (
                  <Select
                    errorMessage={errors.progress?.message}
                    isInvalid={!!errors.progress}
                    placeholder="Select progress"
                    radius="sm"
                    selectedKeys={field.value ? [field.value] : []}
                    size="sm"
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys as Set<string>)[0] ?? "";

                      field.onChange(selected);
                    }}
                  >
                    {progressOptions.map((option) => (
                      <SelectItem key={option}>{option}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
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
              void handleSubmit(submitProject)();
            }}
          >
            Add Project
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
