"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Progress } from "@heroui/progress";
import { EllipsisVertical, Eye, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { scansApi, type ClientScanDetails } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { useAppToast } from "@/hooks/use-app-toast";

type ScanListView = "deleted" | "history" | "recurring";

type ScanRow = {
  businessName: string;
  frequency: string;
  id: string;
  intent: string;
  keyword: string;
  latestScan: string;
  nextScanDate: string;
  previousScan: string;
  processedRequests: number;
  progressPercent: number;
  scansGenerated: string;
  scope: "CLIENT" | "QUICK";
  totalRequests: number;
  traffic: string;
  gridSize: string;
  status: "Completed" | "Deleted" | "Failed" | "Scanning";
  statusRaw: string;
};

type ScanAverageSnapshot = {
  latestScan: string;
  previousScan: string;
};

const thClassName = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatFrequency = (value?: string | null) => {
  if (!value) {
    return "One-time";
  }

  return value
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeStatus = (
  scan: ClientScanDetails,
): "Completed" | "Deleted" | "Failed" | "Scanning" => {
  const normalizedScanStatus = String(scan.status || "").toUpperCase();
  const normalizedRunStatus = String(
    scan.latestRun?.status || "",
  ).toUpperCase();
  const statusCandidates = [normalizedRunStatus, normalizedScanStatus];

  if (statusCandidates.some((status) => status === "DELETED")) {
    return "Deleted";
  }

  if (
    statusCandidates.some((status) =>
      ["CANCELLED", "ERROR", "FAILED"].includes(status),
    )
  ) {
    return "Failed";
  }

  if (
    statusCandidates.some((status) =>
      [
        "IN_PROGRESS",
        "PENDING",
        "PROCESSING",
        "QUEUED",
        "RUNNING",
        "STARTED",
      ].includes(status),
    )
  ) {
    return "Scanning";
  }

  return "Completed";
};

const getBusinessName = (scan: ClientScanDetails) => {
  if (scan.scanScope === "QUICK" && scan.quickScanContext) {
    const raw = scan.quickScanContext as Record<string, unknown>;
    const name = String(raw.businessName || "").trim();

    return name || "Quick Scan GBP";
  }

  return scan.gbpProfile?.title || "Client GBP";
};

const formatGridSize = (scan: ClientScanDetails) => {
  const points = scan.coverage?.length ?? 0;

  if (!points) {
    return "-";
  }

  const size = Math.sqrt(points);

  if (Number.isInteger(size)) {
    return `${size}x${size}`;
  }

  return `${points} points`;
};

const formatIntent = (_scan: ClientScanDetails) => "-";

const formatLatestScan = (scan: ClientScanDetails) => {
  const summary =
    (scan.latestRun?.summary as Record<string, unknown> | undefined) ??
    undefined;
  const averageRankCandidates = [
    summary?.averageRank,
    summary?.avgRank,
    summary?.meanRank,
  ];

  for (const candidate of averageRankCandidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate.toFixed(2);
    }
  }

  return "-";
};

const formatScansGenerated = (scan: ClientScanDetails) => {
  const totalRuns = scan.repeatTime ?? null;
  const remainingRuns = scan.remainingRuns ?? null;

  if (
    typeof totalRuns === "number" &&
    Number.isFinite(totalRuns) &&
    typeof remainingRuns === "number" &&
    Number.isFinite(remainingRuns)
  ) {
    const completed = Math.max(0, totalRuns - remainingRuns);

    return `${completed}/${totalRuns}`;
  }

  return scan.latestRun?.id ? "1" : "0";
};

const computeAverageRankFromRun = (
  run: Awaited<ReturnType<typeof scansApi.getScanRunById>> | null,
) => {
  const summary =
    run?.summary && typeof run.summary === "object"
      ? (run.summary as Record<string, unknown>)
      : null;

  const summaryCandidates = [
    summary?.averageRank,
    summary?.avgRank,
    summary?.meanRank,
  ];

  for (const candidate of summaryCandidates) {
    const value =
      typeof candidate === "number"
        ? candidate
        : typeof candidate === "string"
          ? Number(candidate)
          : NaN;

    if (Number.isFinite(value)) {
      return value.toFixed(2);
    }
  }

  if (!run?.results || !Array.isArray(run.results) || !run.results.length) {
    return "-";
  }

  const rankedItems = run.results
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const rawEntry = entry as Record<string, unknown>;
      const rankCandidates = [
        rawEntry.rankAbsolute,
        rawEntry.rank_absolute,
        rawEntry.rank,
      ];

      const rank = rankCandidates.find(
        (candidate) =>
          typeof candidate === "number" && Number.isFinite(candidate),
      );

      if (typeof rank !== "number" || !Number.isFinite(rank)) {
        return null;
      }

      return rank;
    })
    .filter((value): value is number => typeof value === "number");

  if (!rankedItems.length) {
    return "-";
  }

  const average =
    rankedItems.reduce((sum, value) => sum + value, 0) / rankedItems.length;

  return average.toFixed(2);
};

