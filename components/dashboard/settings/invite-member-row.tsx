"use client";

import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import {
  ChevronDown,
  UserRoundCheck,
  UserRoundCog,
  UserRound,
  UserRoundMinus,
} from "lucide-react";

export type InviteRoleOption = "ADMIN" | "TEAM_MEMBER" | "GUEST";

export interface InviteMember {
  email: string;
  id: string;
  name: string;
  role: InviteRoleOption;
}

interface InviteMemberRowProps {
  member: InviteMember;
  onRemove: (memberId: string) => void;
  onRoleChange: (memberId: string, role: InviteRoleOption) => void;
}

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

export const InviteMemberRow = ({
  member,
  onRemove,
  onRoleChange,
}: InviteMemberRowProps) => {
  const roleLabel =
    member.role === "ADMIN"
      ? "Admin"
      : member.role === "GUEST"
        ? "Guest"
        : "Member";

  return (
    <div className="rounded-2xl border border-default-200 p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={getInitials(member.name)} />
          <div>
            <p className="text-sm font-medium text-[#111827]">{member.name}</p>
            <p className="text-xs text-default-500">{member.email}</p>
          </div>
        </div>
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button
              endContent={<ChevronDown size={16} />}
              radius="sm"
              variant="light"
            >
              {roleLabel}
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label={`Role options for ${member.name}`}
            onAction={(key) => {
              if (key === "remove-role") {
                onRemove(member.id);

                return;
              }

              onRoleChange(member.id, key as InviteRoleOption);
            }}
          >
            <DropdownItem
              key="ADMIN"
              startContent={
                <UserRoundCog className="text-[#0568C9]" size={18} />
              }
            >
              Admin
            </DropdownItem>
            <DropdownItem
              key="TEAM_MEMBER"
              startContent={
                <UserRoundCheck className="text-[#0568C9]" size={18} />
              }
            >
              Member
            </DropdownItem>
            <DropdownItem
              key="GUEST"
              startContent={<UserRound className="text-[#0568C9]" size={18} />}
            >
              Guest
            </DropdownItem>
            <DropdownItem
              key="remove-role"
              className="text-danger"
              color="danger"
              startContent={
                <UserRoundMinus className="text-danger" size={18} />
              }
            >
              Remove
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  );
};
