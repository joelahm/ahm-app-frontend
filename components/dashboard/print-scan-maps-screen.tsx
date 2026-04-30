"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Printer } from "lucide-react";

import { clientsApi } from "@/apis/clients";
import { scansApi, type ScanComparisonRun } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import { ScanCoverageMiniMap } from "@/components/dashboard/client-details/scan-coverage-mini-map";

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

const formatDistanceLabel = (
  coverage: Array<{ latitude: number; longitude: number }>,
  coverageUnit?: string | null,
) => {
  if (coverage.length < 2) {
    return "Distance -";
  }

  let nearestDistanceKm = Number.POSITIVE_INFINITY;

  for (let index = 0; index < coverage.length; index += 1) {
    for (
      let nextIndex = index + 1;
      nextIndex < coverage.length;
      nextIndex += 1
    ) {
      const distanceKm = calculateDistanceKm(
        coverage[index],
        coverage[nextIndex],
      );

      if (distanceKm > 0 && distanceKm < nearestDistanceKm) {
        nearestDistanceKm = distanceKm;
      }
    }
  }

  if (!Number.isFinite(nearestDistanceKm)) {
    return "Distance -";
  }

  const isMiles = coverageUnit === "MILES";
  const value = isMiles ? nearestDistanceKm / 1.60934 : nearestDistanceKm;
  const unit = isMiles ? "mi" : "km";

  return `Distance: ${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`;
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

const isNumericCoordinate = (point: {
  latitude?: number | null;
  longitude?: number | null;
}): point is { latitude: number; longitude: number } =>
  typeof point.latitude === "number" &&
  Number.isFinite(point.latitude) &&
  typeof point.longitude === "number" &&
  Number.isFinite(point.longitude);

type ScanMapGroup = {
  areaLabel: string;
  center: {
    latitude: number;
    longitude: number;
  } | null;
  clientAddress: string;
  clientName: string;
  distanceLabel: string;
  gridSizeLabel: string;
  keywordLabel: string;
  label: string | null;
  runs: ScanComparisonRun[];
  scanId: number;
};

export const PrintScanMapsScreen = ({ scanId }: { scanId: string }) => {
  const { getValidAccessToken, session } = useAuth();
  const numericScanIds = useMemo(() => {
    const decodedScanId = decodeURIComponent(scanId);
    const ids = decodedScanId
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    return Array.from(new Set(ids));
  }, [scanId]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [groups, setGroups] = useState<ScanMapGroup[]>([]);

  useEffect(() => {
    if (!session?.accessToken || !numericScanIds.length) {
      setIsLoading(false);
      setErrorMessage("Invalid scan ID selection or missing session.");

      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        const accessToken = await getValidAccessToken();
        const loadedGroups = await Promise.all(
          numericScanIds.map(async (numericScanId) => {
            const scan = await scansApi.getScanById(accessToken, numericScanId);
            const coverage = (scan.coverage || []).filter(isNumericCoordinate);
            const coverageUnit = scan.coverageUnit || null;
            const coverageCenter: ScanMapGroup["center"] = coverage.length
              ? {
                  latitude: Number(
                    (
                      coverage.reduce((sum, point) => sum + point.latitude, 0) /
                      coverage.length
                    ).toFixed(7),
                  ),
                  longitude: Number(
                    (
                      coverage.reduce(
                        (sum, point) => sum + point.longitude,
                        0,
                      ) / coverage.length
                    ).toFixed(7),
                  ),
                }
              : null;

            if (!scan.clientId) {
              return {
                areaLabel: formatAreaLabel(coverage, coverageUnit),
                center: coverageCenter,
                clientAddress: "",
                clientName: "Client",
                distanceLabel: formatDistanceLabel(coverage, coverageUnit),
                gridSizeLabel: formatGridSizeLabel(coverage),
                keywordLabel: scan.keyword || "",
                label: null,
                runs: [],
                scanId: numericScanId,
              };
            }

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
            let center: ScanMapGroup["center"] = coverageCenter;
            let label: string | null =
              client.clientName ?? client.businessName ?? null;

            if (gbpDetailsResult.ok) {
              const { latitude, longitude } = gbpDetailsResult.data;

              if (
                typeof latitude === "number" &&
                Number.isFinite(latitude) &&
                typeof longitude === "number" &&
                Number.isFinite(longitude)
              ) {
                center = {
                  latitude,
                  longitude,
                };
                label =
                  gbpDetailsResult.data.businessName ??
                  gbpDetailsResult.data.businessLocation ??
                  client.clientName ??
                  client.businessName ??
                  null;
              }
            }

            return {
              areaLabel: formatAreaLabel(coverage, coverageUnit),
              center,
              clientAddress:
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
              clientName: client.clientName || client.businessName || "Client",
              distanceLabel: formatDistanceLabel(coverage, coverageUnit),
              gridSizeLabel: formatGridSizeLabel(coverage),
              keywordLabel: scan.keyword || "",
              label,
              runs: comparisonResponse.comparison.runs || [],
              scanId: numericScanId,
            };
          }),
        );

        if (!isMounted) {
          return;
        }

        setGroups(loadedGroups);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load scan maps.",
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
  }, [getValidAccessToken, numericScanIds, session?.accessToken]);

  return (
    <main className="a4-report-wrap bg-default-50 py-8">
      <div className="a4-report-page space-y-3">
        {isLoading ? (
          <Card className={panelClass} shadow="none">
            <CardBody className="flex min-h-40 items-center justify-center">
              <Spinner color="primary" label="Loading scan maps..." />
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
                  <div className="flex flex-wrap items-center gap-2 text-xs text-default-500">
                    <h1 className="text-2xl font-semibold text-[#111827]">
                      Maps Export
                    </h1>
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
              </CardBody>
            </Card>

            {groups.length ? (
              groups.map((group) =>
                group.runs.length ? (
                  group.runs.map((run, index) => {
                    const points = (run.coordinates || []).map(
                      (coordinate, coordinateIndex) => ({
                        label:
                          coordinate.coordinateLabel ||
                          `Coordinate ${coordinateIndex + 1}`,
                        latitude: coordinate.latitude,
                        longitude: coordinate.longitude,
                        rank: coordinate.rankAbsolute,
                      }),
                    );
                    const runTitle = formatRunTitle(
                      run.finishedAt || run.startedAt || run.dateOfScan || null,
                    );

                    return (
                      <section
                        key={`${group.scanId}-${run.runId}-${index}`}
                        className="map-print-page space-y-3"
                      >
                        <Card className={panelClass} shadow="none">
                          <CardBody className="space-y-2 px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-default-500">
                              <h2 className="text-xl font-semibold text-[#111827]">
                                {group.clientName || "Client"}
                              </h2>
                              <span>{group.clientAddress || "-"}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Chip className={toolbarChipClass}>
                                Keyword: {group.keywordLabel || "-"}
                              </Chip>
                              <Chip className={toolbarChipClass}>
                                {group.gridSizeLabel}
                              </Chip>
                              <Chip className={toolbarChipClass}>
                                {group.distanceLabel}
                              </Chip>
                              <Chip className={toolbarChipClass}>
                                {group.areaLabel}
                              </Chip>
                            </div>
                          </CardBody>
                        </Card>

                        <Card className={panelClass} shadow="none">
                          <CardBody className="p-0">
                            <div className="border-b border-default-200 px-3 py-2 text-xs font-medium text-default-600">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span>{runTitle}</span>
                                <span>
                                  Avg. Rank:{" "}
                                  {formatAverageRank(run.averageRank)}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-default-500">
                                <span>
                                  Keyword: {group.keywordLabel || "-"}
                                </span>
                                <span>{group.gridSizeLabel}</span>
                                <span>{group.distanceLabel}</span>
                                <span>{group.areaLabel}</span>
                              </div>
                            </div>
                            <ScanCoverageMiniMap
                              center={group.center}
                              height={640}
                              label={group.label ?? group.clientName}
                              points={points}
                            />
                          </CardBody>
                        </Card>
                      </section>
                    );
                  })
                ) : (
                  <section
                    key={group.scanId}
                    className="map-print-page space-y-3"
                  >
                    <Card className={panelClass} shadow="none">
                      <CardBody className="space-y-2 px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Chip className={toolbarChipClass}>
                            Keyword: {group.keywordLabel || "-"}
                          </Chip>
                          <Chip className={toolbarChipClass}>
                            {group.gridSizeLabel}
                          </Chip>
                          <Chip className={toolbarChipClass}>
                            {group.distanceLabel}
                          </Chip>
                          <Chip className={toolbarChipClass}>
                            {group.areaLabel}
                          </Chip>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-default-500">
                          <h2 className="text-xl font-semibold text-[#111827]">
                            {group.clientName || "Client"}
                          </h2>
                          <span>{group.clientAddress || "-"}</span>
                        </div>
                      </CardBody>
                    </Card>
                    <Card className={panelClass} shadow="none">
                      <CardBody className="py-8 text-center text-sm text-default-500">
                        No scanned maps available for{" "}
                        {group.keywordLabel || "this keyword"}.
                      </CardBody>
                    </Card>
                  </section>
                ),
              )
            ) : (
              <Card className={panelClass} shadow="none">
                <CardBody className="py-8 text-center text-sm text-default-500">
                  No scanned maps available.
                </CardBody>
              </Card>
            )}
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
          padding: 12mm;
        }
        .map-print-page {
          box-sizing: border-box;
          min-height: calc(297mm - 24mm);
        }
        .map-print-page + .map-print-page {
          margin-top: 12mm;
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
            padding: 12mm;
          }
          .a4-report-page > .border {
            display: none;
          }
          .map-print-page {
            break-after: page;
            margin: 0;
            min-height: calc(297mm - 24mm);
            page-break-after: always;
          }
          .map-print-page:last-of-type {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>
    </main>
  );
};
