"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Mail, MapPin, X } from "lucide-react";

import {
  InviteMember,
  InviteMemberRow,
  InviteRoleOption,
} from "@/components/dashboard/settings/invite-member-row";
import { useAuth } from "@/components/auth/auth-context";
import { invitationsApi } from "@/apis/invitations";
import { usersApi } from "@/apis/users";

const inviteUserSchema = yup.object({
  inviteEmail: yup
    .string()
    .email("Enter a valid email")
    .required("Member email is required"),
  locationInput: yup.string().default(""),
});

type InviteUserFormValues = yup.InferType<typeof inviteUserSchema>;

interface InviteUserModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InviteUserModal = ({
  isOpen,
  onOpenChange,
}: InviteUserModalProps) => {
  const { session } = useAuth();
  const [submitError, setSubmitError] = useState("");
  const [locationTags, setLocationTags] = useState<string[]>([
    "Location Name",
    "Location Name",
  ]);
  const [members, setMembers] = useState<InviteMember[]>([]);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserFormValues>({
    defaultValues: {
      inviteEmail: "",
      locationInput: "",
    },
    mode: "onBlur",
  });

  const handleAddMember = async () => {
    const inviteEmail = getValues("inviteEmail").trim();

    try {
      await inviteUserSchema.validateAt("inviteEmail", { inviteEmail });
      clearErrors("inviteEmail");

      const hasValidInvite = await invitationsApi.checkEmail(inviteEmail);

      if (hasValidInvite) {
        setError("inviteEmail", {
          message: "An active invitation already exists for this email.",
          type: "manual",
        });

        return;
      }

      setMembers((previousMembers) => {
        const exists = previousMembers.some(
          (member) => member.email.toLowerCase() === inviteEmail.toLowerCase(),
        );

        if (exists) {
          return previousMembers;
        }

        const generatedName = inviteEmail
          .split("@")[0]
          .split(/[._-]/g)
          .filter(Boolean)
          .map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`)
          .join(" ");

        return [
          ...previousMembers,
          {
            email: inviteEmail,
            id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: generatedName || "New Member",
            role: "TEAM_MEMBER",
          },
        ];
      });
      setValue("inviteEmail", "", { shouldDirty: false, shouldTouch: false });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        setError("inviteEmail", {
          message: error.message,
          type: "manual",
        });
      }
    }
  };

  const handleRoleChange = (memberId: string, role: InviteRoleOption) => {
    setMembers((previousMembers) =>
      previousMembers.map((member) =>
        member.id === memberId ? { ...member, role } : member,
      ),
    );
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers((previousMembers) =>
      previousMembers.filter((member) => member.id !== memberId),
    );
  };

  const handleAddLocation = async () => {
    const value = getValues("locationInput").trim();

    if (!value) {
      return;
    }

    setLocationTags((previous) => [...previous, value]);
    reset({ ...getValues(), locationInput: "" });
  };

  const handleInvite = async () => {
    await handleSubmit(
      async () => {
        setSubmitError("");

        const requestBody = {
          requestedByUserId: session?.user.id ?? null,
          members: members.map((member) => ({
            email: member.email,
            role: member.role,
          })),
          locations: locationTags,
        };

        if (!session?.accessToken) {
          throw new Error("Your session has expired. Please login again.");
        }

        await usersApi.inviteUsers(requestBody, session.accessToken);

        onOpenChange(false);
        reset();
        setMembers([]);
      },
      (validationErrors) => {
        const firstError = Object.values(validationErrors)[0];

        setSubmitError(firstError?.message ?? "Please review form fields.");
      },
    )().catch((error: unknown) => {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to invite users.",
      );
    });
  };

  return (
    <Modal
      hideCloseButton={true}
      isOpen={isOpen}
      size="lg"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111827]">
            Invite New User
          </h2>
          <Button
            isIconOnly
            radius="full"
            size="sm"
            variant="light"
            onPress={() => onOpenChange(false)}
          >
            <X size={20} />
          </Button>
        </ModalHeader>
        <ModalBody className="space-y-4 pb-0">
          <div>
            <p className="mb-2 text-sm text-[#4B5563]">Invite Members</p>
            {submitError ? (
              <p className="mb-2 text-xs text-danger">{submitError}</p>
            ) : null}
            <div className="flex gap-3">
              <Input
                {...register("inviteEmail")}
                errorMessage={errors.inviteEmail?.message}
                isInvalid={!!errors.inviteEmail}
                placeholder="name@alliedhealthmedia.co.uk"
                radius="md"
                startContent={<Mail className="text-default-400" size={20} />}
              />
              <Button
                className="bg-[#0568C9] px-8 text-white"
                radius="md"
                onPress={handleAddMember}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {members.length === 0 ? (
              <div className="rounded-2xl border border-default-200 p-3 text-center">
                <p className="text-sm text-default-500">No email added</p>
              </div>
            ) : (
              members.map((member) => (
                <InviteMemberRow
                  key={member.id}
                  member={member}
                  onRemove={handleRemoveMember}
                  onRoleChange={handleRoleChange}
                />
              ))
            )}
          </div>

          <div>
            <p className="mb-2 text-sm text-[#4B5563]">Locations</p>
            <div className="rounded-2xl border border-default-200">
              <div className="flex items-center gap-3 border-b border-default-200 p-3">
                <Input
                  {...register("locationInput")}
                  placeholder="Add location(s)"
                  radius="md"
                  startContent={
                    <MapPin className="text-default-400" size={20} />
                  }
                />
                <Button
                  className="bg-[#0568C9] text-white"
                  radius="md"
                  onPress={handleAddLocation}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                {locationTags.map((location, index) => (
                  <Chip
                    key={`${location}-${index}`}
                    classNames={{
                      base: "bg-[#D9ECFC]",
                      content: "text-[#0568C9]",
                    }}
                    size="sm"
                    variant="flat"
                  >
                    {location}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="grid grid-cols-2 gap-3">
          <Button
            radius="md"
            variant="bordered"
            onPress={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#0568C9] text-white"
            isDisabled={members.length === 0}
            isLoading={isSubmitting}
            radius="md"
            onPress={handleInvite}
          >
            Invite
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
