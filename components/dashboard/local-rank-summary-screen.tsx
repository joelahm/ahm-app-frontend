"use client";

import type { ClientApiItem } from "@/apis/clients";
import type { LocalRankingKeyword } from "@/apis/scans";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import {
  Columns3,
  EllipsisVertical,
  ListFilter,
  ListOrdered,
  Search,
} from "lucide-react";
import Link from "next/link";

import { clientsApi } from "@/apis/clients";
import { scansApi } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { useAppToast } from "@/hooks/use-app-toast";

type LocalRankSummaryRow = {
  actionHref: string;
  clientAddress: string;
  clientName: string;
  distance: string;
  frequency: string;
  gridSize: string;
  id: string;
  latestScan: string;
  nextScanDate: string;
  niche: string;
  previousScan: string;
  totalTrackedKeywords: number;
};

const headerCellClass = "bg-[#F9FAFB] text-xs font-medium text-[#111827]";
const pageSizeOptions = [10, 25, 50];

const formatRankMetric = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const formatDateDisplay = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
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
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getGridSize = (totalCoordinates?: number | null) => {
  if (!totalCoordinates || totalCoordinates <= 0) {
    return "-";
  }

  const side = Math.sqrt(totalCoordinates);

  if (Number.isInteger(side)) {
    return `${side} x ${side}`;
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

const formatDistance = (item?: LocalRankingKeyword | null) => {
  const points = item?.coordinates ?? [];

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

  const isMiles = item?.coverageUnit === "MILES";
  const value = isMiles ? nearestDistanceKm / 1.60934 : nearestDistanceKm;
  const unit = isMiles ? "mi" : "km";

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`;
};

const averageMetric = (
  keywords: LocalRankingKeyword[],
  getValue: (keyword: LocalRankingKeyword) => number | null | undefined,
) => {
  const values = keywords
    .map(getValue)
    .filter(
      (value): value is number =>
        value !== null && value !== undefined && Number.isFinite(value),
    );

  if (!values.length) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);

  return Number((total / values.length).toFixed(1));
};

const getClientName = (client: ClientApiItem) =>
  (client.businessName || client.clientName || "").trim() ||
  `Client ${client.id}`;

const buildSummaryRow = ({
  client,
  keywords,
  totalTrackedKeywords,
}: {
  client: ClientApiItem;
  keywords: LocalRankingKeyword[];
  totalTrackedKeywords: number;
}): LocalRankSummaryRow => {
  const latestKeyword =
    keywords.slice().sort((first, second) => {
      const firstTime = new Date(
        first.dateOfScan ?? first.nextRunAt ?? first.nextSchedule ?? "",
      ).getTime();
      const secondTime = new Date(
        second.dateOfScan ?? second.nextRunAt ?? second.nextSchedule ?? "",
      ).getTime();

      return (
        (Number.isNaN(secondTime) ? 0 : secondTime) -
        (Number.isNaN(firstTime) ? 0 : firstTime)
      );
    })[0] ?? null;

  return {
    actionHref: `/dashboard/clients/${encodeURIComponent(String(client.id))}/local-rankings`,
    clientAddress: client.address || "-",
    clientName: getClientName(client),
    distance: formatDistance(latestKeyword),
    frequency: formatFrequency(latestKeyword?.frequency),
    gridSize: getGridSize(latestKeyword?.totalCoordinates),
    id: String(client.id),
    latestScan: formatRankMetric(
      averageMetric(
        keywords,
        (keyword) => keyword.latestScan ?? keyword.averageRank,
      ),
    ),
    nextScanDate: formatDateDisplay(
      latestKeyword?.nextSchedule ?? latestKeyword?.nextRunAt,
    ),
    niche: client.niche || "-",
    previousScan: formatRankMetric(
      averageMetric(keywords, (keyword) => keyword.previousScan),
    ),
    totalTrackedKeywords,
  };
};

export const LocalRankSummaryScreen = () => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const toastRef = useRef(toast);
  const [rows, setRows] = useState<LocalRankSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const columns = useMemo<DashboardDataTableColumn<LocalRankSummaryRow>[]>(
    () => [
      {
        className: headerCellClass,
        key: "clientName",
        label: "Client Name",
        renderCell: (item) => (
          <div className="min-w-[190px]">
            <p className="text-sm font-medium text-[#111827]">
              {item.clientName}
            </p>
            <p className="mt-1 truncate text-xs text-[#98A2B3]">
              {item.clientAddress}
            </p>
          </div>
        ),
      },
      {
        className: headerCellClass,
        key: "niche",
        label: "Niche",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {item.niche}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "gridSize",
        label: "Grid size",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {item.gridSize}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "distance",
        label: "Distance",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {item.distance}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "previousScan",
        label: "Previous Scan",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {item.previousScan}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "latestScan",
        label: "Latest Scan",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {item.latestScan}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "nextScanDate",
        label: "Next Scan Date",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {item.nextScanDate}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "totalTrackedKeywords",
        label: "Total Tracked Keywords",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {item.totalTrackedKeywords}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "frequency",
        label: "Frequency",
        renderCell: (item) => (
          <span className="whitespace-nowrap text-sm text-[#111827]">
            {item.frequency}
          </span>
        ),
      },
      {
        className: headerCellClass,
        key: "action",
        label: "Action",
        renderCell: (item) => (
          <div className="flex justify-end">
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button isIconOnly radius="md" size="sm" variant="bordered">
                  <EllipsisVertical size={16} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label={`${item.clientName} actions`}>
                <DropdownItem key="view" as={Link} href={item.actionHref}>
                  View Local Rankings
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        ),
      },
    ],
    [],
  );

  const toggleableColumns = useMemo(
    () => columns.filter((column) => column.key !== "action"),
    [columns],
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(
    () => new Set(toggleableColumns.map((column) => column.key)),
  );

  useEffect(() => {
    if (!session?.accessToken) {
      setRows([]);
      setIsLoading(false);

      return;
    }

    let isMounted = true;

    const loadRows = async () => {
      setIsLoading(true);

      try {
        const accessToken = await getValidAccessToken();
        const clients = await clientsApi.getClients(accessToken);
        const results = await Promise.allSettled(
          clients.map(async (client) => {
            const response = await scansApi.getClientLocalRankings(
              accessToken,
              client.id,
              { limit: 100, page: 1 },
            );

            return buildSummaryRow({
              client,
              keywords: response.keywords ?? [],
              totalTrackedKeywords: response.pagination?.total ?? 0,
            });
          }),
        );

        if (!isMounted) {
          return;
        }

        const nextRows = results
          .filter(
            (result): result is PromiseFulfilledResult<LocalRankSummaryRow> =>
              result.status === "fulfilled",
          )
          .map((result) => result.value)
          .sort(
            (first, second) =>
              second.totalTrackedKeywords - first.totalTrackedKeywords ||
              first.clientName.localeCompare(second.clientName),
          );

        setRows(nextRows);

        const failedCount = results.filter(
          (result) => result.status === "rejected",
        ).length;

        if (failedCount) {
          toastRef.current.warning("Some clients could not be loaded.", {
            description: `${failedCount} client local ranking summaries failed to load.`,
          });
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRows([]);
        toastRef.current.danger("Failed to load local rank summary.", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadRows();

    return () => {
      isMounted = false;
    };
  }, [getValidAccessToken, session?.accessToken]);

  const nicheOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.niche).filter(Boolean))).sort(),
    [rows],
  );
  const frequencyOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.frequency).filter(Boolean)),
      ).sort(),
    [rows],
  );
  const hasActiveFilters = nicheFilter !== "all" || frequencyFilter !== "all";

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return rows.filter((row) => {
      if (nicheFilter !== "all" && row.niche !== nicheFilter) {
        return false;
      }

      if (frequencyFilter !== "all" && row.frequency !== frequencyFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        row.clientName,
        row.clientAddress,
        row.niche,
        row.frequency,
        row.gridSize,
        row.distance,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [frequencyFilter, nicheFilter, rows, searchValue]);

  const visibleColumns = useMemo(
    () =>
      columns.filter(
        (column) =>
          column.key === "action" || visibleColumnKeys.has(column.key),
      ),
    [columns, visibleColumnKeys],
  );

  const resetFilters = useCallback(() => {
    setNicheFilter("all");
    setFrequencyFilter("all");
  }, []);

  return (
    <DashboardDataTable
      showPagination
      ariaLabel="Local rank summary table"
      columns={visibleColumns}
      emptyContent="No local rank summaries found."
      getRowKey={(item) => item.id}
      headerRight={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                color={hasActiveFilters ? "primary" : "default"}
                startContent={<ListFilter size={14} />}
                variant={hasActiveFilters ? "flat" : "bordered"}
              >
                Filter
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Local rank summary filters">
              <DropdownItem key="filters" isReadOnly textValue="Filters">
                <div className="w-72 space-y-3 py-1">
                  <Select
                    aria-label="Filter by niche"
                    label="Niche"
                    selectedKeys={[nicheFilter]}
                    size="sm"
                    onChange={(event) => setNicheFilter(event.target.value)}
                  >
                    {[
                      <SelectItem key="all">All niches</SelectItem>,
                      ...nicheOptions.map((option) => (
                        <SelectItem key={option}>{option}</SelectItem>
                      )),
                    ]}
                  </Select>
                  <Select
                    aria-label="Filter by frequency"
                    label="Frequency"
                    selectedKeys={[frequencyFilter]}
                    size="sm"
                    onChange={(event) => setFrequencyFilter(event.target.value)}
                  >
                    {[
                      <SelectItem key="all">All frequencies</SelectItem>,
                      ...frequencyOptions.map((option) => (
                        <SelectItem key={option}>{option}</SelectItem>
                      )),
                    ]}
                  </Select>
                  <Button
                    className="w-full"
                    size="sm"
                    variant="bordered"
                    onPress={resetFilters}
                  >
                    Reset
                  </Button>
                </div>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                startContent={<ListOrdered size={14} />}
                variant="bordered"
              >
                Show {pageSize}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Rows per page"
              selectedKeys={[String(pageSize)]}
              selectionMode="single"
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0];
                const selectedPageSize = Number(selectedKey);

                if (Number.isFinite(selectedPageSize)) {
                  setPageSize(selectedPageSize);
                }
              }}
            >
              {pageSizeOptions.map((option) => (
                <DropdownItem key={String(option)}>Show {option}</DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button startContent={<Columns3 size={14} />} variant="bordered">
                Columns
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Visible local rank summary columns"
              closeOnSelect={false}
            >
              {toggleableColumns.map((column) => (
                <DropdownItem key={column.key} textValue={column.label}>
                  <Checkbox
                    isSelected={visibleColumnKeys.has(column.key)}
                    onValueChange={() => {
                      setVisibleColumnKeys((current) => {
                        const next = new Set(current);

                        if (next.has(column.key)) {
                          next.delete(column.key);
                        } else {
                          next.add(column.key);
                        }

                        return next;
                      });
                    }}
                  >
                    {column.label}
                  </Checkbox>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
          <Input
            className="w-full sm:w-[210px]"
            placeholder="Search here"
            radius="md"
            startContent={<Search size={16} />}
            value={searchValue}
            onValueChange={setSearchValue}
          />
        </div>
      }
      isLoading={isLoading}
      loadingLabel="Loading local rank summary..."
      pageSize={pageSize}
      rows={filteredRows}
      title="Local Rank Summary"
    />
  );
};
