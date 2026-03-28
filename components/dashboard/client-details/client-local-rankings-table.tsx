"use client";

import type { Selection } from "@react-types/shared";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import {
  Columns3,
  EllipsisVertical,
  Eye,
  List,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { scansApi, type LocalRankingKeyword } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { ScanRunProgressCard } from "@/components/dashboard/client-details/scan-run-progress-card";
import { ScanKeywordModal } from "@/components/dashboard/client-details/scan-keyword-modal";
import { useScanRunSocket } from "@/hooks/use-scan-run-socket";

type LocalRankingRow = {
  clientName: string;
  clientSubtitle: string;
  clientId: string;
  frequency: string;
  id: string;
  keyword: string;
  latestScan: string;
  previousScan: string;
  totalScans: string;
};

interface ClientLocalRankingsTableProps {
  clientId?: number | string;
}

const thClassName = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";
const PAGE_SIZE = 10;

const formatMetric = (value?: number | null) =>
  value === null || value === undefined ? "-" : String(value);

const formatFrequency = (value?: string | null) => {
  if (!value) {
    return "one-time";
  }

  return value.toLowerCase().replaceAll("_", "-");
};

const mapRankingRow = (item: LocalRankingKeyword): LocalRankingRow => ({
  clientName: item.clientName || "Client",
  clientSubtitle: item.clientAddress || "No address available",
  clientId: String(item.clientId ?? ""),
  frequency: formatFrequency(item.frequency),
  id: String(item.scanId),
  keyword: item.keyword,
  latestScan: formatMetric(item.latestScan ?? item.averageRank),
  previousScan: formatMetric(item.previousScan ?? item.bestRank),
  totalScans: formatMetric(item.totalScans ?? item.totalCoordinates),
});

const columns: DashboardDataTableColumn<LocalRankingRow>[] = [
  {
    key: "clientName",
    label: "Client Name",
    className: thClassName,
    renderCell: (item) => {
      return (
        <div className="space-y-1">
          <p className="text-sm text-[#111827]">{item.clientName}</p>
          <p className="text-xs text-default-500">{item.clientSubtitle}</p>
        </div>
      );
    },
  },
  {
    key: "keyword",
    label: "Keyword",
    className: thClassName,
    renderCell: (item) => (
      <Chip className="bg-[#EEF2FF] text-[#4F46E5]" radius="full" size="sm">
        {item.keyword}
      </Chip>
    ),
  },
  {
    key: "previousScan",
    label: "Previous Scan",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.previousScan}</span>
    ),
  },
  {
    key: "latestScan",
    label: "Latest Scan",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.latestScan}</span>
    ),
  },
  {
    key: "totalScans",
    label: "Total Scans",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.totalScans}</span>
    ),
  },
  {
    key: "frequency",
    label: "Frequency",
    className: thClassName,
    renderCell: (item) => (
      <Chip
        className="bg-[#DFF7FB] capitalize text-[#0891B2]"
        radius="full"
        size="sm"
      >
        {item.frequency}
      </Chip>
    ),
  },
  {
    key: "action",
    label: "Action",
    className: thClassName,
    renderCell: (item) => (
      <div className="flex items-center gap-2">
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button isIconOnly radius="lg" size="sm" variant="bordered">
              <EllipsisVertical size={18} />
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label="Local ranking actions">
            <DropdownItem
              key="view"
              as={Link}
              href={`/dashboard/clients/${item.clientId}/local-rankings/${encodeURIComponent(item.id)}`}
              startContent={<Eye size={16} />}
            >
              View
            </DropdownItem>
            <DropdownItem
              key="delete"
              className="text-danger"
              color="danger"
              startContent={<Trash2 size={16} />}
            >
              Delete
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    ),
  },
];

export const ClientLocalRankingsTable = ({
  clientId,
}: ClientLocalRankingsTableProps) => {
  const { session } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadTick, setReloadTick] = useState(0);
  const [rows, setRows] = useState<LocalRankingRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [activeRun, setActiveRun] = useState<{
    runId: number;
    scanId: number;
  } | null>(null);
  const {
    completedRun,
    connectionStatus,
    failurePayload,
    latestProgress,
    progressPercent,
    startedPayload,
  } = useScanRunSocket({
    runId: activeRun?.runId ?? null,
    scanId: activeRun?.scanId ?? null,
  });

  useEffect(() => {
    if (!session?.accessToken || !clientId) {
      setRows([]);
      setTotalPages(1);

      return;
    }

    let isMounted = true;

    const loadRankings = async () => {
      try {
        const response = await scansApi.getClientLocalRankings(
          session.accessToken,
          clientId,
          {
            limit: PAGE_SIZE,
            page: currentPage,
          },
        );

        if (!isMounted) {
          return;
        }

        setRows(response.keywords.map(mapRankingRow));
        setTotalPages(Math.max(1, response.pagination.totalPages));
      } catch {
        if (!isMounted) {
          return;
        }

        setRows([]);
        setTotalPages(1);
      }
    };

    void loadRankings();

    return () => {
      isMounted = false;
    };
  }, [clientId, currentPage, reloadTick, session?.accessToken]);

  useEffect(() => {
    if (!completedRun) {
      return;
    }

    setReloadTick((value) => value + 1);
  }, [completedRun]);

  const headerActions = useMemo(
    () => [
      {
        key: "filter",
        label: "Filter",
        startContent: <SlidersHorizontal size={14} />,
      },
      {
        key: "show",
        label: "Show 10",
        startContent: <List size={14} />,
      },
      {
        key: "columns",
        label: "Columns",
        startContent: <Columns3 size={14} />,
      },
    ],
    [],
  );

  return (
    <>
      <DashboardDataTable
        enableSelection
        serverPagination
        showPagination
        ariaLabel="Client local rankings"
        columns={columns}
        currentPage={currentPage}
        getRowKey={(item) => item.id}
        headerActions={headerActions}
        headerRight={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              radius="sm"
              startContent={<SlidersHorizontal size={14} />}
              variant="bordered"
            >
              Filter
            </Button>
            <Button
              radius="sm"
              startContent={<List size={14} />}
              variant="bordered"
            >
              Show 10
            </Button>
            <Button
              radius="sm"
              startContent={<Columns3 size={14} />}
              variant="bordered"
            >
              Columns
            </Button>
            <Button
              className="bg-[#022279] text-white"
              startContent={<Plus size={14} />}
              onPress={() => setIsScanModalOpen(true)}
            >
              Scan Keyword
            </Button>
          </div>
        }
        pageSize={PAGE_SIZE}
        rows={rows}
        selectedKeys={selectedKeys}
        title="Local Rankings"
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onSelectionChange={setSelectedKeys}
      />
      <ScanKeywordModal
        clientId={clientId}
        isOpen={isScanModalOpen}
        onOpenChange={setIsScanModalOpen}
        onRunStarted={setActiveRun}
      />
      {activeRun ? (
        <ScanRunProgressCard
          completedRun={completedRun}
          connectionStatus={connectionStatus}
          failedRun={failurePayload}
          latestProgress={latestProgress}
          progressPercent={progressPercent}
          runId={activeRun.runId}
          scanId={activeRun.scanId}
          startedRun={startedPayload}
          onDismiss={() => setActiveRun(null)}
        />
      ) : null}
    </>
  );
};
