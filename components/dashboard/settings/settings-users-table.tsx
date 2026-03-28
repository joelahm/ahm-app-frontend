"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import {
  EllipsisVertical,
  Search,
  Upload,
  UserRoundCheck,
  UserRoundCog,
  UserRoundMinus,
} from "lucide-react";

import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { useAuth } from "@/components/auth/auth-context";
import { InviteUserModal } from "@/components/dashboard/settings/invite-user-modal";
import { usersApi } from "@/apis/users";

export interface SettingsUserRecord {
  id: string;
  avatarUrl?: string;
  email: string;
  invitedBy: string;
  invitedOn: string;
  lastActiveOn: string;
  locations: string[];
  name: string;
  role: string;
  status: "Active" | "Pending Invite";
}

interface SettingsUsersTableProps {
  rows?: SettingsUserRecord[];
  title?: string;
}

const headerCellClass = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const SettingsUsersTable = ({
  rows,
  title = "Users List",
}: SettingsUsersTableProps) => {
  const PAGE_SIZE = 10;
  const { session } = useAuth();
  const [fetchedRows, setFetchedRows] = useState<SettingsUserRecord[]>(
    rows ?? [],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [actionError, setActionError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [isLoading, setIsLoading] = useState(!rows);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (rows) {
      setFetchedRows(rows);
      setTotalPages(1);
      setIsLoading(false);

      return;
    }

    if (!session?.accessToken) {
      setFetchedRows([]);
      setIsLoading(false);
      setFetchError("");
      setTotalPages(1);

      return;
    }

    let isMounted = true;

    const loadUsers = async () => {
      setIsLoading(true);
      setFetchError("");
      setActionError("");
      setDeleteError("");

      try {
        const response = await usersApi.getUsers(session.accessToken, {
          limit: PAGE_SIZE,
          page: currentPage,
        });

        if (!isMounted) {
          return;
        }

        const mappedRows: SettingsUserRecord[] = response.users.map((user) => {
          const fullName = [user.firstName, user.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          const roleLabel = user.role === "ADMIN" ? "Admin" : "Team Member";
          const statusLabel: SettingsUserRecord["status"] = user.isActive
            ? "Active"
            : "Pending Invite";

          return {
            avatarUrl: user.avatarUrl ?? undefined,
            email: user.email,
            id: String(user.id),
            invitedBy: "-",
            invitedOn: formatDate(user.createdAt),
            lastActiveOn: formatDate(user.updatedAt),
            locations: user.country ? [user.country] : [],
            name: fullName || user.email.split("@")[0],
            role: roleLabel,
            status: statusLabel,
          };
        });

        setFetchedRows(mappedRows);
        setTotalPages(response.pagination?.totalPages ?? 1);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFetchError(
          error instanceof Error ? error.message : "Failed to load users.",
        );
        setFetchedRows([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, [rows, session?.accessToken, currentPage, reloadTick]);

  const handleRemoveUser = useCallback(
    async (userId: string) => {
      if (!session?.accessToken || deletingUserId || updatingRoleUserId) {
        return;
      }

      setActionError("");
      setDeleteError("");
      setDeletingUserId(userId);

      try {
        await usersApi.deleteUser(session.accessToken, userId);
        setReloadTick((value) => value + 1);
      } catch (error) {
        setDeleteError(
          error instanceof Error ? error.message : "Failed to remove user.",
        );
      } finally {
        setDeletingUserId(null);
      }
    },
    [deletingUserId, session?.accessToken, updatingRoleUserId],
  );

  const handleChangeRole = useCallback(
    async (userId: string, role: "ADMIN" | "TEAM_MEMBER") => {
      if (!session?.accessToken || deletingUserId || updatingRoleUserId) {
        return;
      }

      setActionError("");
      setUpdatingRoleUserId(userId);

      try {
        await usersApi.updateUserRole(session.accessToken, userId, role);
        setReloadTick((value) => value + 1);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to update role.",
        );
      } finally {
        setUpdatingRoleUserId(null);
      }
    },
    [deletingUserId, session?.accessToken, updatingRoleUserId],
  );

  const tableRows = rows ?? fetchedRows;

  const columns = useMemo<DashboardDataTableColumn<SettingsUserRecord>[]>(
    () => [
      {
        className: headerCellClass,
        key: "name",
        label: "Name",
        renderCell: (item) => (
          <div className="flex items-center gap-3">
            <Avatar name={item.name} src={item.avatarUrl} />
            <div>
              <p className="text-sm font-medium text-[#1F2937]">{item.name}</p>
              <p className="text-xs text-[#9CA3AF]">{item.status}</p>
            </div>
          </div>
        ),
      },
      {
        className: headerCellClass,
        key: "email",
        label: "Email",
        renderCell: (item) => (
          <span className="text-sm text-[#1F2937]">{item.email}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "role",
        label: "Role",
        renderCell: (item) => (
          <span className="text-sm text-[#1F2937]">{item.role}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "location",
        label: "Location",
        renderCell: (item) => (
          <div className="flex flex-wrap gap-1">
            {item.locations.map((location) => (
              <Chip
                key={`${item.id}-${location}`}
                classNames={{ base: "bg-[#D9ECFC]", content: "text-[#0568C9]" }}
                size="sm"
                variant="flat"
              >
                {location}
              </Chip>
            ))}
          </div>
        ),
      },
      {
        className: headerCellClass,
        key: "lastActiveOn",
        label: "Last Active On",
        renderCell: (item) => (
          <span className="text-sm text-[#1F2937]">{item.lastActiveOn}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "invitedOn",
        label: "Invited On",
        renderCell: (item) => (
          <span className="text-sm text-[#1F2937]">{item.invitedOn}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "invitedBy",
        label: "Invited By",
        renderCell: (item) => (
          <span className="text-sm text-[#1F2937]">{item.invitedBy}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "action",
        label: "Action",
        renderCell: (item) => (
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button isIconOnly radius="sm" size="sm" variant="bordered">
                <EllipsisVertical size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label={`User ${item.name} actions`}>
              <DropdownItem
                key={`${item.id}-resend`}
                startContent={<Upload className="text-[#0568C9]" size={18} />}
              >
                Resend
              </DropdownItem>
              <DropdownItem
                key={`${item.id}-set-member`}
                isDisabled={
                  deletingUserId === item.id || updatingRoleUserId === item.id
                }
                startContent={
                  <UserRoundCheck className="text-[#0568C9]" size={18} />
                }
                onPress={() => {
                  void handleChangeRole(item.id, "TEAM_MEMBER");
                }}
              >
                Set as Member
              </DropdownItem>
              <DropdownItem
                key={`${item.id}-set-admin`}
                isDisabled={
                  deletingUserId === item.id || updatingRoleUserId === item.id
                }
                startContent={
                  <UserRoundCog className="text-[#0568C9]" size={18} />
                }
                onPress={() => {
                  void handleChangeRole(item.id, "ADMIN");
                }}
              >
                Set as Admin
              </DropdownItem>
              <DropdownItem
                key={`${item.id}-remove`}
                className="text-danger"
                color="danger"
                isDisabled={
                  deletingUserId === item.id || updatingRoleUserId === item.id
                }
                startContent={
                  <UserRoundMinus className="text-danger" size={18} />
                }
                onPress={() => {
                  void handleRemoveUser(item.id);
                }}
              >
                Remove User
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        ),
      },
    ],
    [deletingUserId, handleChangeRole, handleRemoveUser, updatingRoleUserId],
  );

  return (
    <>
      {fetchError ? (
        <p className="mb-2 text-sm text-danger">{fetchError}</p>
      ) : null}
      {actionError ? (
        <p className="mb-2 text-sm text-danger">{actionError}</p>
      ) : null}
      {deleteError ? (
        <p className="mb-2 text-sm text-danger">{deleteError}</p>
      ) : null}
      <DashboardDataTable
        serverPagination
        showPagination
        ariaLabel="Settings users list"
        columns={columns}
        currentPage={currentPage}
        getRowKey={(item) => item.id}
        headerRight={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Input
              className="w-full max-w-xs"
              placeholder="Search here"
              radius="md"
              startContent={<Search size={20} />}
            />
            <Button
              className="bg-[#0568C9] text-white"
              radius="md"
              onPress={() => setIsInviteModalOpen(true)}
            >
              Invite New User
            </Button>
            <Button
              className="bg-[#0568C9] text-white"
              radius="md"
              startContent={<Upload size={18} />}
            >
              Export CSV
            </Button>
          </div>
        }
        pageSize={PAGE_SIZE}
        rows={isLoading ? [] : tableRows}
        title={title}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
      />
    </>
  );
};
