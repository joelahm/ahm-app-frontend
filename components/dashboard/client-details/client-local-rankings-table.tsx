"use client";

import type { Selection } from "@react-types/shared";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import {
  ArrowUpToLine,
  EllipsisVertical,
  Eye,
  MapPinned,
  Plus,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  scansApi,
  type LocalRankingKeyword,
  type ScanComparisonRun,
} from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { ScanRunProgressCard } from "@/components/dashboard/client-details/scan-run-progress-card";
import { ScanKeywordModal } from "@/components/dashboard/client-details/scan-keyword-modal";
import { useAppToast } from "@/hooks/use-app-toast";
import { useScanRunSocket } from "@/hooks/use-scan-run-socket";

type LocalRankingRow = {
  businessName: string;
  clientId: string;
  distance: string;
  frequency: string;
  gridSize: string;
  id: string;
  intent: string;
  isProcessing: boolean;
  keyword: string;
  latestScan: string;
  nextScanDate: string;
  previousScan: string;
  scansGenerated: string;
  traffic: string;
};

type CompetitorAnalysisRow = {
  businessName: string;
  domain: string;
  gridSize: string;
  id: string;
  photos: string;
  primaryCategory: string;
  rankCurrent: string;
  rankPrevious: string;
  reviews: string;
  secondaryCategory: string;
};

interface ClientLocalRankingsTableProps {
  clientId?: number | string;
}

const thClassName = "text-xs font-medium text-[#111827] bg-[#F9FAFB]";
const PAGE_SIZE = 10;
const COMPETITOR_PAGE_SIZE = 8;
const KEYWORD_RESEARCH_LAUNCH_KEY = "ahm-local-rankings-launch";
const escapeCsvValue = (value: unknown) => {
  const normalized = String(value ?? "");

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
};

const formatMetric = (value?: number | null) =>
  value === null || value === undefined ? "-" : String(value);
const formatRankMetric = (value?: number | null) =>
  value === null || value === undefined ? "X" : String(value);

const formatPreviousMetric = (value?: number | null) =>
  value === null || value === undefined ? "" : String(value);

const formatFrequency = (value?: string | null) => {
  if (!value) {
    return "one-time";
  }

  return value
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateDisplay = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  return `${day}-${month}-${year}`;
};