const mapScanRow = (
  scan: ClientScanDetails,
  averages?: ScanAverageSnapshot,
): ScanRow => ({
  businessName: getBusinessName(scan),
  frequency: formatFrequency(scan.frequency),
  id: String(scan.id),
  intent: formatIntent(scan),
  keyword: scan.keyword,
  latestScan: averages?.latestScan ?? formatLatestScan(scan),
  nextScanDate: formatDate(scan.nextRunAt),
  previousScan: averages?.previousScan ?? "-",
  processedRequests:
    (scan.latestRun?.completedRequests ?? 0) +
    (scan.latestRun?.failedRequests ?? 0),
  progressPercent:
    scan.latestRun?.totalRequests && scan.latestRun.totalRequests > 0
      ? Math.min(
          100,
          Math.round(
            (((scan.latestRun?.completedRequests ?? 0) +
              (scan.latestRun?.failedRequests ?? 0)) /
              scan.latestRun.totalRequests) *
              100,
          ),
        )
      : 0,
  scansGenerated: formatScansGenerated(scan),
  scope: scan.scanScope === "QUICK" ? "QUICK" : "CLIENT",
  totalRequests: scan.latestRun?.totalRequests ?? 0,
  traffic: "-",
  gridSize: formatGridSize(scan),
  status: normalizeStatus(scan),
  statusRaw: scan.status ?? "-",
});

const buildColumns = ({
  onView,
  deletingScanId,
  rerunningScanId,
  onDelete,
  onScanAgain,
  view,
}: {
  onView: (scanId: string) => void;
  deletingScanId: string | null;
  rerunningScanId: string | null;
  onDelete: (scanId: string) => void;
  onScanAgain: (scanId: string) => void;
  view: ScanListView;
}): Array<DashboardDataTableColumn<ScanRow>> => [
  {
    key: "businessName",
    label: "Business Name",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.businessName}</span>
    ),
  },
  {
    key: "keyword",
    label: "Keyword",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.keyword}</span>
    ),
  },
  {
    key: "traffic",
    label: "Traffic",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.traffic}</span>
    ),
  },
  {
    key: "intent",
    label: "Intent",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.intent}</span>
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
    key: "gridSize",
    label: "Grid Size",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.gridSize}</span>
    ),
  },
  {
    key: "nextScanDate",
    label: "Next Scan Date",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.nextScanDate}</span>
    ),
  },
  {
    key: "scansGenerated",
    label: "Scans Generated",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.scansGenerated}</span>
    ),
  },
  {
    key: "frequency",
    label: "Frequency",
    className: thClassName,
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.frequency}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    className: thClassName,
    renderCell: (item) => {
      const isScanning = item.status === "Scanning";

      return (
        <div className="space-y-1.5">
          <Chip
            className={
              item.status === "Completed"
                ? "h-5 bg-[#DCFCE7] px-2 text-[10px] text-[#047857]"
                : item.status === "Scanning"
                  ? "h-5 bg-[#DBEAFE] px-2 text-[10px] text-[#1D4ED8]"
                  : item.status === "Failed"
                    ? "h-5 bg-[#FEE2E2] px-2 text-[10px] text-[#B91C1C]"
                    : "h-5 bg-[#F3F4F6] px-2 text-[10px] text-[#374151]"
            }
            radius="full"
            size="sm"
            variant="flat"
          >
            {item.status}
          </Chip>
          {isScanning ? (
            <div className="space-y-1">
              <Progress
                aria-label="Scan progress"
                classNames={{
                  indicator: "bg-[#1D4ED8]",
                  track: "h-1.5 bg-default-200",
                }}
                size="sm"
                value={item.progressPercent}
              />
              <p className="text-[10px] text-default-500">
                {item.totalRequests > 0
                  ? `${item.processedRequests}/${item.totalRequests}`
                  : "In progress"}
              </p>
            </div>
          ) : null}
        </div>
      );
    },
  },
  {
    key: "action",
    label: "Action",
    className: thClassName,
    renderCell: (item) =>
      view === "deleted" ? (
        <span className="text-xs text-default-400">-</span>
      ) : (
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button
              isIconOnly
              isDisabled={item.status === "Scanning"}
              radius="sm"
              size="sm"
              variant="bordered"
            >
              <EllipsisVertical size={14} />
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label={`scan-action-${item.id}`}>
            <DropdownItem
              key="view"
              isDisabled={item.status === "Scanning"}
              startContent={<Eye size={16} />}
              onPress={() => onView(item.id)}
            >
              View
            </DropdownItem>
            {view === "history" ? (
              <DropdownItem
                key="scan-again"
                isDisabled={
                  rerunningScanId === item.id ||
                  deletingScanId === item.id ||
                  item.status === "Scanning"
                }
                startContent={<RefreshCw size={16} />}
                onPress={() => onScanAgain(item.id)}
              >
                Scan again
              </DropdownItem>
            ) : null}
            <DropdownItem
              key="delete"
              className="text-danger"
              color="danger"
              isDisabled={
                deletingScanId === item.id ||
                rerunningScanId === item.id ||
                item.status === "Scanning"
              }
              startContent={<Trash2 size={16} />}
              onPress={() => onDelete(item.id)}
            >
              Delete
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      ),
  },
];

