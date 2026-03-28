"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const getStoredAccessToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const rawSession = window.localStorage.getItem("ahm-auth-session");

    if (!rawSession) {
      return "";
    }

    const parsed = JSON.parse(rawSession) as { accessToken?: unknown };

    return typeof parsed.accessToken === "string" ? parsed.accessToken : "";
  } catch {
    return "";
  }
};

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

const ClientsPage = () => {
  const { session } = useAuth();
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
        managerAvatar:
          client.assignedUserAvatar ?? client.clientSuccessManagerAvatar ?? "",
        niche: client.niche ?? "-",
        projects: client.projects ?? [],
        status: client.status ?? "-",
      })),
    [],
  );

  const loadClients = useCallback(async () => {
    const accessToken = session?.accessToken || getStoredAccessToken();

    if (!accessToken) {
      setRows([]);

      return;
    }

    const clients = await clientsApi.getClients(accessToken);

    setRows(mapClientRows(clients));
  }, [mapClientRows, session?.accessToken]);

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
    const accessToken = session?.accessToken || getStoredAccessToken();

    if (!accessToken) {
      throw new Error("Your session has expired. Please login again.");
    }

    await clientsApi.createClient(accessToken, payload);
    await loadClients();
  };

  return (
    <>
      <ClientListTable
        headerActions={headerActions}
        rows={rows}
        title="Client List"
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
