"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "@heroui/modal";
import { Spinner } from "@heroui/spinner";
import clsx from "clsx";
import { ChevronDown, LayoutGrid, Star, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { scansApi, type LocalRankingKeyword, type ScanRecord } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import { ScanCoverageMiniMap } from "@/components/dashboard/client-details/scan-coverage-mini-map";

type CompetitorRow = {
  businessName: string;
  delta: number | null;
  domain: string;
  gridSize: string;
  latestRank: string;
  previousRank: string;
  reviews: string;
};

type MiniMapPanelProps = {
  averageRank: string;
  center: {
    latitude: number;
    longitude: number;
  } | null;
  label?: string | null;
  points?: Array<{
    label: string;
    latitude: number;
    longitude: number;
    rank?: number | null;
  }>;
  runOptions: Array<{ label: string; value: string }>;
  selectedRunId: string | null;
  slotLabel: string;
  isPanelVisible: boolean;
  onRunChange: (runId: string) => void;
  onSeeCompetitor: () => void;
  subtitle?: string | null;
  title: string;
};

const toolbarChipClass =
  "h-10 rounded-lg border border-default-200 bg-white text-xs text-default-600 shadow-none";
const panelClass = "border border-default-200 bg-white shadow-none";

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

const formatAverageRank = (value?: number | null, fallback = "X") =>
  value === null || value === undefined ? fallback : value.toFixed(2);

const formatRunTitle = (value?: string | null) => {
  if (!value) {
    return "Latest Run";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Latest Run";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatRunDateTimeLabel = (value?: string | null) => {
  if (!value) {
    return "Latest Run";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Latest Run";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatRunSubtitle = (value?: string | null) => {
  if (!value) {
    return "Pending";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatCompetitorMetric = (value?: number | null) =>
  value === null || value === undefined ? "-" : value.toFixed(2);

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

const formatAreaLabel = (
  coverage: Array<{ latitude: number; longitude: number }>,
  coverageUnit?: string | null,
) => {
  if (!coverage.length) {
    return "Area -";
  }

  const latitudes = coverage.map((point) => point.latitude);
  const longitudes = coverage.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const heightKm = calculateDistanceKm(
    { latitude: minLatitude, longitude: minLongitude },
    { latitude: maxLatitude, longitude: minLongitude },
  );
  const widthKm = calculateDistanceKm(
    { latitude: minLatitude, longitude: minLongitude },
    { latitude: minLatitude, longitude: maxLongitude },
  );
  const areaSqKm = heightKm * widthKm;
  const isMiles = coverageUnit === "MILES";
  const areaValue = isMiles ? areaSqKm * 0.386102 : areaSqKm;
  const areaUnit = isMiles ? "sq. mi" : "sq. km";

  return `Area ${areaValue.toFixed(2)} ${areaUnit}`;
};

const formatGridSizeLabel = (
  coverage: Array<{ latitude: number; longitude: number }>,
) => {
  if (!coverage.length) {
    return "Grid Size -";
  }

  const size = Math.sqrt(coverage.length);

  if (Number.isInteger(size)) {
    return `Grid Size ${size}×${size}`;
  }

  return `Grid Points ${coverage.length}`;
};

const formatRankHeader = (value?: string | null) => {
  if (!value) {
    return "Rank";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Rank";
  }

  return `Rank (${new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)})`;
};

const toNumberOrNull = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

const toStringOrNull = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : null;
};

const buildQuickKeywordFromRun = ({
  keyword,
  run,
}: {
  keyword: string;
  run: ScanRecord;
}): LocalRankingKeyword => {
  const runMeta = run as unknown as {
    finishedAt?: string | null;
    startedAt?: string | null;
  };
  const resultItems = Array.isArray(run.results)
    ? (run.results as Array<Record<string, unknown>>)
    : [];
  const competitorMap = new Map<
    string,
    {
      address: string | null;
      businessName: string;
      domain: string | null;
      rankCount: number;
      rankTotal: number;
      rating: number | null;
      reviewsCount: number | null;
      bestRank: number | null;
    }
  >();

  const coordinateRows = resultItems.map((result, index) => {
    const rankAbsolute = toNumberOrNull(result.rankAbsolute);
    const rankGroup = toNumberOrNull(result.rankGroup);
    const matchedTitle = toStringOrNull(result.matchedTitle);
    const matchedDomain = toStringOrNull(result.matchedDomain);
    const matchedPlaceId = toStringOrNull(result.matchedPlaceId);
    const matchedAddress = toStringOrNull(result.matchedAddress);
    const matchedPhone = toStringOrNull(result.matchedPhone);
    const matchedRating = toNumberOrNull(result.matchedRating);
    const matchedItem =
      result.matchedItem && typeof result.matchedItem === "object"
        ? (result.matchedItem as Record<string, unknown>)
        : null;
    const candidateList: Array<Record<string, unknown>> = [];

    if (matchedItem) {
      if (
        matchedItem.candidate &&
        typeof matchedItem.candidate === "object" &&
        matchedItem.source === "EXACT_MATCH"
      ) {
        candidateList.push(matchedItem.candidate as Record<string, unknown>);
      }

      if (Array.isArray(matchedItem.topCandidates)) {
        candidateList.push(
          ...(matchedItem.topCandidates.filter(
            (candidate) => candidate && typeof candidate === "object",
          ) as Array<Record<string, unknown>>),
        );
      }
    }

    if (matchedTitle || matchedDomain || matchedAddress) {
      candidateList.push({
        address: matchedAddress,
        domain: matchedDomain,
        rankAbsolute,
        reviewsCount: toNumberOrNull(result.matchedReviewsCount),
        title: matchedTitle,
      });
    }

    candidateList.forEach((candidate) => {
      const businessName =
        toStringOrNull(candidate.title) ||
        toStringOrNull(candidate.name) ||
        toStringOrNull(candidate.businessName);

      if (!businessName) {
        return;
      }

      const domain = toStringOrNull(candidate.domain);
      const address = toStringOrNull(candidate.address);
      const rank = toNumberOrNull(candidate.rankAbsolute);
      const rating = toNumberOrNull(candidate.rating);
      const reviewsCount = toNumberOrNull(candidate.reviewsCount);
      const key =
        toStringOrNull(candidate.placeId) ||
        toStringOrNull(candidate.place_id) ||
        `${businessName.toLowerCase()}::${(address || "").toLowerCase()}`;
      const current = competitorMap.get(key) || {
        address,
        businessName,
        domain,
        rankCount: 0,
        rankTotal: 0,
        rating,
        reviewsCount,
        bestRank: null,
      };

      if (!current.address && address) {
        current.address = address;
      }
      if (!current.domain && domain) {
        current.domain = domain;
      }
      if (current.rating === null || current.rating === undefined) {
        current.rating = rating;
      }
      if (current.reviewsCount === null || current.reviewsCount === undefined) {
        current.reviewsCount = reviewsCount;
      }

      if (rank !== null) {
        current.rankTotal += rank;
        current.rankCount += 1;
        current.bestRank =
          current.bestRank === null ? rank : Math.min(current.bestRank, rank);
      }

      competitorMap.set(key, current);
    });

    return {
      id: Number(result.id || index + 1),
      coordinateLabel: toStringOrNull(result.coordinateLabel) || `Point ${index + 1}`,
      latitude: toNumberOrNull(result.latitude) || 0,
      longitude: toNumberOrNull(result.longitude) || 0,
      rankAbsolute,
      rankGroup,
      matchedTitle,
      matchedDomain,
      matchedPlaceId,
      matchedAddress,
      matchedPhone,
      matchedRating,
      apiLogId: toNumberOrNull(result.apiLogId),
    };
  });

  const rankedCoordinates = coordinateRows.filter(
    (coordinate) =>
      typeof coordinate.rankAbsolute === "number" &&
      Number.isFinite(coordinate.rankAbsolute),
  );
  const averageRank = rankedCoordinates.length
    ? Number(
        (
          rankedCoordinates.reduce((sum, row) => sum + Number(row.rankAbsolute), 0) /
          rankedCoordinates.length
        ).toFixed(2),
      )
    : null;
  const bestRank = rankedCoordinates.length
    ? Math.min(...rankedCoordinates.map((row) => Number(row.rankAbsolute)))
    : null;
  const worstRank = rankedCoordinates.length
    ? Math.max(...rankedCoordinates.map((row) => Number(row.rankAbsolute)))
    : null;
  const competitors = Array.from(competitorMap.entries())
    .map(([key, item]) => ({
      key,
      businessName: item.businessName,
      address: item.address,
      domain: item.domain,
      primaryCategory: null,
      secondaryCategory: null,
      photos: null,
      bestRank: item.bestRank,
      averageRank:
        item.rankCount > 0
          ? Number((item.rankTotal / item.rankCount).toFixed(2))
          : null,
      rating: item.rating,
      reviewsCount: item.reviewsCount,
    }))
    .sort((a, b) => {
      const rankA = a.averageRank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.averageRank ?? Number.MAX_SAFE_INTEGER;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return a.businessName.localeCompare(b.businessName);
    });

  return {
    averageRank,
    bestRank,
    clientAddress: null,
    clientId: null,
    clientName: "Quick Scan",
    competitors,
    coordinates: coordinateRows,
    dateOfScan: runMeta.finishedAt || runMeta.startedAt || null,
    foundCoordinates: rankedCoordinates.length,
    frequency: null,
    keyword,
    latestScan: averageRank,
    matchedDomain:
      rankedCoordinates.find((row) => row.matchedDomain)?.matchedDomain || null,
    matchedPhone:
      rankedCoordinates.find((row) => row.matchedPhone)?.matchedPhone || null,
    matchedPlaceId:
      rankedCoordinates.find((row) => row.matchedPlaceId)?.matchedPlaceId || null,
    matchedRating:
      rankedCoordinates.find((row) => row.matchedRating)?.matchedRating || null,
    matchedTitle:
      rankedCoordinates.find((row) => row.matchedTitle)?.matchedTitle || null,
    missingCoordinates: coordinateRows.length - rankedCoordinates.length,
    previousScan: null,
    runId: run.id ?? 0,
    runStatus: run.status ?? null,
    scanId: run.scanId ?? 0,
    scanStatus: null,
    totalCoordinates: coordinateRows.length,
    totalScans: 1,
    worstRank,
  };
};

const MiniMapPanel = ({
  averageRank,
  center,
  label,
  isPanelVisible,
  onRunChange,
  onSeeCompetitor,
  points = [],
  runOptions,
  selectedRunId,
  slotLabel,
  subtitle,
  title,
}: MiniMapPanelProps) => {
  const ringStyle = useMemo(() => {
    const totals = points.reduce(
      (accumulator, point) => {
        const rank = point.rank;

        if (typeof rank !== "number" || !Number.isFinite(rank)) {
          accumulator.low += 1;

          return accumulator;
        }

        if (rank === 1) {
          accumulator.high += 1;
        } else if (rank <= 9) {
          accumulator.medium += 1;
        } else {
          accumulator.low += 1;
        }

        return accumulator;
      },
      { high: 0, low: 0, medium: 0 },
    );
    const totalPoints = totals.high + totals.medium + totals.low;

    if (!totalPoints) {
      return {
        background: "conic-gradient(#e5e7eb 0 100%)",
      };
    }

    const lowPercent = (totals.low / totalPoints) * 100;
    const mediumPercent = (totals.medium / totalPoints) * 100;
    const highPercent = (totals.high / totalPoints) * 100;
    const lowEnd = lowPercent;
    const mediumEnd = lowPercent + mediumPercent;
    const highEnd = mediumEnd + highPercent;

    return {
      background: `conic-gradient(#c84b4a 0 ${lowEnd}%, #f0bf4f ${lowEnd}% ${mediumEnd}%, #61c27f ${mediumEnd}% ${highEnd}%)`,
    };
  }, [points]);

  return (
    <div className="relative overflow-hidden">
      <ScanCoverageMiniMap center={center} label={label} points={points} />
      {isPanelVisible ? (
        <div className="pointer-events-auto absolute right-4 top-4 z-10 w-[320px] rounded-[24px] bg-white/96 p-4 shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
          <div className="mb-3 flex items-center gap-2">
            <Button
              className="h-9 rounded-lg border border-default-200 bg-white px-3 text-xs font-medium text-[#111827]"
              startContent={<Users size={14} />}
              variant="bordered"
              onPress={onSeeCompetitor}
            >
              See competitor
            </Button>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button
                  className="h-9 rounded-lg border border-default-200 bg-white px-3 text-xs font-medium text-[#111827]"
                  endContent={<ChevronDown size={14} />}
                  variant="bordered"
                >
                  {selectedRunId
                    ? runOptions.find((option) => option.value === selectedRunId)
                        ?.label || "Select Date"
                    : "Select Date"}
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label={`${slotLabel} run date`}
                disallowEmptySelection
                selectedKeys={selectedRunId ? [selectedRunId] : []}
                selectionMode="single"
                onAction={(key) => {
                  onRunChange(String(key));
                }}
              >
                {runOptions.map((option) => (
                  <DropdownItem key={option.value}>{option.label}</DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm">Avg. Rank</span>
              <p className="text-5xl font-semibold leading-none tracking-[-0.06em] text-[#111827]">
                {averageRank}
              </p>
            </div>

            <div className="relative h-20 w-20 rounded-full" style={ringStyle}>
              <div className="absolute inset-[22%] rounded-full bg-white" />
            </div>
          </div>
          <div className="mt-2 flex gap-4 text-sm text-default-500">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#61c27f]" />
              High
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f0bf4f]" />
              Medium
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c84b4a]" />
              Low
            </span>
          </div>
          <div className="mt-2">
            <p className="text-xs font-medium text-default-400">
              {title}
              {subtitle ? <span> {subtitle}</span> : null}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const QuickScanDetailsScreen = ({ scanId }: { scanId: string }) => {
  const { session } = useAuth();
  const router = useRouter();
  const [comparisonRuns, setComparisonRuns] = useState<LocalRankingKeyword[]>(
    [],
  );
  const [coverage, setCoverage] = useState<
    Array<{ latitude: number; longitude: number }>
  >([]);
  const [coverageUnit, setCoverageUnit] = useState<string | null>(null);
  const [keywordLabel, setKeywordLabel] = useState("");
  const [gbpCenter, setGbpCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [gbpLabel, setGbpLabel] = useState<string | null>(null);
  const [gridLayout, setGridLayout] = useState<1 | 2>(1);
  const [selectedRunIds, setSelectedRunIds] = useState<
    [string | null, string | null]
  >([null, null]);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [competitorModalRunId, setCompetitorModalRunId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const numericScanId = useMemo(() => {
    const parsed = Number(scanId);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [scanId]);

  useEffect(() => {
    const accessToken = session?.accessToken || getStoredAccessToken();

    if (!accessToken || !numericScanId) {
      setIsLoading(false);
      setComparisonRuns([]);
      setCoverage([]);
      setCoverageUnit(null);
      setKeywordLabel("");
      setGbpCenter(null);
      setGbpLabel(null);

      return;
    }

    let isMounted = true;

    const loadScreenData = async () => {
      try {
        const scan = await scansApi.getScanById(accessToken, numericScanId);

        if (!isMounted) {
          return;
        }

        setCoverage(scan.coverage || []);
        setCoverageUnit(scan.coverageUnit || null);
        setKeywordLabel(scan.keyword || "");

        const quickContext = (scan.quickScanContext ||
          null) as Record<string, unknown> | null;
        const latitude = quickContext?.latitude;
        const longitude = quickContext?.longitude;
        const businessName = quickContext?.businessName;

        if (typeof latitude === "number" && typeof longitude === "number") {
          setGbpCenter({
            latitude,
            longitude,
          });
        } else {
          setGbpCenter(null);
        }

        setGbpLabel(
          typeof businessName === "string" && businessName.trim()
            ? businessName
            : "Quick Scan GBP",
        );

        const runsResponse = await scansApi.listScanRuns(
          accessToken,
          numericScanId,
          {
            limit: 10,
            page: 1,
          },
        );
        const runIds = (runsResponse.runs || [])
          .map((run) => run.id)
          .filter((id): id is number => typeof id === "number" && id > 0);
        const uniqueRunIds = Array.from(new Set(runIds));

        if (!uniqueRunIds.length) {
          setComparisonRuns([]);
          setSelectedRunIds([null, null]);
          return;
        }

        const runDetails = await Promise.all(
          uniqueRunIds.map((runId) =>
            scansApi.getScanRunById(accessToken, numericScanId, runId),
          ),
        );

        if (!isMounted) {
          return;
        }

        const sortedRuns = [...runDetails].sort((first, second) => {
          const firstMeta = first as unknown as {
            finishedAt?: string | null;
            startedAt?: string | null;
          };
          const secondMeta = second as unknown as {
            finishedAt?: string | null;
            startedAt?: string | null;
          };
          const firstTimestamp = new Date(
            firstMeta.finishedAt || firstMeta.startedAt || 0,
          ).getTime();
          const secondTimestamp = new Date(
            secondMeta.finishedAt || secondMeta.startedAt || 0,
          ).getTime();

          return secondTimestamp - firstTimestamp;
        });
        const mappedRuns = sortedRuns.map((run) =>
          buildQuickKeywordFromRun({
            keyword: scan.keyword || "",
            run,
          }),
        );

        setComparisonRuns(mappedRuns);
        setSelectedRunIds([
          mappedRuns[0] ? String(mappedRuns[0].runId) : null,
          mappedRuns[1] ? String(mappedRuns[1].runId) : null,
        ]);
      } catch {
        if (!isMounted) {
          return;
        }

        setComparisonRuns([]);
        setCoverage([]);
        setCoverageUnit(null);
        setKeywordLabel("");
        setGbpCenter(null);
        setGbpLabel(null);
        setSelectedRunIds([null, null]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadScreenData();

    return () => {
      isMounted = false;
    };
  }, [numericScanId, session?.accessToken]);

  const mapPanels = useMemo(() => {
    if (!comparisonRuns.length) {
      return [] as Array<{
        slotIndex: 0 | 1;
        selectedRunId: string;
        slotLabel: string;
        averageRank: string;
        center: { latitude: number; longitude: number } | null;
        label: string | null;
        points: Array<{
          label: string;
          latitude: number;
          longitude: number;
          rank?: number | null;
        }>;
        subtitle: string | null;
        title: string;
        runId: number;
      }>;
    }

    const runsById = new Map(
      comparisonRuns.map((run) => [String(run.runId), run] as const),
    );
    const panels: Array<{
      slotIndex: 0 | 1;
      selectedRunId: string;
      slotLabel: string;
      averageRank: string;
      center: { latitude: number; longitude: number } | null;
      label: string | null;
      points: Array<{
        label: string;
        latitude: number;
        longitude: number;
        rank?: number | null;
      }>;
      subtitle: string | null;
      title: string;
      runId: number;
    }> = [];

    selectedRunIds.forEach((runId, index) => {
      if (!runId) {
        return;
      }

      const run = runsById.get(runId);

      if (!run) {
        return;
      }

      const slotIndex = index === 0 ? 0 : 1;
      panels.push({
        slotIndex,
        selectedRunId: runId,
        slotLabel: slotIndex === 0 ? "Map 1" : "Map 2",
        averageRank: formatAverageRank(run.averageRank, "X"),
        center: gbpCenter,
        label: gbpLabel,
        points: (run.coordinates || []).map((coordinate, coordinateIndex) => ({
          label: coordinate.coordinateLabel || `Coordinate ${coordinateIndex + 1}`,
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          rank: coordinate.rankAbsolute,
        })),
        subtitle: formatRunSubtitle(run.dateOfScan) || `Run #${run.runId || "-"}`,
        title: formatRunTitle(run.dateOfScan || null),
        runId: run.runId,
      });
    });

    return panels;
  }, [comparisonRuns, gbpCenter, gbpLabel, selectedRunIds]);
  const runDateOptions = useMemo(
    () =>
      comparisonRuns.map((run) => ({
        label:
          formatRunDateTimeLabel(run.dateOfScan || null) || `Run #${run.runId}`,
        value: String(run.runId),
      })),
    [comparisonRuns],
  );
  const gridSizeLabel = useMemo(
    () => formatGridSizeLabel(coverage),
    [coverage],
  );
  const areaLabel = useMemo(
    () => formatAreaLabel(coverage, coverageUnit),
    [coverage, coverageUnit],
  );
  const competitorRows = useMemo<CompetitorRow[]>(() => {
    const latestRun = comparisonRuns[0];
    const previousRun = comparisonRuns[1];

    if (!latestRun) {
      return [];
    }

    const latestCompetitors = latestRun.competitors || [];
    const previousByKey = new Map(
      (previousRun?.competitors || []).map((competitor) => [
        competitor.key,
        competitor,
      ]),
    );

    return latestCompetitors.map((competitor) => {
      const previousCompetitor = previousByKey.get(competitor.key);
      const latestRank = competitor.averageRank ?? null;
      const previousRank = previousCompetitor?.averageRank ?? null;
      const delta =
        latestRank !== null && previousRank !== null
          ? Number((previousRank - latestRank).toFixed(2))
          : null;
      const ratingText =
        competitor.rating === null || competitor.rating === undefined
          ? "-"
          : competitor.rating.toFixed(1);
      const reviewsCountText =
        competitor.reviewsCount === null ||
        competitor.reviewsCount === undefined
          ? "- Reviews"
          : `${competitor.reviewsCount} Reviews`;

      return {
        businessName: competitor.businessName || "-",
        delta,
        domain: competitor.domain || "-",
        gridSize: `${gridSizeLabel.replace("Grid Size ", "")} | ${areaLabel.replace("Area ", "")}`,
        latestRank: formatCompetitorMetric(latestRank),
        previousRank: formatCompetitorMetric(previousRank),
        reviews: `${ratingText} | ${reviewsCountText}`,
      };
    });
  }, [areaLabel, comparisonRuns, gridSizeLabel]);
  const latestRankHeader = useMemo(
    () => formatRankHeader(comparisonRuns[0]?.dateOfScan),
    [comparisonRuns],
  );
  const previousRankHeader = useMemo(
    () => formatRankHeader(comparisonRuns[1]?.dateOfScan),
    [comparisonRuns],
  );
  const selectedCompetitorRun = useMemo(
    () =>
      comparisonRuns.find(
        (run) => String(run.runId) === String(competitorModalRunId),
      ) || null,
    [competitorModalRunId, comparisonRuns],
  );
  const selectedCompetitorRows = useMemo(() => {
    if (!selectedCompetitorRun) {
      return [];
    }

    return (selectedCompetitorRun.competitors || []).map((competitor) => {
      const ratingText =
        competitor.rating === null || competitor.rating === undefined
          ? "-"
          : competitor.rating.toFixed(1);
      const reviewsCountText =
        competitor.reviewsCount === null ||
        competitor.reviewsCount === undefined
          ? "- Reviews"
          : `${competitor.reviewsCount} Reviews`;

      return {
        businessName: competitor.businessName || "-",
        domain: competitor.domain || "-",
        rank: formatCompetitorMetric(competitor.averageRank),
        reviews: `${ratingText} | ${reviewsCountText}`,
      };
    });
  }, [selectedCompetitorRun]);
  const exportPdf = useCallback(async () => {
    if (!numericScanId) {
      return;
    }

    try {
      setIsExportingPdf(true);
      const params = new URLSearchParams();
      const leftRunId = selectedRunIds[0];
      const rightRunId = selectedRunIds[1];

      if (leftRunId) {
        params.set("leftRunId", leftRunId);
      }

      if (rightRunId) {
        params.set("rightRunId", rightRunId);
      }

      const exportUrl = `/print/scan-report/${encodeURIComponent(String(numericScanId))}${params.toString() ? `?${params.toString()}` : ""}`;

      window.open(exportUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsExportingPdf(false);
    }
  }, [numericScanId, selectedRunIds]);

  return (
    <div className="space-y-5">
      <div>
        <Button
          variant="bordered"
          onPress={() => {
            router.back();
          }}
        >
          Back
        </Button>
      </div>

      {isLoading ? (
        <Card className={panelClass} shadow="none">
          <CardBody className="flex min-h-72 items-center justify-center">
            <Spinner color="primary" label="Loading quick scan view..." />
          </CardBody>
        </Card>
      ) : (
        <>
          <Card className={panelClass} shadow="none">
            <CardBody className="flex flex-col gap-4 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="font-semibold tracking-[-0.03em] text-[#111827]">
                  Local Ranking
                </h2>
                <Chip className={toolbarChipClass}>{gridSizeLabel}</Chip>
                <Chip className={toolbarChipClass}>{areaLabel}</Chip>
                <Chip className={toolbarChipClass}>
                  Keyword {keywordLabel || "-"}
                </Chip>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <Button
                      className="h-10 rounded-xl border border-default-200 bg-white px-4 text-xs font-medium text-[#111827]"
                      endContent={<ChevronDown size={16} />}
                      startContent={<LayoutGrid size={16} />}
                      variant="bordered"
                    >
                      Choose Grid Layout: {gridLayout}
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    disallowEmptySelection
                    aria-label="Choose grid layout"
                    selectedKeys={[String(gridLayout)]}
                    selectionMode="single"
                    onAction={(key) => {
                      const layout = Number(key);

                      if (layout === 1 || layout === 2) {
                        setGridLayout(layout);
                      }
                    }}
                  >
                    <DropdownItem key="1">1</DropdownItem>
                    <DropdownItem key="2">2</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
                <Button
                  className="h-10 rounded-xl bg-[#5446e8] px-4 text-xs font-semibold text-white"
                  isDisabled={isExportingPdf || isLoading}
                  isLoading={isExportingPdf}
                  onPress={exportPdf}
                >
                  Open Export Page
                </Button>
                <Button
                  className="h-10 rounded-xl border border-default-200 bg-white px-4 text-xs font-medium text-[#111827]"
                  variant="bordered"
                  onPress={() => {
                    setIsPanelVisible((previous) => !previous);
                  }}
                >
                  {isPanelVisible ? "Hide panel" : "Show panel"}
                </Button>
              </div>
            </CardBody>
          </Card>

          <div
            className={clsx("grid gap-5", {
              "grid-cols-1": gridLayout === 1,
              "grid-cols-1 lg:grid-cols-2": gridLayout === 2,
            })}
          >
            {mapPanels.map((panel, index) => (
              <MiniMapPanel
                key={`${panel.runId}-${panel.title}-${index}`}
                averageRank={panel.averageRank}
                center={panel.center}
                isPanelVisible={isPanelVisible}
                label={panel.label}
                onRunChange={(runId) => {
                  setSelectedRunIds((previous) => {
                    const next = [...previous] as [string | null, string | null];
                    next[panel.slotIndex as 0 | 1] = runId;

                    return next;
                  });
                }}
                onSeeCompetitor={() => {
                  setCompetitorModalRunId(panel.selectedRunId);
                }}
                points={panel.points}
                runOptions={runDateOptions}
                selectedRunId={panel.selectedRunId}
                slotLabel={panel.slotLabel}
                subtitle={panel.subtitle}
                title={panel.title}
              />
            ))}
          </div>

          <Card className={panelClass} shadow="none">
            <CardHeader className="flex items-center justify-between border-b border-default-200 px-4 py-4">
              <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#111827]">
                Competitor Analysis
              </h3>
            </CardHeader>
            <CardBody className="overflow-x-auto p-0">
              <table className="min-w-[980px] table-auto">
                <thead>
                  <tr className="border-b border-default-200 bg-[#fbfcfe] text-left text-sm font-medium text-default-500">
                    <th className="px-4 py-3">Business Name</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">{previousRankHeader}</th>
                    <th className="px-4 py-3">{latestRankHeader}</th>
                    <th className="px-4 py-3" />
                    <th className="px-4 py-3">Grid Size</th>
                    <th className="px-4 py-3">Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {competitorRows.map((row, index) => (
                    <tr
                      key={`${row.businessName}-${index}`}
                      className="border-b border-default-200 text-sm text-[#111827] last:border-b-0"
                    >
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium">{row.businessName}</p>
                      </td>
                      <td className="px-4 py-4 align-top">{row.domain}</td>
                      <td className="px-4 py-4 align-top">
                        {row.previousRank}
                      </td>
                      <td className="px-4 py-4 align-top">{row.latestRank}</td>
                      <td className="px-4 py-4 align-top">
                        {row.delta !== null ? (
                          <Chip className="h-6 rounded-full bg-[#ecfdf3] px-2 text-xs font-semibold text-[#10b981]">
                            {row.delta > 0
                              ? `↗ +${row.delta}`
                              : `↘ ${row.delta}`}
                          </Chip>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top">
                        {row.gridSize}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <Star
                            className="fill-[#f59e0b] text-[#f59e0b]"
                            size={16}
                          />
                          <span>{row.reviews}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!competitorRows.length ? (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-sm text-default-500"
                        colSpan={7}
                      >
                        No competitor GBP data found for the latest quick scan.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </CardBody>
          </Card>
          <Modal
            hideCloseButton={false}
            isOpen={Boolean(competitorModalRunId)}
            placement="center"
            size="5xl"
            scrollBehavior="inside"
            onClose={() => {
              setCompetitorModalRunId(null);
            }}
          >
            <ModalContent>
              <ModalHeader className="border-b border-default-200">
                Competitors -{" "}
                {selectedCompetitorRun
                  ? formatRunDateTimeLabel(
                      selectedCompetitorRun.dateOfScan || null,
                    )
                  : "Selected Run"}
              </ModalHeader>
              <ModalBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-[780px] table-auto">
                    <thead>
                      <tr className="border-b border-default-200 bg-[#fbfcfe] text-left text-sm font-medium text-default-500">
                        <th className="px-4 py-3">Business Name</th>
                        <th className="px-4 py-3">Domain</th>
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Grid Size</th>
                        <th className="px-4 py-3">Reviews</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCompetitorRows.map((row, rowIndex) => (
                        <tr
                          key={`${row.businessName}-${rowIndex}`}
                          className="border-b border-default-200 text-sm text-[#111827] last:border-b-0"
                        >
                          <td className="px-4 py-4">{row.businessName}</td>
                          <td className="px-4 py-4">{row.domain}</td>
                          <td className="px-4 py-4">{row.rank}</td>
                          <td className="px-4 py-4">{`${gridSizeLabel.replace("Grid Size ", "")} | ${areaLabel.replace("Area ", "")}`}</td>
                          <td className="px-4 py-4">{row.reviews}</td>
                        </tr>
                      ))}
                      {!selectedCompetitorRows.length ? (
                        <tr>
                          <td
                            className="px-4 py-8 text-center text-sm text-default-500"
                            colSpan={5}
                          >
                            No competitor data available for this scan date.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </ModalBody>
            </ModalContent>
          </Modal>
        </>
      )}
    </div>
  );
};
