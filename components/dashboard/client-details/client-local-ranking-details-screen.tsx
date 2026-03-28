"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Spinner } from "@heroui/spinner";
import clsx from "clsx";
import {
  ChevronDown,
  Download,
  LayoutGrid,
  Maximize2,
  Star,
} from "lucide-react";

import { clientsApi } from "@/apis/clients";
import { scansApi, type ScanComparisonRun } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import { ScanCoverageMiniMap } from "@/components/dashboard/client-details/scan-coverage-mini-map";

interface ClientLocalRankingDetailsScreenProps {
  clientId: string;
  rankingId: string;
}

type CompetitorRow = {
  appearances: string;
  businessName: string;
  bestRank: string;
  previousAverageRank: string;
  rating: string;
  reviewScore: string;
  subtitle: string;
  website: string;
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
  subtitle?: string | null;
  title: string;
};

const toolbarChipClass =
  "h-10 rounded-lg border border-default-200 bg-white text-sm text-default-600 shadow-none";
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

const formatAverageRank = (value?: number | null, fallback = "10.62") =>
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

const formatCompetitorRank = (value?: number | null) =>
  value === null || value === undefined ? "-" : String(value);

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

const scoreRing = {
  background:
    "conic-gradient(#c84b4a 0 36%, #f0bf4f 36% 82%, #61c27f 82% 100%)",
};

