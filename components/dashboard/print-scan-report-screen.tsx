"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";

import {
  scansApi,
  type LocalRankingKeyword,
  type ScanRecord,
} from "@/apis/scans";
import { clientsApi } from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { ScanCoverageMiniMap } from "@/components/dashboard/client-details/scan-coverage-mini-map";

type CompetitorTableRow = {
  businessName: string;
  changeText: string;
  domain: string;
  latestRank: string;
  photos: string;
  previousRank: string;
  primaryCategory: string;
  reviews: string;
  secondaryCategory: string;
};

const toolbarChipClass =
  "h-8 rounded-md border border-default-200 bg-white px-2 text-[11px] text-default-600 shadow-none";
const panelClass = "border border-default-200 bg-white shadow-none";

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

  return `Area: ${areaValue.toFixed(2)} ${areaUnit}`;
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

const formatAverageRank = (value?: number | null) =>
  value === null || value === undefined ? "X" : value.toFixed(2);

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
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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
}): LocalRankingKeyword & {
  finishedAt?: string | null;
  startedAt?: string | null;
} => {
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
      coordinateLabel:
        toStringOrNull(result.coordinateLabel) || `Point ${index + 1}`,
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
          rankedCoordinates.reduce(
            (sum, row) => sum + Number(row.rankAbsolute),
            0,
          ) / rankedCoordinates.length
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
    .sort((first, second) => {
      const rankA = first.averageRank ?? Number.MAX_SAFE_INTEGER;
      const rankB = second.averageRank ?? Number.MAX_SAFE_INTEGER;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return first.businessName.localeCompare(second.businessName);
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
      rankedCoordinates.find((row) => row.matchedPlaceId)?.matchedPlaceId ||
      null,
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
    finishedAt: runMeta.finishedAt || null,
    startedAt: runMeta.startedAt || null,
  };
};

type ReportRun = LocalRankingKeyword & {
  finishedAt?: string | null;
  startedAt?: string | null;
};

export const PrintScanReportScreen = ({ scanId }: { scanId: string }) => {
  const { getValidAccessToken, session } = useAuth();
  const searchParams = useSearchParams();
  const numericScanId = useMemo(() => {
    const parsed = Number(scanId);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [scanId]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [keywordLabel, setKeywordLabel] = useState("");
  const [coverage, setCoverage] = useState<
    Array<{ latitude: number; longitude: number }>
  >([]);
  const [coverageUnit, setCoverageUnit] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [gbpCenter, setGbpCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [gbpLabel, setGbpLabel] = useState<string | null>(null);
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const selectedRunIds = useMemo(
    () =>
      [searchParams.get("leftRunId"), searchParams.get("rightRunId")] as [
        string | null,
        string | null,
      ],
    [searchParams],
  );

  useEffect(() => {
    if (!session?.accessToken || !numericScanId) {
      setIsLoading(false);
      setErrorMessage("Invalid scan ID or missing session.");

      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const scan = await scansApi.getScanById(accessToken, numericScanId);

        if (!isMounted) {
          return;
        }

        setKeywordLabel(scan.keyword || "");
        setCoverage(scan.coverage || []);
        setCoverageUnit(scan.coverageUnit || null);

        const quickContext = (scan.quickScanContext || null) as Record<
          string,
          unknown
        > | null;

        if (scan.clientId) {
          const [client, gbpDetailsResult, comparisonResponse] =
            await Promise.all([
              clientsApi.getClientById(accessToken, scan.clientId),
              clientsApi
                .getClientGbpDetails(accessToken, scan.clientId)
                .then((data) => ({ ok: true as const, data }))
                .catch(() => ({ ok: false as const, data: null })),
              scansApi.getClientScanComparison(
                accessToken,
                scan.clientId,
                numericScanId,
                12,
              ),
            ]);

          if (!isMounted) {
            return;
          }

          setClientName(client.clientName || client.businessName || "Client");
          setClientAddress(
            (gbpDetailsResult.ok
              ? gbpDetailsResult.data.businessLocation
              : null) ||
              [
                client.addressLine1,
                client.addressLine2,
                client.cityState,
                client.postCode,
              ]
                .filter(Boolean)
                .join(", ") ||
              "",
          );

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
          } else if (
            typeof quickContext?.latitude === "number" &&
            typeof quickContext?.longitude === "number"
          ) {
            setGbpCenter({
              latitude: quickContext.latitude,
              longitude: quickContext.longitude,
            });
            setGbpLabel(
              typeof quickContext.businessName === "string"
                ? quickContext.businessName
                : null,
            );
          } else {
            setGbpCenter(null);
            setGbpLabel(null);
          }

          setRuns((comparisonResponse.comparison.runs || []) as ReportRun[]);

          return;
        }

        const runList = await scansApi.listScanRuns(
          accessToken,
          numericScanId,
          {
            limit: 12,
            page: 1,
          },
        );
        const runIds = (runList.runs || [])
          .map((run) => run.id)
          .filter((id): id is number => typeof id === "number" && id > 0);
        const runDetails = await Promise.all(
          Array.from(new Set(runIds)).map((runId) =>
            scansApi.getScanRunById(accessToken, numericScanId, runId),
          ),
        );
        const mappedRuns = runDetails
          .sort((first, second) => {
            const firstMeta = first as unknown as {
              finishedAt?: string | null;
              startedAt?: string | null;
            };
            const secondMeta = second as unknown as {
              finishedAt?: string | null;
              startedAt?: string | null;
            };
            const firstTime = new Date(
              firstMeta.finishedAt || firstMeta.startedAt || 0,
            ).getTime();
            const secondTime = new Date(
              secondMeta.finishedAt || secondMeta.startedAt || 0,
            ).getTime();

            return secondTime - firstTime;
          })
          .map((run) =>
            buildQuickKeywordFromRun({
              keyword: scan.keyword || "",
              run,
            }),
          );

        if (!isMounted) {
          return;
        }

        setClientName(
          typeof quickContext?.businessName === "string"
            ? quickContext.businessName
            : "Client",
        );
        setClientAddress(
          typeof quickContext?.address === "string" ? quickContext.address : "",
        );
        if (
          typeof quickContext?.latitude === "number" &&
          typeof quickContext?.longitude === "number"
        ) {
          setGbpCenter({
            latitude: quickContext.latitude,
            longitude: quickContext.longitude,
          });
        } else {
          setGbpCenter(null);
        }
        setGbpLabel(
          typeof quickContext?.businessName === "string"
            ? quickContext.businessName
            : null,
        );
        setRuns(mappedRuns);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load scan.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, numericScanId, session?.accessToken]);

  const mapPanels = useMemo(() => {
    const runsById = new Map(
      runs.map((run) => [String(run.runId), run] as const),
    );
    const fallbackRuns = runs.slice(0, 2);

    return fallbackRuns.map((fallbackRun, index) => {
      const selectedRunId = selectedRunIds[index];
      const selectedRun =
        selectedRunId && runsById.has(selectedRunId)
          ? runsById.get(selectedRunId) || fallbackRun
          : fallbackRun;

      return {
        averageRank: formatAverageRank(selectedRun.averageRank),
        points: (selectedRun.coordinates || []).map(
          (coordinate, coordinateIndex) => ({
            label:
              coordinate.coordinateLabel || `Coordinate ${coordinateIndex + 1}`,
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            rank: coordinate.rankAbsolute,
          }),
        ),
        runId: selectedRun.runId,
        title: formatRunTitle(
          selectedRun.finishedAt ||
            selectedRun.startedAt ||
            selectedRun.dateOfScan ||
            null,
        ),
      };
    });
  }, [runs, selectedRunIds]);
  const latestRun = runs[0] || null;
  const previousRun = runs[1] || null;
  const competitorRows = useMemo<CompetitorTableRow[]>(() => {
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
      const previous = previousByKey.get(competitor.key);
      const latestRank = competitor.averageRank ?? null;
      const prevRank = previous?.averageRank ?? null;
      const delta =
        latestRank !== null && prevRank !== null
          ? Number((prevRank - latestRank).toFixed(2))
          : null;

      return {
        businessName: competitor.businessName || "-",
        changeText:
          delta === null
            ? "-"
            : delta > 0
              ? `+${delta.toFixed(1)}`
              : delta.toFixed(1),
        domain: competitor.domain || "-",
        latestRank: latestRank === null ? "-" : latestRank.toFixed(1),
        photos:
          competitor.photos === null || competitor.photos === undefined
            ? "-"
            : String(competitor.photos),
        previousRank: prevRank === null ? "-" : prevRank.toFixed(1),
        primaryCategory: competitor.primaryCategory || "-",
        reviews:
          competitor.rating === null || competitor.rating === undefined
            ? "-"
            : `${competitor.rating.toFixed(1)} | ${
                competitor.reviewsCount === null ||
                competitor.reviewsCount === undefined
                  ? "-"
                  : competitor.reviewsCount
              } Review`,
        secondaryCategory: competitor.secondaryCategory || "-",
      };
    });
  }, [latestRun, previousRun]);
  const gridSizeLabel = useMemo(
    () => formatGridSizeLabel(coverage),
    [coverage],
  );
  const areaLabel = useMemo(
    () => formatAreaLabel(coverage, coverageUnit),
    [coverage, coverageUnit],
  );
  const latestRankHeader = useMemo(
    () => formatRankHeader(latestRun?.dateOfScan),
    [latestRun],
  );
  const previousRankHeader = useMemo(
    () => formatRankHeader(previousRun?.dateOfScan),
    [previousRun],
  );

  return (
    <main className="a4-report-wrap bg-default-50 py-8">
      <div className="a4-report-page space-y-3">
        {isLoading ? (
          <Card className={panelClass} shadow="none">
            <CardBody className="flex min-h-40 items-center justify-center">
              <Spinner color="primary" label="Loading report..." />
            </CardBody>
          </Card>
        ) : errorMessage ? (
          <Card className={panelClass} shadow="none">
            <CardBody className="text-sm text-danger">{errorMessage}</CardBody>
          </Card>
        ) : (
          <>
            <Card className={panelClass} shadow="none">
              <CardBody className="space-y-2 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip className={toolbarChipClass}>Local Ranking</Chip>
                    <Chip className={toolbarChipClass}>{gridSizeLabel}</Chip>
                    <Chip className={toolbarChipClass}>{areaLabel}</Chip>
                    <Chip className={toolbarChipClass}>
                      Keyword: {keywordLabel || "-"}
                    </Chip>
                  </div>
                  <Button
                    className="h-8 min-w-0 rounded-md bg-[#5446e8] px-3 text-xs font-semibold text-white"
                    startContent={<Printer size={12} />}
                    onPress={() => {
                      window.print();
                    }}
                  >
                    Print
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-default-500">
                  <h1 className="text-2xl font-semibold text-[#111827]">
                    {clientName || "Client"}
                  </h1>
                  <span>{clientAddress || "-"}</span>
                </div>
              </CardBody>
            </Card>

            {mapPanels.map((panel, index) => (
              <Card
                key={`${panel.runId}-${index}`}
                className={panelClass}
                shadow="none"
              >
                <CardBody className="p-0">
                  <div className="border-b border-default-200 px-3 py-2 text-xs font-medium text-default-600">
                    <div className="flex items-center justify-between gap-2">
                      <span>{panel.title}</span>
                      <span>Avg. Rank: {panel.averageRank}</span>
                    </div>
                  </div>
                  <ScanCoverageMiniMap
                    center={gbpCenter}
                    height={460}
                    label={gbpLabel}
                    points={panel.points}
                  />
                </CardBody>
              </Card>
            ))}

            <Card className={panelClass} shadow="none">
              <CardBody className="px-0 py-0">
                <div className="border-b border-default-200 px-3 py-2">
                  <h2 className="text-sm font-semibold text-default-800">
                    Competitor Analysis
                  </h2>
                </div>
                <div className="overflow-hidden rounded-b-xl">
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-default-200 bg-default-100/70 text-default-700">
                        <th className="px-2 py-2 text-left font-medium">
                          Business Name
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Primary Category
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Second Category
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Photos
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          {latestRankHeader}
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          {previousRankHeader}
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Change
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Grid Size
                        </th>
                        <th className="px-2 py-2 text-left font-medium">
                          Reviews
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitorRows.length ? (
                        competitorRows.map((row, index) => (
                          <tr
                            key={`${row.businessName}-${index}`}
                            className="border-b border-default-200/60 text-default-700"
                          >
                            <td className="px-2 py-2">
                              <p className="font-medium text-default-800">
                                {row.businessName}
                              </p>
                              <p className="text-[9px] text-default-400">
                                {row.domain}
                              </p>
                            </td>
                            <td className="px-2 py-2">{row.primaryCategory}</td>
                            <td className="px-2 py-2">
                              {row.secondaryCategory}
                            </td>
                            <td className="px-2 py-2">{row.photos}</td>
                            <td className="px-2 py-2">{row.latestRank}</td>
                            <td className="px-2 py-2">{row.previousRank}</td>
                            <td className="px-2 py-2 text-[#22c55e]">
                              {row.changeText}
                            </td>
                            <td className="px-2 py-2">{gridSizeLabel}</td>
                            <td className="px-2 py-2">⭐ {row.reviews}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            className="px-2 py-5 text-center text-default-500"
                            colSpan={9}
                          >
                            No competitor data available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </>
        )}
      </div>

      <style>{`
        .a4-report-wrap {
          min-height: 100vh;
        }
        .a4-report-page {
          box-sizing: border-box;
          margin: 0 auto;
          max-width: 210mm;
          min-height: 297mm;
          padding: 12mm;
        }
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
          .a4-report-wrap {
            background: #fff;
            padding: 0;
          }
          .a4-report-page {
            max-width: 210mm;
            min-height: 297mm;
            padding: 12mm;
          }
        }
      `}</style>
    </main>
  );
};
