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
import { Spinner } from "@heroui/spinner";
import clsx from "clsx";
import { ChevronDown, LayoutGrid, Star } from "lucide-react";

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

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const MiniMapPanel = ({
  averageRank,
  center,
  label,
  points = [],
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
      <div className="pointer-events-none absolute right-4 top-4 z-10 w-[250px] rounded-[24px] bg-white/96 p-4 shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
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
  const [gridLayout, setGridLayout] = useState<1 | 2 | 3>(1);
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
        setCoverage(comparisonResponse.scan.coverage || []);
        setCoverageUnit(comparisonResponse.scan.coverageUnit || null);
        setKeywordLabel(comparisonResponse.comparison.keyword || "");
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
    averageRank: formatAverageRank(run.averageRank, "X"),
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
  const exportPdf = useCallback(() => {
    if (!mapPanels.length && !competitorRows.length) {
      return;
    }

    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const gridColumns =
      gridLayout === 1 ? "1fr" : gridLayout === 2 ? "1fr 1fr" : "1fr 1fr 1fr";
    const staticSize = gridLayout === 1 ? "960x540" : "640x360";

    const buildMarkerColor = (rank?: number | null) => {
      if (rank === 1) {
        return "green";
      }

      if (typeof rank === "number" && Number.isFinite(rank) && rank <= 9) {
        return "yellow";
      }

      return "red";
    };
    const buildStaticMapUrl = (panel: (typeof mapPanels)[number]) => {
      if (!googleMapsApiKey || !panel.center) {
        return "";
      }

      const markers = panel.points
        .slice(0, 30)
        .map((point) => {
          const color = buildMarkerColor(point.rank);

          return `markers=size:tiny%7Ccolor:${color}%7C${point.latitude},${point.longitude}`;
        })
        .join("&");
      const centerMarker = `markers=color:blue%7C${panel.center.latitude},${panel.center.longitude}`;

      return `https://maps.googleapis.com/maps/api/staticmap?size=${staticSize}&scale=2&maptype=roadmap&${centerMarker}${markers ? `&${markers}` : ""}&key=${encodeURIComponent(googleMapsApiKey)}`;
    };

    const mapsHtml = mapPanels
      .map((panel) => {
        const mapUrl = buildStaticMapUrl(panel);
        const title = escapeHtml(panel.title);
        const subtitle = escapeHtml(panel.subtitle || "");
        const averageRank = escapeHtml(panel.averageRank);

        return `
          <article class="map-card">
            ${mapUrl ? `<img src="${mapUrl}" alt="${title}" class="map-image" />` : `<div class="map-image no-map">Map preview unavailable</div>`}
            <div class="map-meta">
              <h3>${title}</h3>
              <p>${subtitle}</p>
              <strong>Avg. Rank: ${averageRank}</strong>
            </div>
          </article>
        `;
      })
      .join("");
    const competitorRowsHtml = competitorRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.businessName)}</td>
            <td>${escapeHtml(row.domain)}</td>
            <td>${escapeHtml(row.previousRank)}</td>
            <td>${escapeHtml(row.latestRank)}</td>
            <td>${row.delta !== null ? escapeHtml(row.delta > 0 ? `↗ +${row.delta}` : `↘ ${row.delta}`) : "-"}</td>
            <td>${escapeHtml(row.gridSize)}</td>
            <td>${escapeHtml(row.reviews)}</td>
          </tr>
        `,
      )
      .join("");

    setIsExportingPdf(true);
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setIsExportingPdf(false);

      return;
    }

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Local Ranking Export</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 20px; }
            h1 { margin: 0 0 8px; font-size: 20px; }
            h2 { margin: 20px 0 10px; font-size: 18px; }
            .sub { color: #6b7280; margin-bottom: 14px; }
            .maps-grid { display: grid; grid-template-columns: ${gridColumns}; gap: 12px; }
            .map-card { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff; }
            .map-image { width: 100%; display: block; background: #f3f4f6; min-height: 180px; object-fit: cover; }
            .no-map { display: grid; place-items: center; color: #6b7280; }
            .map-meta { padding: 10px 12px 14px; }
            .map-meta h3 { margin: 0; font-size: 14px; }
            .map-meta p { margin: 4px 0 8px; color: #6b7280; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f9fafb; font-weight: 600; }
            .muted { color: #6b7280; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>Local Ranking Report</h1>
          <div class="sub">Keyword: ${escapeHtml(keywordLabel || "-")} | Grid View: ${gridLayout} column(s)</div>

          <h2>Map Panels</h2>
          <section class="maps-grid">
            ${mapsHtml || `<p>No map data available.</p>`}
          </section>

          <h2>Competitor Analysis</h2>
          <table>
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Domain</th>
                <th>${escapeHtml(previousRankHeader)}</th>
                <th>${escapeHtml(latestRankHeader)}</th>
                <th>Change</th>
                <th>Grid Size</th>
                <th>Reviews</th>
              </tr>
            </thead>
            <tbody>
              ${competitorRowsHtml || `<tr><td colspan="7">No competitor data available.</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();

      let didTriggerPrint = false;
      const handlePrint = () => {
        if (didTriggerPrint) {
          return;
        }

        didTriggerPrint = true;
        window.setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } finally {
            setIsExportingPdf(false);
          }
        }, 350);
      };

      printWindow.addEventListener("load", handlePrint, { once: true });
      window.setTimeout(() => {
        if (!didTriggerPrint) {
          handlePrint();
        }
      }, 1200);
    } catch {
      setIsExportingPdf(false);
      printWindow.close();
    }
  }, [
    competitorRows,
    gridLayout,
    keywordLabel,
    latestRankHeader,
    mapPanels,
    previousRankHeader,
  ]);

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
                  className="h-10 rounded-xl bg-[#5446e8] px-4 text-xs font-semibold text-white"
                  isDisabled={isExportingPdf || isLoading}
                  isLoading={isExportingPdf}
                  onPress={exportPdf}
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
        </>
      )}
    </div>
  );
};
