"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@heroui/alert";
import { Columns3, Form, Plus, SlidersHorizontal } from "lucide-react";

import { clientsApi } from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import {
  ClientListTable,
  ClientRecord,
} from "@/components/dashboard/client-list-table";
import {
  AddClientFormValues,
  AddClientModal,
} from "@/components/dashboard/clients/add-client-modal";
import { DashboardTableAction } from "@/components/dashboard/dashboard-table-shell";

const formatDateValue = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  const formattedDate = parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = parsedDate
    .toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" ", "");

  return `${formattedDate} ${formattedTime}`;
};

const resolveServerAssetUrl = (value?: string | null) => {
  const rawValue = value?.trim();

  if (!rawValue) {
    return "";
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return rawValue;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  const normalizedPath = rawValue.replace(/^\/+/, "");

  return baseUrl ? `${baseUrl}/${normalizedPath}` : rawValue;
};

const ClientsPage = () => {
  const { getValidAccessToken, session } = useAuth();
  const [actionError, setActionError] = useState("");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [rows, setRows] = useState<ClientRecord[]>([]);

  const mapClientRows = useCallback(
    (clients: Awaited<ReturnType<typeof clientsApi.getClients>>) =>
      clients.map((client) => ({
        address: client.address ?? "-",
        clientName: client.clientName ?? client.businessName ?? "-",
        dateJoined: formatDateValue(client.dateJoined ?? client.createdAt),
        id: String(client.id),
        lastActivity: formatDateValue(client.lastActivity ?? client.updatedAt),
        manager:
          client.assignedUserName ??
          client.assignedUserEmail ??
          client.clientSuccessManagerName ??
          "-",
        managerAvatar: resolveServerAssetUrl(
          client.assignedUserAvatar ?? client.clientSuccessManagerAvatar ?? "",
        ),
        niche: client.niche ?? "-",
        projects: client.projects ?? [],
        status: client.status ?? "-",
      })),
    [],
  );

  const loadClients = useCallback(async () => {
    if (!session) {
      setRows([]);

      return;
    }

    try {
      const accessToken = await getValidAccessToken();
      const clients = await clientsApi.getClients(accessToken);
      const mappedRows = mapClientRows(clients).map((row) => ({
        ...row,
        isDiscordStatusLoading: true,
      }));

      setRows(mappedRows);

      if (mappedRows.length === 0) {
        return;
      }

      try {
        const statuses = await clientsApi.getClientDiscordStatuses(accessToken);
        const statusByClientId = new Map(
          statuses.map((status) => [String(status.clientId), status]),
        );

        setRows((currentRows) =>
          currentRows.map((row) => ({
            ...row,
            discordStatus: statusByClientId.get(row.id) ?? null,
            isDiscordStatusLoading: false,
          })),
        );
      } catch {
        setRows((currentRows) =>
          currentRows.map((row) => ({
            ...row,
            discordStatus: null,
            isDiscordStatusLoading: false,
          })),
        );
      }
    } catch {
      setRows([]);
    }
  }, [getValidAccessToken, mapClientRows, session]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const headerActions = useMemo<DashboardTableAction[]>(
    () => [
      {
        key: "filter",
        label: "Filter",
        startContent: <SlidersHorizontal size={14} />,
      },
      { key: "show", label: "Show 10", startContent: <Form size={14} /> },
      {
        key: "columns",
        label: "Columns",
        startContent: <Columns3 size={14} />,
      },
      {
        key: "add-client",
        label: "Add Client",
        color: "primary",
        variant: "solid",
        startContent: <Plus size={14} />,
        onPress: () => {
          setIsAddClientOpen(true);
        },
      },
    ],
    [],
  );

  const handleAddClient = async (payload: AddClientFormValues) => {
    if (!session) {
      throw new Error("Your session has expired. Please login again.");
    }

    const accessToken = await getValidAccessToken();

    await clientsApi.createClient(accessToken, payload);
    await loadClients();
  };

  const handleSetClientStatus = useCallback(
    async (clientId: string, status: "Active" | "Inactive") => {
      if (!session) {
        setActionError("Your session has expired. Please login again.");

        return;
      }

      setActionError("");

      try {
        const accessToken = await getValidAccessToken();

        await clientsApi.updateClientStatus(accessToken, clientId, status);
        await loadClients();
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Failed to update client status.",
        );
      }
    },
    [getValidAccessToken, loadClients, session],
  );

  const handleRemoveClient = useCallback(
    async (clientId: string) => {
      if (!session) {
        setActionError("Your session has expired. Please login again.");

        return;
      }

      setActionError("");

      try {
        const accessToken = await getValidAccessToken();

        await clientsApi.deleteClient(accessToken, clientId);
        await loadClients();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to remove client.",
        );
      }
    },
    [getValidAccessToken, loadClients, session],
  );

  return (
    <>
      {actionError ? (
        <Alert
          className="mb-2"
          color="danger"
          description={actionError}
          title="Client action failed"
          variant="flat"
        />
      ) : null}
      <ClientListTable
        headerActions={headerActions}
        rows={rows}
        title="Client List"
        onRemove={handleRemoveClient}
        onSetStatus={handleSetClientStatus}
      />
      <AddClientModal
        isOpen={isAddClientOpen}
        onOpenChange={setIsAddClientOpen}
        onSubmit={handleAddClient}
      />
    </>
  );
};

export default ClientsPage;