const MiniMapPanel = ({
  averageRank,
  center,
  label,
  points = [],
  subtitle,
  title,
}: MiniMapPanelProps) => {
  return (
    <div className="relative overflow-hidden">
      <ScanCoverageMiniMap center={center} label={label} points={points} />
      <div className="pointer-events-none absolute right-4 top-4 z-20 w-[212px] rounded-[24px] bg-white/96 p-5 shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
        <p className="text-sm font-medium text-default-500">{title}</p>
        {subtitle ? (
          <p className="mt-1 text-xs text-default-400">{subtitle}</p>
        ) : null}
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="text-[3rem] font-semibold leading-none tracking-[-0.06em] text-[#111827]">
            {averageRank}
          </p>
          <div className="relative h-20 w-20 rounded-full" style={scoreRing}>
            <div className="absolute inset-[22%] rounded-full bg-white" />
          </div>
        </div>
        <div className="mt-5 flex gap-4 text-sm text-default-500">
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
      </div>
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
  const [totalRuns, setTotalRuns] = useState(0);
  const [gbpCenter, setGbpCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [gbpLabel, setGbpLabel] = useState<string | null>(null);
  const [gridLayout, setGridLayout] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(true);
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
      setTotalRuns(0);

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
        setCoverage(comparisonResponse.scan.coverage || []);
        setCoverageUnit(comparisonResponse.scan.coverageUnit || null);
        setKeywordLabel(comparisonResponse.comparison.keyword || "");
        setTotalRuns(comparisonResponse.comparison.totalRuns || 0);
      } catch {
        if (!isMounted) {
          return;
        }

        setComparisonRuns([]);
        setCoverage([]);
        setCoverageUnit(null);
        setKeywordLabel("");
        setTotalRuns(0);
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

  const mapPanels = comparisonRuns.map((run) => ({
    averageRank: formatAverageRank(run.averageRank, "10.62"),
    center: gbpCenter,
    label: gbpLabel,
    points: run.coordinates.map((coordinate, coordinateIndex) => ({
      label: coordinate.coordinateLabel || `Coordinate ${coordinateIndex + 1}`,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      rank: coordinate.rankAbsolute,
    })),
    subtitle:
      formatRunSubtitle(run.finishedAt || run.startedAt) || `Run #${run.runId}`,
    title: formatRunTitle(run.finishedAt || run.startedAt || null),
    runId: run.runId,
  }));
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

    const latestEntries = new Map<
      string,
      {
        address: string;
        appearances: number;
        bestRank: number | null;
        businessName: string;
        rankTotal: number;
        rankedCount: number;
        rating: number | null;
        website: string;
      }
    >();
    const previousAverageByKey = new Map<string, number | null>();

    for (const coordinate of latestRun.coordinates) {
      const businessName = coordinate.matchedTitle?.trim();

      if (!businessName) {
        continue;
      }

      const key =
        coordinate.matchedPlaceId?.trim() ||
        coordinate.matchedDomain?.trim() ||
        businessName;
      const existing = latestEntries.get(key) ?? {
        address: coordinate.matchedAddress?.trim() || "-",
        appearances: 0,
        bestRank: null,
        businessName,
        rankTotal: 0,
        rankedCount: 0,
        rating: coordinate.matchedRating ?? null,
        website: coordinate.matchedDomain?.trim() || "-",
      };

      existing.appearances += 1;
      existing.address =
        existing.address === "-" && coordinate.matchedAddress?.trim()
          ? coordinate.matchedAddress.trim()
          : existing.address;
      existing.website =
        existing.website === "-" && coordinate.matchedDomain?.trim()
          ? coordinate.matchedDomain.trim()
          : existing.website;
      existing.rating = existing.rating ?? coordinate.matchedRating ?? null;

      if (
        coordinate.rankAbsolute !== null &&
        coordinate.rankAbsolute !== undefined
      ) {
        existing.bestRank =
          existing.bestRank === null
            ? coordinate.rankAbsolute
            : Math.min(existing.bestRank, coordinate.rankAbsolute);
        existing.rankTotal += coordinate.rankAbsolute;
        existing.rankedCount += 1;
      }

      latestEntries.set(key, existing);
    }

    if (previousRun) {
      const previousEntries = new Map<
        string,
        {
          rankTotal: number;
          rankedCount: number;
        }
      >();

      for (const coordinate of previousRun.coordinates) {
        const businessName = coordinate.matchedTitle?.trim();

        if (
          !businessName ||
          coordinate.rankAbsolute === null ||
          coordinate.rankAbsolute === undefined
        ) {
          continue;
        }

        const key =
          coordinate.matchedPlaceId?.trim() ||
          coordinate.matchedDomain?.trim() ||
          businessName;
        const existing = previousEntries.get(key) ?? {
          rankTotal: 0,
          rankedCount: 0,
        };

        existing.rankTotal += coordinate.rankAbsolute;
        existing.rankedCount += 1;
        previousEntries.set(key, existing);
      }

      for (const [key, value] of Array.from(previousEntries.entries())) {
        previousAverageByKey.set(
          key,
          value.rankedCount
            ? Number((value.rankTotal / value.rankedCount).toFixed(2))
            : null,
        );
      }
    }

    return Array.from(latestEntries.entries())
      .map(([key, entry]) => {
        const averageRank = entry.rankedCount
          ? Number((entry.rankTotal / entry.rankedCount).toFixed(2))
          : null;

        return {
          appearances: String(entry.appearances),
          bestRank: formatCompetitorRank(entry.bestRank),
          businessName: entry.businessName,
          previousAverageRank: formatCompetitorMetric(
            previousAverageByKey.get(key) ?? null,
          ),
          rating:
            entry.rating === null || entry.rating === undefined
              ? "-"
              : entry.rating.toFixed(1),
          reviewScore: formatCompetitorMetric(averageRank),
          subtitle: entry.address,
          website: entry.website,
        };
      })
      .sort((left, right) => {
        const leftAppearances = Number(left.appearances);
        const rightAppearances = Number(right.appearances);

        if (rightAppearances !== leftAppearances) {
          return rightAppearances - leftAppearances;
        }

        const leftAverage =
          left.reviewScore === "-"
            ? Number.POSITIVE_INFINITY
            : Number(left.reviewScore);
        const rightAverage =
          right.reviewScore === "-"
            ? Number.POSITIVE_INFINITY
            : Number(right.reviewScore);

        return leftAverage - rightAverage;
      })
      .slice(0, 10);
  }, [comparisonRuns]);

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
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-semibold tracking-[-0.03em] text-[#111827]">
                  Local Ranking
                </h2>
                <Chip className={toolbarChipClass}>{gridSizeLabel}</Chip>
                <Chip className={toolbarChipClass}>{areaLabel}</Chip>
                <Chip className={toolbarChipClass}>
                  Keyword {keywordLabel || "-"}
                </Chip>
                <Chip className={toolbarChipClass}>Runs {totalRuns}</Chip>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <Button
                      className="h-10 rounded-xl border border-default-200 bg-white px-4 text-sm font-medium text-[#111827]"
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

                      if (layout === 1 || layout === 2 || layout === 3) {
                        setGridLayout(layout);
                      }
                    }}
                  >
                    <DropdownItem key="1">1</DropdownItem>
                    <DropdownItem key="2">2</DropdownItem>
                    <DropdownItem key="3">3</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
                <Button
                  className="h-10 rounded-xl bg-[#5446e8] px-4 text-sm font-semibold text-white"
                  startContent={<Download size={16} />}
                >
                  Export PDF
                </Button>
              </div>
            </CardBody>
          </Card>

          <div
            className={clsx("grid gap-5", {
              "grid-cols-1": gridLayout === 1,
              "grid-cols-1 lg:grid-cols-2": gridLayout === 2,
              "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3": gridLayout === 3,
            })}
          >
            {mapPanels.map((panel, index) => (
              <MiniMapPanel
                key={`${panel.runId}-${panel.title}-${index}`}
                averageRank={panel.averageRank}
                center={panel.center}
                label={panel.label}
                points={panel.points}
                subtitle={panel.subtitle}
                title={panel.title}
              />
            ))}
          </div>

          <Card className={panelClass} shadow="none">
            <CardHeader className="flex items-center justify-between border-b border-default-200 px-4 py-4">
              <h3 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-[#111827]">
                Competitor Analysis
              </h3>
              <Button isIconOnly radius="full" size="sm" variant="light">
                <Maximize2 size={16} />
              </Button>
            </CardHeader>
            <CardBody className="overflow-x-auto p-0">
              <table className="min-w-[980px] table-auto">
                <thead>
                  <tr className="border-b border-default-200 bg-[#fbfcfe] text-left text-sm font-medium text-default-500">
                    <th className="px-4 py-3">Business Name</th>
                    <th className="px-4 py-3">Best Rank</th>
                    <th className="px-4 py-3">Avg. Rank</th>
                    <th className="px-4 py-3">Previous Avg. Rank</th>
                    <th className="px-4 py-3">Appearances</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Website</th>
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
                        <p className="mt-1 text-sm text-default-400">
                          {row.subtitle}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">{row.bestRank}</td>
                      <td className="px-4 py-4 align-top">{row.reviewScore}</td>
                      <td className="px-4 py-4 align-top">
                        {row.previousAverageRank}
                      </td>
                      <td className="px-4 py-4 align-top">{row.appearances}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <Star
                            className="fill-[#f59e0b] text-[#f59e0b]"
                            size={16}
                          />
                          <span>{row.rating}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">{row.website}</td>
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
        </>
      )}
    </div>
  );
};
