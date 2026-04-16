"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { Search } from "lucide-react";

import { usersApi, type ActivityLogItem } from "@/apis/users";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { useAppToast } from "@/hooks/use-app-toast";

interface UserLogsRow {
  action: string;
  actor: string;
  actorId: string;
  createdAt: string;
  id: string;
  raw: ActivityLogItem;
  resource: string;
}

const headerCellClass = "bg-[#F9FAFB] text-xs font-medium text-[#111827]";

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatAction = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");

export const SettingsCreditUsageContent = () => {
  const { getValidAccessToken } = useAuth();
  const toast = useAppToast();
  const toastRef = useRef(toast);
  const [rows, setRows] = useState<UserLogsRow[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<UserLogsRow | null>(
    null,
  );
  const [searchValue, setSearchValue] = useState("");
  const [selectedActorId, setSelectedActorId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  toastRef.current = toast;

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const accessToken = await getValidAccessToken();
      const data = await usersApi.getActivityLogs(accessToken, {
        actorUserId: selectedActorId === "all" ? undefined : selectedActorId,
        limit: 10,
        page: currentPage,
      });

      const mappedRows: UserLogsRow[] = data.activityLogs.map((item) => ({
        action: formatAction(item.action),
        actor: item.actor?.name || item.actor?.email || "Unknown User",
        actorId: item.actor?.id ? String(item.actor.id) : "unknown",
        createdAt: formatDateTime(item.createdAt),
        id: String(item.id),
        raw: item,
        resource: item.resourceType,
      }));

      setRows(mappedRows);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (error) {
      setRows([]);
      setTotalPages(1);
      toastRef.current.danger("Failed to load user logs.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, getValidAccessToken, selectedActorId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const actorOptions = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      if (row.actorId !== "unknown" && !map.has(row.actorId)) {
        map.set(row.actorId, row.actor);
      }
    });

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      [row.action, row.actor, row.resource].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [rows, searchValue]);

  const columns = useMemo<DashboardDataTableColumn<UserLogsRow>[]>(
    () => [
      {
        className: headerCellClass,
        key: "actor",
        label: "User",
        renderCell: (item) => (
          <span className="text-sm font-medium text-[#111827]">
            {item.actor}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "action",
        label: "Activity",
        renderCell: (item) => (
          <span className="text-sm text-[#111827]">{item.action}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "resource",
        label: "Resource",
        renderCell: (item) => (
          <span className="text-sm capitalize text-default-600">
            {item.resource.replace(/_/g, " ")}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "createdAt",
        label: "Date & Time",
        renderCell: (item) => (
          <span className="text-sm text-default-600">{item.createdAt}</span>
        ),
      },
      {
        className: `${headerCellClass} text-right`,
        key: "actionButton",
        label: "Action",
        renderCell: (item) => (
          <div className="flex justify-end">
            <Button
              radius="sm"
              size="sm"
              variant="bordered"
              onPress={() => {
                setSelectedActivity(item);
              }}
            >
              View
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <DashboardDataTable
        serverPagination
        showPagination
        ariaLabel="User activity logs table"
        columns={columns}
        currentPage={currentPage}
        getRowKey={(item) => item.id}
        headerRight={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <Select
              aria-label="Filter by user"
              className="w-full sm:w-[220px]"
              label="User"
              labelPlacement="outside"
              selectedKeys={[selectedActorId]}
              size="sm"
              onSelectionChange={(keys) => {
                const nextActor = Array.from(keys as Set<string>)[0] ?? "all";

                setSelectedActorId(nextActor);
                setCurrentPage(1);
              }}
            >
              <SelectItem key="all">All Users</SelectItem>
              {actorOptions.map((option) => (
                <SelectItem key={option.id}>{option.label}</SelectItem>
              ))}
            </Select>
            <Input
              className="w-full sm:w-[260px]"
              endContent={<Search className="text-default-400" size={16} />}
              label="Search"
              labelPlacement="outside"
              placeholder="Search activity..."
              radius="sm"
              size="sm"
              value={searchValue}
              onValueChange={setSearchValue}
            />
          </div>
        }
        rows={filteredRows}
        title="User Logs"
        topContent={
          <p className="text-sm text-default-500">
            {isLoading
              ? "Loading user activity logs..."
              : `${rows.length} log item(s) on this page`}
          </p>
        }
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <Modal
        isOpen={!!selectedActivity}
        size="xl"
        onOpenChange={(open) => {
          if (!open) {
            setSelectedActivity(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader>User Activity Details</ModalHeader>
          <ModalBody>
            {selectedActivity ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-[160px_1fr] gap-3">
                  <p className="text-default-500">User</p>
                  <p className="font-medium text-[#111827]">
                    {selectedActivity.actor}
                  </p>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-3">
                  <p className="text-default-500">Activity</p>
                  <p className="font-medium text-[#111827]">
                    {selectedActivity.action}
                  </p>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-3">
                  <p className="text-default-500">Resource</p>
                  <p className="text-[#111827]">
                    {selectedActivity.raw.resourceType}
                    {selectedActivity.raw.resourceId
                      ? ` (${selectedActivity.raw.resourceId})`
                      : ""}
                  </p>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-3">
                  <p className="text-default-500">Date & Time</p>
                  <p className="text-[#111827]">
                    {formatDateTime(selectedActivity.raw.createdAt)}
                  </p>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-3">
                  <p className="text-default-500">IP Address</p>
                  <p className="text-[#111827]">
                    {selectedActivity.raw.ipAddress || "-"}
                  </p>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-3">
                  <p className="text-default-500">Request ID</p>
                  <p className="text-[#111827]">
                    {selectedActivity.raw.requestId || "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-default-200 p-3">
                  <p className="mb-2 font-medium text-[#111827]">Metadata</p>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-default-600">
                    {JSON.stringify(
                      selectedActivity.raw.metadata ?? {},
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              onPress={() => {
                setSelectedActivity(null);
              }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
