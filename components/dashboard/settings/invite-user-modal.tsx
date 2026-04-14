"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { Alert } from "@heroui/alert";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Mail, X } from "lucide-react";

import {
  InviteMember,
  InviteMemberRow,
  InviteRoleOption,
} from "@/components/dashboard/settings/invite-member-row";
import { AutocompleteMultiSelectField } from "@/components/form/autocomplete-multi-select-field";
import { useAuth } from "@/components/auth/auth-context";
import { invitationsApi } from "@/apis/invitations";
import { usersApi } from "@/apis/users";
import { clientsApi } from "@/apis/clients";

const inviteUserSchema = yup.object({
  inviteEmail: yup
    .string()
    .email("Enter a valid email")
    .required("Member email is required"),
  clientIds: yup
    .array(yup.string().trim().required())
    .min(1, "At least one client is required")
    .required("At least one client is required"),
});

type InviteUserFormValues = yup.InferType<typeof inviteUserSchema>;

interface InviteUserModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: (payload: {
    clientLabels: string[];
    invitedMembers: InviteMember[];
  }) => void;
}

export const InviteUserModal = ({
  isOpen,
  onOpenChange,
  onInvited,
}: InviteUserModalProps) => {
  const { session } = useAuth();
  const [submitError, setSubmitError] = useState("");
  const [clients, setClients] = useState<
    Array<{ id: string; label: string; value: string }>
  >([]);
  const [members, setMembers] = useState<InviteMember[]>([]);
  const {
    control,
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
      clientIds: [],
    },
    mode: "onBlur",
  });

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        label: client.label,
        value: client.value,
      })),
    [clients],
  );

  useEffect(() => {
    if (!isOpen || !session?.accessToken) {
      return;
    }

    void (async () => {
      try {
        const response = await clientsApi.getClients(session.accessToken);
        const parsedClients = response
          .map((client) => {
            const id = String(client.id);
            const label =
              (client.businessName || client.clientName || "").trim() ||
              `Client ${id}`;

            return {
              id,
              label,
              value: id,
            };
          })
          .filter(
            (client, index, collection) =>
              collection.findIndex((item) => item.id === client.id) === index,
          );

        setClients(parsedClients);
      } catch {
        setClients([]);
      }
    })();
  }, [isOpen, session?.accessToken]);

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

      const exists = members.some(
        (member) => member.email.toLowerCase() === inviteEmail.toLowerCase(),
      );

      if (exists) {
        return;
      }

      const generatedName = inviteEmail
        .split("@")[0]
        .split(/[._-]/g)
        .filter(Boolean)
        .map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`)
        .join(" ");

      setMembers((previousMembers) => [
        ...previousMembers,
        {
          email: inviteEmail,
          id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: generatedName || "New Member",
          role: "GUEST",
        },
      ]);
      setValue("inviteEmail", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
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

  const handleInvite = async () => {
    await handleSubmit(
      async () => {
        setSubmitError("");
        const selectedClientIds = getValues("clientIds");

        const requestBody = {
          requestedByUserId: session?.user.id ?? null,
          members: members.map((member) => ({
            email: member.email,
            role: member.role,
          })),
          locations: selectedClientIds,
        };

        if (!session?.accessToken) {
          throw new Error("Your session has expired. Please login again.");
        }

        const inviteResponse = await usersApi.inviteUsers(
          requestBody,
          session.accessToken,
        );

        const invitedEmailSet = new Set(
          (inviteResponse.results ?? [])
            .filter(
              (result) =>
                String(result.status || "")
                  .trim()
                  .toUpperCase() === "INVITED",
            )
            .map((result) => result.email.toLowerCase()),
        );
        const invitedMembers = members.filter((member) =>
          invitedEmailSet.has(member.email.toLowerCase()),
        );
        const selectedClientLabels = selectedClientIds
          .map(
            (selectedClientId) =>
              clients.find((client) => client.id === selectedClientId)?.label ??
              "",
          )
          .filter(Boolean);

        if (invitedMembers.length > 0) {
          onInvited?.({
            clientLabels: selectedClientLabels,
            invitedMembers,
          });
        }

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
              <Alert
                className="mb-2"
                color="danger"
                description={submitError}
                title="Invite failed"
                variant="flat"
              />
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

          <Controller
            control={control}
            name="clientIds"
            render={({ field }) => (
              <AutocompleteMultiSelectField
                errorMessage={errors.clientIds?.message}
                label="Clients"
                options={clientOptions}
                placeholder={
                  clients.length ? "Select client(s)" : "No clients available"
                }
                values={field.value ?? []}
                onChange={(values) => {
                  field.onChange(values);
                  if (values.length > 0) {
                    clearErrors("clientIds");
                  }
                }}
              />
            )}
          />
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
