"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Pencil,
  Search,
  RefreshCcw,
  UserRound,
  UserRoundCheck,
  UserRoundCog,
  UserRoundMinus,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { useAuth } from "@/components/auth/auth-context";
import { InviteUserModal } from "@/components/dashboard/settings/invite-user-modal";
import { usersApi } from "@/apis/users";
import { type InviteMember } from "@/components/dashboard/settings/invite-member-row";
import { clientsApi } from "@/apis/clients";
import { resolveServerAssetUrl } from "@/components/dashboard/client-details/task-panel/task-panel-utils";
import { useAppToast } from "@/hooks/use-app-toast";

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
  const router = useRouter();
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const toastRef = useRef(toast);
  const [fetchedRows, setFetchedRows] = useState<SettingsUserRecord[]>(
    rows ?? [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!rows);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(
    null,
  );
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    if (rows) {
      setFetchedRows(rows);
      setIsLoading(false);

      return;
    }

    if (!session?.accessToken) {
      setFetchedRows([]);
      setIsLoading(false);

      return;
    }

    let isMounted = true;

    const loadUsers = async () => {
      setIsLoading(true);

      try {
        const accessToken = await getValidAccessToken();
        const allUsers = [];
        let page = 1;
        let hasNext = true;

        while (hasNext) {
          const response = await usersApi.getUsers(accessToken, {
            limit: 100,
            page,
          });

          allUsers.push(...response.users);
          hasNext = Boolean(response.pagination?.hasNext);
          page += 1;
        }

        const [pendingInvitationsResponse, clientsResponse] = await Promise.all(
          [
            usersApi.getPendingInvitations(accessToken),
            clientsApi.getClients(accessToken),
          ],
        );

        if (!isMounted) {
          return;
        }

        const clientNameById = new Map<string, string>();
        const assignedClientsByUserId = new Map<string, string[]>();

        clientsResponse.forEach((client) => {
          const clientId = String(client.id);
          const clientName =
            (client.businessName || client.clientName || "").trim() ||
            `Client ${clientId}`;
          const assignedUserId =
            client.assignedToId ?? client.assignedTo ?? null;
          const assignedToId =
            assignedUserId === null || assignedUserId === undefined
              ? null
              : String(assignedUserId);

          clientNameById.set(clientId, clientName);

          if (!assignedToId) {
            return;
          }

          const existingAssigned = assignedClientsByUserId.get(assignedToId);

          if (!existingAssigned) {
            assignedClientsByUserId.set(assignedToId, [clientName]);

            return;
          }

          if (!existingAssigned.includes(clientName)) {
            assignedClientsByUserId.set(assignedToId, [
              ...existingAssigned,
              clientName,
            ]);
          }
        });

        const mappedRows: SettingsUserRecord[] = allUsers.map((user) => {
          const fullName = [user.firstName, user.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          const roleLabel =
            user.role === "ADMIN"
              ? "Admin"
              : user.role === "GUEST"
                ? "Guest"
                : "Member";
          const isPendingInvite =
            String(user.status || "")
              .trim()
              .toUpperCase()
              .includes("PENDING") || !user.isActive;
          const statusLabel: SettingsUserRecord["status"] = isPendingInvite
            ? "Pending Invite"
            : "Active";

          return {
            avatarUrl:
              resolveServerAssetUrl(user.avatarPath ?? user.avatarUrl) ??
              user.avatarUrl ??
              undefined,
            email: user.email,
            id: String(user.id),
            invitedBy: "-",
            invitedOn: formatDate(user.createdAt),
            lastActiveOn: formatDate(user.updatedAt),
            locations: assignedClientsByUserId.get(String(user.id)) ?? [],
            name: fullName || user.email.split("@")[0],
            role: roleLabel,
            status: statusLabel,
          };
        });

        const pendingRows: SettingsUserRecord[] = (
          pendingInvitationsResponse.invitations ?? []
        ).map((invitation) => ({
          avatarUrl: undefined,
          email: invitation.email,
          id: `invite-${String(invitation.id)}`,
          invitedBy: invitation.invitedBy ?? "-",
          invitedOn: formatDate(invitation.createdAt),
          lastActiveOn: "-",
          locations: (Array.isArray(invitation.locations)
            ? invitation.locations
            : []
          ).map((location) => clientNameById.get(String(location)) ?? location),
          name: invitation.email.split("@")[0] || invitation.email,
          role:
            invitation.role === "ADMIN"
              ? "Admin"
              : invitation.role === "GUEST"
                ? "Guest"
                : "Member",
          status: "Pending Invite",
        }));

        const mergedRows = [...pendingRows, ...mappedRows].filter(
          (row, index, collection) =>
            collection.findIndex(
              (candidate) =>
                candidate.email.toLowerCase() === row.email.toLowerCase() &&
                candidate.status === row.status,
            ) === index,
        );

        setFetchedRows(mergedRows);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        toastRef.current.danger("Failed to load users", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
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
  }, [getValidAccessToken, rows, session?.accessToken, reloadTick]);

  const handleRemoveUser = useCallback(
    async (userId: string) => {
      if (!session?.accessToken || deletingUserId || updatingRoleUserId) {
        return;
      }

      if (userId.startsWith("pending-")) {
        toastRef.current.warning("Please refresh and try again.", {
          description:
            "This invite is not fully synced yet, so it cannot be cancelled from the local row.",
        });
        setReloadTick((value) => value + 1);

        return;
      }

      setDeletingUserId(userId);

      try {
        const accessToken = await getValidAccessToken();

        if (userId.startsWith("invite-")) {
          await usersApi.cancelPendingInvitation(
            accessToken,
            userId.replace(/^invite-/, ""),
          );
        } else {
          await usersApi.deleteUser(accessToken, userId);
        }
        setReloadTick((value) => value + 1);
      } catch (error) {
        toastRef.current.danger("Remove failed", {
          description:
            error instanceof Error ? error.message : "Failed to remove user.",
        });
      } finally {
        setDeletingUserId(null);
      }
    },
    [
      deletingUserId,
      getValidAccessToken,
      session?.accessToken,
      updatingRoleUserId,
    ],
  );

  const handleResendInvite = useCallback(
    async (userId: string) => {
      if (
        !session?.accessToken ||
        deletingUserId ||
        updatingRoleUserId ||
        resendingInviteId
      ) {
        return;
      }

      if (!userId.startsWith("invite-")) {
        toastRef.current.warning("Please refresh and try again.", {
          description:
            "This invite is not fully synced yet, so it cannot be resent from the local row.",
        });
        setReloadTick((value) => value + 1);

        return;
      }

      setResendingInviteId(userId);

      try {
        const accessToken = await getValidAccessToken();
        const response = await usersApi.resendPendingInvitation(
          accessToken,
          userId.replace(/^invite-/, ""),
        );

        toastRef.current.success("Invite resent", {
          description: response.email
            ? `Invite sent to ${response.email}.`
            : "Invite email sent successfully.",
        });
        setReloadTick((value) => value + 1);
      } catch (error) {
        toastRef.current.danger("Resend failed", {
          description:
            error instanceof Error ? error.message : "Failed to resend invite.",
        });
      } finally {
        setResendingInviteId(null);
      }
    },
    [
      deletingUserId,
      getValidAccessToken,
      resendingInviteId,
      session?.accessToken,
      updatingRoleUserId,
    ],
  );

  const handleChangeRole = useCallback(
    async (userId: string, role: "ADMIN" | "TEAM_MEMBER" | "GUEST") => {
      if (!session?.accessToken || deletingUserId || updatingRoleUserId) {
        return;
      }

      setUpdatingRoleUserId(userId);

      try {
        const accessToken = await getValidAccessToken();

        await usersApi.updateUserRole(accessToken, userId, role);
        setReloadTick((value) => value + 1);
      } catch (error) {
        toastRef.current.danger("Action failed", {
          description:
            error instanceof Error ? error.message : "Failed to update role.",
        });
      } finally {
        setUpdatingRoleUserId(null);
      }
    },
    [
      deletingUserId,
      getValidAccessToken,
      session?.accessToken,
      updatingRoleUserId,
    ],
  );

  const handleUsersInvited = useCallback(
    ({
      clientLabels,
      invitedMembers,
    }: {
      clientLabels: string[];
      invitedMembers: InviteMember[];
    }) => {
      if (!invitedMembers.length) {
        return;
      }

      const inviterName = [
        session?.user.firstName ?? "",
        session?.user.lastName ?? "",
      ]
        .join(" ")
        .trim();
      const invitedBy =
        inviterName || session?.user.name || session?.user.email || "-";
      const invitedOn = formatDate(new Date().toISOString());

      setFetchedRows((currentRows) => {
        const nextRows = [...currentRows];

        invitedMembers.forEach((member) => {
          const existingIndex = nextRows.findIndex(
            (item) => item.email.toLowerCase() === member.email.toLowerCase(),
          );
          const row: SettingsUserRecord = {
            avatarUrl: undefined,
            email: member.email,
            id: `pending-${member.email.toLowerCase()}`,
            invitedBy,
            invitedOn,
            lastActiveOn: "-",
            locations: clientLabels,
            name: member.name,
            role:
              member.role === "ADMIN"
                ? "Admin"
                : member.role === "GUEST"
                  ? "Guest"
                  : "Member",
            status: "Pending Invite",
          };

          if (existingIndex >= 0) {
            nextRows[existingIndex] = row;
          } else {
            nextRows.unshift(row);
          }
        });

        return nextRows;
      });

      toastRef.current.success("Invite sent", {
        description:
          invitedMembers.length === 1
            ? "Invite sent successfully."
            : `${invitedMembers.length} invites sent successfully.`,
      });
      setReloadTick((value) => value + 1);
    },
    [
      session?.user.email,
      session?.user.firstName,
      session?.user.lastName,
      session?.user.name,
    ],
  );

  const tableRows = rows ?? fetchedRows;
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return tableRows;
    }

    return tableRows.filter((item) =>
      [item.name, item.email, item.role, item.status].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [searchQuery, tableRows]);

  const handleExportCsv = useCallback(() => {
    const headers = [
      "Name",
      "Email",
      "Role",
      "Assigned Clients",
      "Last Active On",
      "Invited On",
      "Invited By",
      "Status",
    ];
    const rowsToExport = filteredRows.map((item) => [
      item.name,
      item.email,
      item.role,
      item.locations.join(" | "),
      item.lastActiveOn,
      item.invitedOn,
      item.invitedBy,
      item.status,
    ]);
    const csv = [headers, ...rowsToExport]
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "");

            return /[",\n]/.test(value)
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "users-list.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredRows]);

  const columns = useMemo<DashboardDataTableColumn<SettingsUserRecord>[]>(
    () => [
      {
        className: headerCellClass,
        key: "name",
        label: "Name",
        renderCell: (item) => (
          <div className="flex items-center gap-3 w-">
            <div className="w-10">
              <Avatar name={item.name} src={item.avatarUrl} />
            </div>
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
        label: "Assigned Clients",
        renderCell: (item) => (
          <div className="flex flex-wrap items-center gap-1">
            {item.locations.length > 0 ? (
              <Chip
                classNames={{ base: "bg-[#D9ECFC]", content: "text-[#0568C9]" }}
                size="sm"
                variant="flat"
              >
                {item.locations[0]}
              </Chip>
            ) : (
              <span className="text-sm text-[#9CA3AF]">-</span>
            )}
            {item.locations.length > 1 ? (
              <Chip
                classNames={{ base: "bg-[#D9ECFC]", content: "text-[#0568C9]" }}
                size="sm"
                variant="flat"
              >
                +{item.locations.length - 1}
              </Chip>
            ) : null}
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
        renderCell: (item) => {
          const isInviteOnlyUser =
            item.status === "Pending Invite" ||
            item.id.startsWith("invite-") ||
            item.id.startsWith("pending-");
          const isCurrentUser =
            String(session?.user.id ?? "") !== "" &&
            String(session?.user.id) === item.id;

          if (isCurrentUser) {
            return null;
          }

          return (
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button
                  isIconOnly
                  className="h-12 min-w-12 border-default-300 text-[#111827]"
                  radius="md"
                  size="sm"
                  variant="bordered"
                >
                  <EllipsisVertical size={16} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label={`User ${item.name} actions`}
                className="min-w-[260px]"
              >
                {item.status === "Pending Invite" ? (
                  <DropdownItem
                    key={`${item.id}-resend`}
                    isDisabled={
                      deletingUserId === item.id ||
                      updatingRoleUserId === item.id ||
                      resendingInviteId === item.id
                    }
                    startContent={
                      <RefreshCcw className="text-[#0568C9]" size={18} />
                    }
                    onPress={() => {
                      void handleResendInvite(item.id);
                    }}
                  >
                    Resend
                  </DropdownItem>
                ) : null}
                {!isInviteOnlyUser && !isCurrentUser ? (
                  <DropdownItem
                    key={`${item.id}-edit`}
                    startContent={
                      <Pencil className="text-[#0568C9]" size={18} />
                    }
                    onPress={() => {
                      router.push(
                        `/dashboard/settings/users/${encodeURIComponent(item.id)}/edit`,
                      );
                    }}
                  >
                    Edit User
                  </DropdownItem>
                ) : null}
                {!isInviteOnlyUser ? (
                  <DropdownItem
                    key={`${item.id}-set-member`}
                    isDisabled={
                      deletingUserId === item.id ||
                      updatingRoleUserId === item.id ||
                      resendingInviteId === item.id
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
                ) : null}
                {!isInviteOnlyUser ? (
                  <DropdownItem
                    key={`${item.id}-set-guest`}
                    isDisabled={
                      deletingUserId === item.id ||
                      updatingRoleUserId === item.id
                    }
                    startContent={
                      <UserRound className="text-[#0568C9]" size={18} />
                    }
                    onPress={() => {
                      void handleChangeRole(item.id, "GUEST");
                    }}
                  >
                    Set as Guest
                  </DropdownItem>
                ) : null}
                {!isInviteOnlyUser ? (
                  <DropdownItem
                    key={`${item.id}-set-admin`}
                    isDisabled={
                      deletingUserId === item.id ||
                      updatingRoleUserId === item.id
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
                ) : null}
                {!isCurrentUser ? (
                  <DropdownItem
                    key={`${item.id}-remove`}
                    className="text-danger"
                    color="danger"
                    isDisabled={
                      deletingUserId === item.id ||
                      updatingRoleUserId === item.id
                    }
                    startContent={
                      <UserRoundMinus className="text-danger" size={18} />
                    }
                    onPress={() => {
                      void handleRemoveUser(item.id);
                    }}
                  >
                    {isInviteOnlyUser ? "Cancel Invite" : "Remove User"}
                  </DropdownItem>
                ) : null}
              </DropdownMenu>
            </Dropdown>
          );
        },
      },
    ],
    [
      deletingUserId,
      handleChangeRole,
      handleRemoveUser,
      handleResendInvite,
      resendingInviteId,
      router,
      session?.user.id,
      updatingRoleUserId,
    ],
  );

  return (
    <>
      <DashboardDataTable
        showPagination
        ariaLabel="Settings users list"
        columns={columns}
        getRowKey={(item) => item.id}
        headerRight={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Input
              className="w-full max-w-[200px]"
              placeholder="Search here"
              radius="md"
              startContent={<Search size={20} />}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <Button
              className="bg-[#022279] text-white"
              radius="md"
              onPress={() => {
                setIsInviteModalOpen(true);
              }}
            >
              Invite New User
            </Button>
            <Button
              className="bg-[#022279] text-white"
              radius="md"
              onPress={handleExportCsv}
            >
              Export CSV
            </Button>
          </div>
        }
        pageSize={PAGE_SIZE}
        rows={isLoading ? [] : filteredRows}
        title={title}
      />
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onInvited={handleUsersInvited}
        onOpenChange={setIsInviteModalOpen}
      />
    </>
  );
};