const getGridSize = (totalCoordinates?: number | null) => {
  if (!totalCoordinates || totalCoordinates <= 0) {
    return "-";
  }

  const side = Math.sqrt(totalCoordinates);

  if (Number.isInteger(side)) {
    return `${side}× ${side}`;
  }

  return String(totalCoordinates);
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceKm = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
) => {
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(end.latitude - start.latitude);
  const deltaLongitude = toRadians(end.longitude - start.longitude);
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (item: LocalRankingKeyword) => {
  const points = item.coordinates ?? [];

  if (points.length < 2) {
    return "-";
  }

  let nearestDistanceKm = Number.POSITIVE_INFINITY;

  for (let index = 0; index < points.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < points.length; nextIndex += 1) {
      const distanceKm = calculateDistanceKm(points[index], points[nextIndex]);

      if (distanceKm > 0 && distanceKm < nearestDistanceKm) {
        nearestDistanceKm = distanceKm;
      }
    }
  }

  if (!Number.isFinite(nearestDistanceKm)) {
    return "-";
  }

  const isMiles = item.coverageUnit === "MILES";
  const value = isMiles ? nearestDistanceKm / 1.60934 : nearestDistanceKm;
  const unit = isMiles ? "mi" : "km";

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`;
};

const mapRankingRow = (item: LocalRankingKeyword): LocalRankingRow => ({
  businessName: item.clientName || "Client",
  clientId: String(item.clientId ?? ""),
  distance: formatDistance(item),
  gridSize: getGridSize(item.totalCoordinates),
  frequency: formatFrequency(item.frequency),
  id: String(item.scanId),
  intent: "-",
  isProcessing: false,
  keyword: item.keyword,
  latestScan: formatRankMetric(item.latestScan ?? item.averageRank),
  nextScanDate: formatDateDisplay(item.nextSchedule ?? item.nextRunAt),
  previousScan: formatPreviousMetric(item.previousScan),
  scansGenerated: formatMetric(item.totalScans),
  traffic: "-",
});

const buildCompetitorRows = (
  runs: ScanComparisonRun[],
): CompetitorAnalysisRow[] => {
  const aggregated = new Map<
    string,
    {
      businessName: string;
      domain: string;
      rankCount: number;
      rankTotal: number;
      ratingCount: number;
      ratingTotal: number;
      reviewsCount: number;
      reviewsTotal: number;
      gridSize: string;
    }
  >();

  for (const run of runs) {
    const clientFoundInRun =
      run.averageRank !== null &&
      run.averageRank !== undefined &&
      Number.isFinite(Number(run.averageRank));

    if (!clientFoundInRun) {
      continue;
    }

    const runGridSize = getGridSize(run.totalCoordinates);

    for (const competitor of run.competitors || []) {
      const businessName = String(competitor.businessName ?? "").trim();

      if (!businessName) {
        continue;
      }

      const domain = String(competitor.domain ?? "-").trim() || "-";
      const id = String(competitor.key || `${businessName}|${domain}`);
      const current = aggregated.get(id);

      if (current) {
        if (
          competitor.averageRank !== null &&
          competitor.averageRank !== undefined
        ) {
          current.rankTotal += competitor.averageRank;
          current.rankCount += 1;
        }
        if (competitor.rating !== null && competitor.rating !== undefined) {
          current.ratingTotal += competitor.rating;
          current.ratingCount += 1;
        }
        if (
          competitor.reviewsCount !== null &&
          competitor.reviewsCount !== undefined
        ) {
          current.reviewsTotal += competitor.reviewsCount;
          current.reviewsCount += 1;
        }
        continue;
      }

      aggregated.set(id, {
        businessName,
        domain,
        gridSize: runGridSize,
        rankCount:
          competitor.averageRank !== null &&
          competitor.averageRank !== undefined
            ? 1
            : 0,
        rankTotal:
          competitor.averageRank !== null &&
          competitor.averageRank !== undefined
            ? competitor.averageRank
            : 0,
        ratingCount:
          competitor.rating !== null && competitor.rating !== undefined ? 1 : 0,
        ratingTotal:
          competitor.rating !== null && competitor.rating !== undefined
            ? competitor.rating
            : 0,
        reviewsCount:
          competitor.reviewsCount !== null &&
          competitor.reviewsCount !== undefined
            ? 1
            : 0,
        reviewsTotal:
          competitor.reviewsCount !== null &&
          competitor.reviewsCount !== undefined
            ? competitor.reviewsCount
            : 0,
      });
    }
  }

  const rows = Array.from(aggregated.entries()).map(([id, item]) => {
    const rankAverage = item.rankCount ? item.rankTotal / item.rankCount : null;
    const ratingAverage = item.ratingCount
      ? item.ratingTotal / item.ratingCount
      : null;
    const reviewsAverage = item.reviewsCount
      ? Math.round(item.reviewsTotal / item.reviewsCount)
      : null;

    return {
      businessName: item.businessName,
      domain: item.domain,
      gridSize: item.gridSize,
      id,
      photos: "-",
      primaryCategory: "-",
      rankCurrent: rankAverage === null ? "-" : rankAverage.toFixed(1),
      rankPrevious: "-",
      reviews:
        ratingAverage === null
          ? "-"
          : `${ratingAverage.toFixed(1)} | ${reviewsAverage ?? "-"} Reviews`,
      secondaryCategory: "-",
    };
  });

  return rows.sort((a, b) => {
    const rankA =
      a.rankCurrent === "-" ? Number.POSITIVE_INFINITY : Number(a.rankCurrent);
    const rankB =
      b.rankCurrent === "-" ? Number.POSITIVE_INFINITY : Number(b.rankCurrent);

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return a.businessName.localeCompare(b.businessName);
  });
};

export const ClientLocalRankingsTable = ({
  clientId,
}: ClientLocalRankingsTableProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const toast = useAppToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadTick, setReloadTick] = useState(0);
  const [rows, setRows] = useState<LocalRankingRow[]>([]);
  const [competitorRows, setCompetitorRows] = useState<CompetitorAnalysisRow[]>(
    [],
  );
  const [totalPages, setTotalPages] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [prefilledKeywords, setPrefilledKeywords] = useState<string[]>([]);
  const [savedScanLaterKeywords, setSavedScanLaterKeywords] = useState<
    string[]
  >([]);
  const [deletingScanId, setDeletingScanId] = useState<string | null>(null);
  const [runningScanId, setRunningScanId] = useState<string | null>(null);
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
  const selectedRowIds = useMemo(() => {
    if (selectedKeys === "all") {
      return rows.map((row) => row.id);
    }

    return Array.from(selectedKeys).map(String);
  }, [rows, selectedKeys]);
  const selectedExportRows = useMemo(() => {
    const selectedIds = new Set(selectedRowIds);

    return rows.filter((row) => selectedIds.has(row.id));
  }, [rows, selectedRowIds]);
  const keywordsInProgressCount = useMemo(
    () => rows.filter((row) => row.isProcessing).length,
    [rows],
  );

  useEffect(() => {
    if (!clientId || typeof window === "undefined") {
      return;
    }

    const shouldOpenFromQuery = searchParams.get("openScanModal") === "1";
    const prefillKeywordsFromQuery = searchParams.get("prefillKeywords");
    const rawLaunchPayload = window.sessionStorage.getItem(
      KEYWORD_RESEARCH_LAUNCH_KEY,
    );

    if (!rawLaunchPayload && !shouldOpenFromQuery) {
      return;
    }

    try {
      const queryKeywords = (() => {
        if (!prefillKeywordsFromQuery) {
          return [];
        }

        try {
          const decoded = JSON.parse(
            decodeURIComponent(prefillKeywordsFromQuery),
          ) as unknown;

          if (!Array.isArray(decoded)) {
            return [];
          }

          return decoded;
        } catch {
          return [];
        }
      })();
      const parsedPayload = rawLaunchPayload
        ? (JSON.parse(rawLaunchPayload) as {
            clientId?: string;
            keywords?: string[];
          })
        : null;
      const targetClientId = String(parsedPayload?.clientId ?? "");

      if (
        parsedPayload &&
        targetClientId &&
        String(clientId) !== targetClientId
      ) {
        return;
      }

      const normalizedKeywords = Array.from(
        new Set(
          [...(parsedPayload?.keywords ?? []), ...queryKeywords]
            .map((item) => String(item || "").trim())
            .filter(Boolean),
        ),
      );

      if (normalizedKeywords.length) {
        setPrefilledKeywords(normalizedKeywords);
      }
      setIsScanModalOpen(true);
      window.sessionStorage.removeItem(KEYWORD_RESEARCH_LAUNCH_KEY);

      if (shouldOpenFromQuery && pathname) {
        router.replace(pathname, { scroll: false });
      }
    } catch {
      window.sessionStorage.removeItem(KEYWORD_RESEARCH_LAUNCH_KEY);
    }
  }, [clientId, pathname, router, searchParams]);

  useEffect(() => {
    if (!session?.accessToken || !clientId) {
      setSavedScanLaterKeywords([]);

      return;
    }

    let isMounted = true;

    const loadSavedKeywords = async () => {
      try {
        const response = await scansApi.getSavedLocalRankingKeywords(
          session.accessToken,
          clientId,
        );

        if (!isMounted) {
          return;
        }

        setSavedScanLaterKeywords(response.keywords ?? []);
      } catch {
        if (!isMounted) {
          return;
        }

        setSavedScanLaterKeywords([]);
      }
    };

    void loadSavedKeywords();

    return () => {
      isMounted = false;
    };
  }, [clientId, reloadTick, session?.accessToken]);

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

        setRows((currentRows) => {
          const fetchedRows = response.keywords.map(mapRankingRow);
          const optimisticProcessingRows = currentRows.filter(
            (row) =>
              row.isProcessing &&
              !fetchedRows.some((fetchedRow) => fetchedRow.id === row.id),
          );

          return [...optimisticProcessingRows, ...fetchedRows];
        });
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
    if (!session?.accessToken || !clientId) {
      setCompetitorRows([]);

      return;
    }

    let isMounted = true;

    const loadCompetitors = async () => {
      try {
        const collected: LocalRankingKeyword[] = [];
        let nextPage: number | null = 1;

        while (nextPage) {
          const response = await scansApi.getClientLocalRankings(
            session.accessToken,
            clientId,
            {
              limit: 100,
              page: nextPage,
            },
          );

          collected.push(...response.keywords);
          nextPage = response.pagination.nextPage;
        }

        if (!isMounted) {
          return;
        }

        const uniqueScanIds = Array.from(
          new Set(collected.map((item) => item.scanId).filter(Boolean)),
        );
        const comparisons = await Promise.all(
          uniqueScanIds.map(async (scanId) => {
            try {
              return await scansApi.getClientScanComparison(
                session.accessToken,
                clientId,
                scanId,
                2,
              );
            } catch {
              return null;
            }
          }),
        );
        const latestRuns = comparisons
          .map((response) => response?.comparison?.runs?.[0] ?? null)
          .filter(Boolean) as ScanComparisonRun[];

        setCompetitorRows(buildCompetitorRows(latestRuns));
      } catch {
        if (!isMounted) {
          return;
        }

        setCompetitorRows([]);
      }
    };

    void loadCompetitors();

    return () => {
      isMounted = false;
    };
  }, [clientId, reloadTick, session?.accessToken]);

  useEffect(() => {
    if (!completedRun) {
      return;
    }

    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === String(completedRun.run.scanId)
          ? { ...row, isProcessing: false }
          : row,
      ),
    );
    setReloadTick((value) => value + 1);
  }, [completedRun]);

  const handleDeleteKeyword = useCallback(
    async (scanId: string, keyword: string) => {
      if (!session?.accessToken) {
        toast.danger("Session expired", {
          description: "Please login again.",
        });

        return;
      }

      setDeletingScanId(scanId);
      try {
        await scansApi.deleteScanKeyword(session.accessToken, scanId, keyword);
        toast.success("Keyword deleted successfully.");
        setReloadTick((value) => value + 1);
      } catch (error) {
        toast.danger("Failed to delete keyword", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setDeletingScanId(null);
      }
    },
    [session?.accessToken, toast],
  );

  const handleRunScanAgain = useCallback(
    async (scanId: string) => {
      if (!session?.accessToken) {
        toast.danger("Session expired", {
          description: "Please login again.",
        });

        return;
      }

      setRunningScanId(scanId);
      try {
        const response = await scansApi.runScan(session.accessToken, scanId);

        if (response.run?.id && response.run.scanId) {
          setActiveRun({
            runId: response.run.id,
            scanId: response.run.scanId,
          });
        }

        setRows((currentRows) =>
          currentRows.map((row) =>
            row.id === scanId ? { ...row, isProcessing: true } : row,
          ),
        );

        toast.success("Scan queued successfully.");
      } catch (error) {
        toast.danger("Failed to queue scan", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setRunningScanId(null);
      }
    },
    [session?.accessToken, toast],
  );

  const columns = useMemo<DashboardDataTableColumn<LocalRankingRow>[]>(
    () => [
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
        key: "distance",
        label: "Distance",
        className: thClassName,
        renderCell: (item) => (
          <span className="text-sm text-[#111827]">{item.distance}</span>
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
        key: "action",
        label: "Action",
        className: thClassName,
        renderCell: (item) => (
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              as={Link}
              href={`/dashboard/clients/${item.clientId}/local-rankings/${encodeURIComponent(item.id)}`}
              isDisabled={item.isProcessing}
              radius="lg"
              size="sm"
              variant="bordered"
            >
              <Eye size={18} />
            </Button>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button
                  isIconOnly
                  isDisabled={
                    item.isProcessing ||
                    deletingScanId === item.id ||
                    runningScanId === item.id
                  }
                  radius="lg"
                  size="sm"
                  variant="bordered"
                >
                  <EllipsisVertical size={18} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Local ranking actions"
                onAction={(key) => {
                  if (String(key) === "scan-again") {
                    void handleRunScanAgain(item.id);
                  }

                  if (String(key) === "delete-keyword") {
                    void handleDeleteKeyword(item.id, item.keyword);
                  }
                }}
              >
                <DropdownItem
                  key="scan-again"
                  startContent={<RotateCcw size={16} />}
                >
                  Scan again
                </DropdownItem>
                <DropdownItem
                  key="delete-keyword"
                  className="text-danger"
                  color="danger"
                  startContent={<Trash2 size={16} />}
                >
                  Delete Keyword
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        ),
      },
    ],
    [deletingScanId, handleDeleteKeyword, handleRunScanAgain, runningScanId],
  );

  const headerActions = useMemo(() => [], []);

  const competitorColumns = useMemo<
    DashboardDataTableColumn<CompetitorAnalysisRow>[]
  >(
    () => [
      {
        key: "businessName",
        label: "Business Name",
        className: thClassName,
        renderCell: (item) => (
          <p className="text-sm text-[#111827]">{item.businessName}</p>
        ),
      },
      {
        key: "domain",
        label: "Domain",
        className: thClassName,
        renderCell: (item) => (
          <span className="text-sm text-[#111827]">{item.domain}</span>
        ),
      },
      {
        key: "rankPrevious",
        label: "Rank (Previous)",
        className: thClassName,
        renderCell: (item) => (
          <span className="text-sm text-[#111827]">{item.rankPrevious}</span>
        ),
      },
      {
        key: "rankCurrent",
        label: "Rank (Current)",
        className: thClassName,
        renderCell: (item) => (
          <span className="text-sm text-[#111827]">{item.rankCurrent}</span>
        ),
      },
      {
        key: "reviews",
        label: "Reviews",
        className: thClassName,
        renderCell: (item) => (
          <div className="flex items-center gap-1 whitespace-nowrap text-sm text-[#111827]">
            <Star className="fill-[#F59E0B] text-[#F59E0B]" size={14} />
            <span>{item.reviews}</span>
          </div>
        ),
      },
    ],
    [],
  );

  const handleExportCsv = useCallback(() => {
    if (!rows.length) {
      toast.warning("No rows to export.");

      return;
    }

    const headers = [
      "Business Name",
      "Keyword",
      "Traffic",
      "Intent",
      "Previous Scan",
      "Latest Scan",
      "Grid Size",
      "Distance",
      "Next Scan Date",
      "Scans Generated",
      "Frequency",
    ];
    const csvRows = rows.map((row) => [
      row.businessName,
      row.keyword,
      row.traffic,
      row.intent,
      row.previousScan,
      row.latestScan,
      row.gridSize,
      row.distance,
      row.nextScanDate,
      row.scansGenerated,
      row.frequency,
    ]);
    const csv = [headers, ...csvRows]
      .map((line) => line.map(escapeCsvValue).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `keyword-monitoring-page-${currentPage}.csv`;
    link.style.display = "none";
    document.body.append(link);
    link.click();
    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 0);
    toast.success("CSV exported successfully.");
  }, [currentPage, rows, toast]);

  const handleExportSelectedMaps = useCallback(() => {
    if (!selectedExportRows.length) {
      toast.warning("Select at least one keyword row to export maps.");

      return;
    }

    window.open(
      `/print/scan-maps/${encodeURIComponent(
        selectedExportRows.map((row) => row.id).join(","),
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [selectedExportRows, toast]);

  return (
    <>
      {activeRun ? (
        <ScanRunProgressCard
          completedRun={completedRun}
          connectionStatus={connectionStatus}
          failedRun={failurePayload}
          keywordsInProgress={Math.max(1, keywordsInProgressCount)}
          latestProgress={latestProgress}
          progressPercent={progressPercent}
          runId={activeRun.runId}
          scanId={activeRun.scanId}
          startedRun={startedPayload}
          onDismiss={() => setActiveRun(null)}
        />
      ) : null}
      <DashboardDataTable
        enableSelection
        serverPagination
        showPagination
        ariaLabel="Client local rankings"
        columns={columns}
        currentPage={currentPage}
        getRowKey={(item) => item.id}
        getRowProps={(item) =>
          item.isProcessing
            ? {
                className: "opacity-60",
              }
            : {}
        }
        headerActions={headerActions}
        headerRight={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              startContent={<ArrowUpToLine size={14} />}
              variant="bordered"
              onPress={handleExportCsv}
            >
              Export CSV
            </Button>
            <Button
              isDisabled={!selectedExportRows.length}
              startContent={<MapPinned size={14} />}
              variant="bordered"
              onPress={handleExportSelectedMaps}
            >
              Export Maps
            </Button>
            <Button
              className="bg-[#022279] text-white"
              startContent={<Plus size={14} />}
              onPress={() => setIsScanModalOpen(true)}
            >
              Add Keywords
            </Button>
            {savedScanLaterKeywords.length ? (
              <Button
                variant="bordered"
                onPress={() => {
                  setPrefilledKeywords(savedScanLaterKeywords);
                  setIsScanModalOpen(true);
                }}
              >
                Saved For Later ({savedScanLaterKeywords.length})
              </Button>
            ) : null}
          </div>
        }
        pageSize={PAGE_SIZE}
        rows={rows}
        selectedKeys={selectedKeys}
        title="Keyword Monitoring"
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onSelectionChange={setSelectedKeys}
      />
      <ScanKeywordModal
        clientId={clientId}
        defaultKeywords={prefilledKeywords}
        isOpen={isScanModalOpen}
        onOpenChange={(open) => {
          setIsScanModalOpen(open);

          if (!open) {
            setPrefilledKeywords([]);
          }
        }}
        onRunStarted={(payload) => {
          setActiveRun({
            runId: payload.runId,
            scanId: payload.scanId,
          });

          if (session?.accessToken && clientId) {
            void scansApi
              .clearSavedLocalRankingKeywords(session.accessToken, clientId)
              .then(() => {
                setSavedScanLaterKeywords([]);
              })
              .catch(() => {
                // ignore clear failures after successful scan start
              });
          }

          setRows((currentRows) => {
            const optimisticRow: LocalRankingRow = {
              businessName:
                currentRows[0]?.businessName ||
                rows[0]?.businessName ||
                "Client",
              clientId: String(clientId ?? ""),
              frequency: formatFrequency(payload.frequency),
              gridSize: "-",
              distance: "-",
              id: String(payload.scanId),
              intent: "-",
              isProcessing: true,
              keyword: payload.keyword,
              latestScan: "-",
              nextScanDate: formatDateDisplay(payload.nextRunAt),
              previousScan: "-",
              scansGenerated: "0",
              traffic: "-",
            };

            return [
              optimisticRow,
              ...currentRows.filter((item) => item.id !== optimisticRow.id),
            ];
          });
        }}
      />
      <div className="mt-4">
        <DashboardDataTable
          showPagination
          ariaLabel="Competitor analysis"
          columns={competitorColumns}
          getRowKey={(item) => item.id}
          pageSize={COMPETITOR_PAGE_SIZE}
          rows={competitorRows}
          title="Competitor Analysis"
        />
      </div>
    </>
  );
};
