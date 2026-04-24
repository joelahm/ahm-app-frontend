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

import { clientsApi } from "@/apis/clients";
import { scansApi, type ScanComparisonRun } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import { ScanCoverageMiniMap } from "@/components/dashboard/client-details/scan-coverage-mini-map";

interface ClientLocalRankingDetailsScreenProps {
  clientId: string;
  rankingId: string;
}

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

const MiniMapPanel = ({
  averageRank,
  center,
  isPanelVisible,
  label,
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

export const ClientLocalRankingDetailsScreen = ({
  clientId,
  rankingId,
}: ClientLocalRankingDetailsScreenProps) => {
  const { session } = useAuth();
  const [comparisonRuns, setComparisonRuns] = useState<ScanComparisonRun[]>([]);
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
  const [panelRunSelections, setPanelRunSelections] = useState<string[]>([]);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [competitorModalRunId, setCompetitorModalRunId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const scanId = useMemo(() => {
    const parsed = Number(rankingId);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [rankingId]);

  useEffect(() => {
    const accessToken = session?.accessToken || getStoredAccessToken();

    if (!accessToken || !scanId) {
      setIsLoading(false);
      setComparisonRuns([]);
      setCoverage([]);
      setCoverageUnit(null);
      setKeywordLabel("");

      return;
    }

    let isMounted = true;

    const loadScreenData = async () => {
      try {
        const [client, gbpDetailsResult, comparisonResponse] =
          await Promise.all([
            clientsApi.getClientById(accessToken, clientId),
            clientsApi
              .getClientGbpDetails(accessToken, clientId)
              .then((data) => ({ ok: true as const, data }))
              .catch(() => ({ ok: false as const, data: null })),
            scansApi.getClientScanComparison(accessToken, clientId, scanId, 12),
          ]);

        if (!isMounted) {
          return;
        }

        if (
          gbpDetailsResult.ok &&
          gbpDetailsResult.data.latitude !== null &&
          gbpDetailsResult.data.latitude !== undefined &&
          gbpDetailsResult.data.longitude !== null &&
          gbpDetailsResult.data.longitude !== undefined
        ) {
          setGbpCenter({
            latitude: gbpDetailsResult.data.latitude,
            longitude: gbpDetailsResult.data.longitude,
          });
          setGbpLabel(
            gbpDetailsResult.data.businessName ??
              gbpDetailsResult.data.businessLocation ??
              client.clientName ??
              client.businessName ??
              null,
          );
        } else {
          setGbpCenter(null);
          setGbpLabel(null);
        }

        setComparisonRuns(comparisonResponse.comparison.runs);
        const defaultSelections = (comparisonResponse.comparison.runs || [])
          .slice(0, 2)
          .map((run) => String(run.runId));
        setPanelRunSelections(defaultSelections);
        setCoverage(comparisonResponse.scan.coverage || []);
        setCoverageUnit(comparisonResponse.scan.coverageUnit || null);
        setKeywordLabel(comparisonResponse.comparison.keyword || "");
      } catch {
        if (!isMounted) {
          return;
        }

        setComparisonRuns([]);
        setPanelRunSelections([]);
        setCoverage([]);
        setCoverageUnit(null);
        setKeywordLabel("");
        setGbpCenter(null);
        setGbpLabel(null);
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
  }, [clientId, scanId, session?.accessToken]);

  const mapPanels = useMemo(() => {
    if (!comparisonRuns.length) {
      return [];
    }

    const runsById = new Map(
      comparisonRuns.map((run) => [String(run.runId), run] as const),
    );

    return comparisonRuns.slice(0, 2).map((fallbackRun, index) => {
      const selectedRunId = panelRunSelections[index] || String(fallbackRun.runId);
      const selectedRun = runsById.get(selectedRunId) || fallbackRun;

      return {
        averageRank: formatAverageRank(selectedRun.averageRank, "X"),
        center: gbpCenter,
        label: gbpLabel,
        points: selectedRun.coordinates.map((coordinate, coordinateIndex) => ({
          label: coordinate.coordinateLabel || `Coordinate ${coordinateIndex + 1}`,
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          rank: coordinate.rankAbsolute,
        })),
        selectedRunId,
        slotIndex: index,
        slotLabel: `Map ${index + 1}`,
        subtitle:
          formatRunSubtitle(selectedRun.finishedAt || selectedRun.startedAt) ||
          `Run #${selectedRun.runId}`,
        title: formatRunTitle(selectedRun.finishedAt || selectedRun.startedAt || null),
        runId: selectedRun.runId,
      };
    });
  }, [comparisonRuns, gbpCenter, gbpLabel, panelRunSelections]);
  const runDateOptions = useMemo(
    () =>
      comparisonRuns.map((run) => ({
        label: formatRunDateTimeLabel(run.finishedAt || run.startedAt || null),
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

    const clientFoundInLatestRun =
      latestRun.averageRank !== null &&
      latestRun.averageRank !== undefined &&
      Number.isFinite(Number(latestRun.averageRank));

    if (!clientFoundInLatestRun) {
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
    () =>
      formatRankHeader(
        comparisonRuns[0]?.finishedAt || comparisonRuns[0]?.startedAt,
      ),
    [comparisonRuns],
  );
  const previousRankHeader = useMemo(
    () =>
      formatRankHeader(
        comparisonRuns[1]?.finishedAt || comparisonRuns[1]?.startedAt,
      ),
    [comparisonRuns],
  );
  const selectedCompetitorRun = useMemo(
    () =>
      comparisonRuns.find(
        (run) => String(run.runId) === String(competitorModalRunId),
      ) || null,
    [comparisonRuns, competitorModalRunId],
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
    if (!scanId) {
      return;
    }

    try {
      setIsExportingPdf(true);
      const params = new URLSearchParams();
      const leftRunId = panelRunSelections[0];
      const rightRunId = panelRunSelections[1];

      if (leftRunId) {
        params.set("leftRunId", leftRunId);
      }

      if (rightRunId) {
        params.set("rightRunId", rightRunId);
      }

      const exportUrl = `/print/scan-report/${encodeURIComponent(String(scanId))}${params.toString() ? `?${params.toString()}` : ""}`;

      window.open(exportUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsExportingPdf(false);
    }
  }, [panelRunSelections, scanId]);

  return (
    <div className="space-y-5">
      {isLoading ? (
        <Card className={panelClass} shadow="none">
          <CardBody className="flex min-h-72 items-center justify-center">
            <Spinner color="primary" label="Loading local ranking view..." />
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
                  setPanelRunSelections((previous) => {
                    const next = [...previous];
                    next[panel.slotIndex] = runId;

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
                        No competitor GBP data found for the latest scan.
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
                      selectedCompetitorRun.finishedAt ||
                        selectedCompetitorRun.startedAt ||
                        null,
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