export const ScansListScreen = ({
  scope = "ALL",
  title,
  view,
}: {
  scope?: "ALL" | "CLIENT" | "QUICK";
  title: string;
  view: ScanListView;
}) => {
  const router = useRouter();
  const toast = useAppToast();
  const { getValidAccessToken } = useAuth();
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingScanId, setDeletingScanId] = useState<string | null>(null);
  const [rerunningScanId, setRerunningScanId] = useState<string | null>(null);

  const buildAverageSnapshots = async (
    accessToken: string,
    scans: ClientScanDetails[],
  ) => {
    const entries = await Promise.all(
      scans.map(async (scan) => {
        try {
          const runsResponse = await scansApi.listScanRuns(
            accessToken,
            scan.id,
            {
              limit: 2,
              page: 1,
            },
          );
          const latestRun = runsResponse.runs?.[0] ?? null;
          const previousRun = runsResponse.runs?.[1] ?? null;

          const [latestRunWithDetails, previousRunWithDetails] =
            await Promise.all([
              latestRun?.id && computeAverageRankFromRun(latestRun) === "-"
                ? scansApi.getScanRunById(accessToken, scan.id, latestRun.id)
                : Promise.resolve(latestRun),
              previousRun?.id && computeAverageRankFromRun(previousRun) === "-"
                ? scansApi.getScanRunById(accessToken, scan.id, previousRun.id)
                : Promise.resolve(previousRun),
            ]);

          return [
            scan.id,
            {
              latestScan: computeAverageRankFromRun(latestRunWithDetails),
              previousScan: computeAverageRankFromRun(previousRunWithDetails),
            } satisfies ScanAverageSnapshot,
          ] as const;
        } catch {
          return [
            scan.id,
            {
              latestScan: "-",
              previousScan: "-",
            } satisfies ScanAverageSnapshot,
          ] as const;
        }
      }),
    );

    return new Map(entries);
  };

  const loadScans = async (page: number) => {
    setIsLoading(true);

    try {
      const accessToken = await getValidAccessToken();
      const response = await scansApi.listScans(accessToken, {
        limit: 10,
        page,
        scope,
        view,
      });
      const averageSnapshots = await buildAverageSnapshots(
        accessToken,
        response.scans,
      );

      setRows(
        response.scans.map((scan) =>
          mapScanRow(scan, averageSnapshots.get(scan.id)),
        ),
      );
      setTotalPages(Math.max(1, response.pagination.totalPages || 1));
      setCurrentPage(response.pagination.page || page);
    } catch (error) {
      toast.danger("Failed to load scans.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
      setRows([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadScans(currentPage);
  }, [currentPage, scope, view]);

  const hasActiveScanningRows = useMemo(
    () => rows.some((row) => row.status === "Scanning"),
    [rows],
  );

  useEffect(() => {
    if (!hasActiveScanningRows) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadScans(currentPage);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [currentPage, hasActiveScanningRows, scope, view]);

  const columns = useMemo(
    () =>
      buildColumns({
        onView: (scanId) => {
          router.push(`/dashboard/quick-scan/${scanId}`);
        },
        deletingScanId,
        rerunningScanId,
        onDelete: async (scanId) => {
          setDeletingScanId(scanId);
          try {
            const accessToken = await getValidAccessToken();

            await scansApi.deleteScanById(accessToken, scanId);
            toast.success("Scan moved to deleted reports.");
            await loadScans(currentPage);
          } catch (error) {
            toast.danger("Failed to delete scan.", {
              description:
                error instanceof Error ? error.message : "Please try again.",
            });
          } finally {
            setDeletingScanId(null);
          }
        },
        onScanAgain: async (scanId) => {
          setRerunningScanId(scanId);
          try {
            const accessToken = await getValidAccessToken();

            await scansApi.runScan(accessToken, scanId);
            toast.success("Scan started.", {
              description: "We're running this scan again now.",
            });
            await loadScans(currentPage);
          } catch (error) {
            toast.danger("Failed to run scan again.", {
              description:
                error instanceof Error ? error.message : "Please try again.",
            });
          } finally {
            setRerunningScanId(null);
          }
        },
        view,
      }),
    [
      currentPage,
      deletingScanId,
      getValidAccessToken,
      loadScans,
      rerunningScanId,
      router,
      toast,
      view,
    ],
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111827]">{title}</h1>
        <Button
          isLoading={isLoading}
          startContent={<RefreshCw size={14} />}
          variant="bordered"
          onPress={() => {
            void loadScans(currentPage);
          }}
        >
          Refresh
        </Button>
      </div>

      <DashboardDataTable
        serverPagination
        showPagination
        ariaLabel={`${title} table`}
        columns={columns}
        currentPage={currentPage}
        getRowKey={(item) => item.id}
        getRowProps={(item) =>
          item.status === "Scanning"
            ? { className: "opacity-60 transition-opacity" }
            : {}
        }
        pageSize={10}
        rows={rows}
        title=""
        totalPages={totalPages}
        onPageChange={(page) => {
          setCurrentPage(page);
          void loadScans(page);
        }}
      />
    </section>
  );
};
