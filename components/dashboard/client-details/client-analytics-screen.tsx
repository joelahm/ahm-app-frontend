"use client";

import type { ReactNode } from "react";

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";
import {
  CalendarDays,
  ChevronDown,
  Columns3,
  EllipsisVertical,
  Eye,
  Link2,
  List,
  Monitor,
  Search,
  Smartphone,
  Star,
  Tablet,
} from "lucide-react";

import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";

import Image from "next/image";

type RankingRow = {
  dateAdded: string;
  id: string;
  keyword: string;
  latestScan: string;
  previousScan: string;
  source: string;
  totalScans: string;
};

const metricCards = [
  {
    accent: "bg-[#E9F3FF] text-[#1674EA]",
    icon: PhoneMetricIcon,
    label: "Calls",
    value: "12,000",
  },
  {
    accent: "bg-[#ECFDF3] text-[#039855]",
    icon: BookingMetricIcon,
    label: "Bookings",
    value: "234",
  },
  {
    accent: "bg-[#EFF4FF] text-[#444CE7]",
    icon: ClickMetricIcon,
    label: "Website Clicks",
    value: "8,023",
  },
  {
    accent: "bg-[#FFF3EA] text-[#F97316]",
    icon: RouteMetricIcon,
    label: "Direction Requests",
    value: "340",
  },
  {
    accent: "bg-[#F4EBFF] text-[#7A3FF2]",
    icon: ViewMetricIcon,
    label: "Impressions",
    value: "45,000",
  },
];

const deviceBreakdown = [
  { color: "#1D9BF0", icon: Monitor, label: "Desktop", value: "5,897" },
  { color: "#12B6E9", icon: Smartphone, label: "Mobile", value: "9,976" },
  { color: "#6D5EF8", icon: Tablet, label: "Tablet", value: "327" },
];

const queryRows = [
  { change: "5%", keyword: "dental clinic", rank: "7th", volume: "600" },
  { change: "5%", keyword: "veneers", rank: "7th", volume: "520" },
  { change: "4%", keyword: "teeth whitening", rank: "4th", volume: "480" },
  { change: "4%", keyword: "dental implants", rank: "4th", volume: "420" },
  { change: "3%", keyword: "invisalign", rank: "2nd", volume: "390" },
];

const competitorRows = [
  {
    average: "4.7",
    business: "ABC Dental",
    category: "Dentist",
    reviews: "520",
  },
  {
    average: "4.6",
    business: "Dental Bright",
    category: "Orthodontist",
    reviews: "470",
  },
  {
    average: "4.5",
    business: "Harley Dental",
    category: "Cosmetic Clinic",
    reviews: "410",
  },
  {
    average: "4.4",
    business: "Smile One",
    category: "Dentist",
    reviews: "380",
  },
  {
    average: "4.3",
    business: "London Dental",
    category: "Dental Clinic",
    reviews: "320",
  },
];

const rankingRows: RankingRow[] = [
  {
    dateAdded: "25 Dec, 2024",
    id: "1",
    keyword: "dental bridges",
    latestScan: "4.6",
    previousScan: "5.1",
    source: "GBP",
    totalScans: "3",
  },
  {
    dateAdded: "29 Dec, 2024",
    id: "2",
    keyword: "emergency dentist",
    latestScan: "3.2",
    previousScan: "4.4",
    source: "GBP Health",
    totalScans: "5",
  },
  {
    dateAdded: "30 Dec, 2024",
    id: "3",
    keyword: "dental implants",
    latestScan: "5.7",
    previousScan: "6.2",
    source: "GBP",
    totalScans: "4",
  },
  {
    dateAdded: "08 Jan, 2025",
    id: "4",
    keyword: "root canal",
    latestScan: "6.1",
    previousScan: "7.5",
    source: "GBP Health",
    totalScans: "4",
  },
  {
    dateAdded: "15 Jan, 2025",
    id: "5",
    keyword: "braces",
    latestScan: "4.9",
    previousScan: "6.4",
    source: "GBP",
    totalScans: "2",
  },
];

const rankingColumns: DashboardDataTableColumn<RankingRow>[] = [
  {
    className: "bg-[#F9FAFB] text-xs font-medium text-[#111827]",
    key: "source",
    label: "Source / Name",
    renderCell: (item) => (
      <div className="space-y-1">
        <p className="text-sm text-[#111827]">{item.source}</p>
        <p className="text-xs text-default-500">Live scan</p>
      </div>
    ),
  },
  {
    className: "bg-[#F9FAFB] text-xs font-medium text-[#111827]",
    key: "dateAdded",
    label: "Date Added",
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.dateAdded}</span>
    ),
  },
  {
    className: "bg-[#F9FAFB] text-xs font-medium text-[#111827]",
    key: "keyword",
    label: "Keyword",
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.keyword}</span>
    ),
  },
  {
    className: "bg-[#F9FAFB] text-xs font-medium text-[#111827]",
    key: "previousScan",
    label: "Previous Scan",
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.previousScan}</span>
    ),
  },
  {
    className: "bg-[#F9FAFB] text-xs font-medium text-[#111827]",
    key: "latestScan",
    label: "Latest Scan",
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.latestScan}</span>
    ),
  },
  {
    className: "bg-[#F9FAFB] text-xs font-medium text-[#111827]",
    key: "totalScans",
    label: "Total Scan",
    renderCell: (item) => (
      <span className="text-sm text-[#111827]">{item.totalScans}</span>
    ),
  },
];

const chartPoints = [
  [30, 145],
  [76, 134],
  [122, 128],
  [168, 118],
  [214, 106],
  [260, 94],
  [306, 87],
  [352, 78],
  [398, 84],
];

const reviewBars = [
  { aqua: 48, purple: 61 },
  { aqua: 57, purple: 70 },
  { aqua: 64, purple: 78 },
  { aqua: 46, purple: 59 },
  { aqua: 49, purple: 64 },
  { aqua: 41, purple: 54 },
  { aqua: 38, purple: 47 },
  { aqua: 69, purple: 82 },
  { aqua: 44, purple: 58 },
  { aqua: 52, purple: 65 },
  { aqua: 37, purple: 49 },
  { aqua: 34, purple: 46 },
];

const reviewDistribution = [
  { label: "5", value: 97 },
  { label: "4", value: 88 },
  { label: "3", value: 80 },
  { label: "2", value: 73 },
  { label: "1", value: 70 },
];

const queryBars = [100, 86, 68, 58, 44];
const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const sectionTitleClass = "text-sm font-semibold text-[#111827]";
const sectionSubtitleClass = "text-xs text-default-500";

function PhoneMetricIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M5.1 2.55a1.5 1.5 0 0 1 1.55-.36l1.7.57a1.5 1.5 0 0 1 .98 1.18l.18 1.48a1.5 1.5 0 0 1-.43 1.21l-.77.77a11.2 11.2 0 0 0 4.3 4.3l.77-.77a1.5 1.5 0 0 1 1.2-.43l1.49.18a1.5 1.5 0 0 1 1.18.98l.56 1.7a1.5 1.5 0 0 1-.35 1.55l-.83.83a2.25 2.25 0 0 1-2.16.58A15.15 15.15 0 0 1 1.77 4.7a2.25 2.25 0 0 1 .58-2.16l.83-.83Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BookingMetricIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M4.5 2.25v1.5M13.5 2.25v1.5M3 5.25h12M4.2 15.75h9.6A1.2 1.2 0 0 0 15 14.55v-8.1a1.2 1.2 0 0 0-1.2-1.2H4.2A1.2 1.2 0 0 0 3 6.45v8.1a1.2 1.2 0 0 0 1.2 1.2Zm2.55-6.15h4.5v4.5h-4.5V9.6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ClickMetricIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="m4.5 2.25 7.5 7.5-3.75.75-.75 3.75-3-12Zm8.25.75 1.5-1.5M15.75 5.25h-2.25M12.75 8.25l1.5 1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function RouteMetricIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M6 15.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm6-9a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM7.88 12.3l2.24-2.6M8.25 3.75h1.5a2.25 2.25 0 0 1 2.25 2.25v.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ViewMetricIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M1.5 9s2.7-4.5 7.5-4.5 7.5 4.5 7.5 4.5-2.7 4.5-7.5 4.5S1.5 9 1.5 9Zm7.5 2.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const SmallStatCard = ({
  change,
  subtitle,
  title,
  value,
}: {
  change: string;
  subtitle: string;
  title: string;
  value: string;
}) => (
  <Card className="border border-default-200 shadow-none">
    <CardBody className="space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#98A2B3]">
            {title}
          </p>
          <p className="mt-2 text-[28px] font-semibold leading-none text-[#111827]">
            {value}
          </p>
        </div>
        <div className="rounded-2xl bg-[#EEF4FF] p-2 text-[#3B82F6]">
          <Eye size={16} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-[#16A34A]">{change}</p>
        <p className="text-xs text-default-500">{subtitle}</p>
      </div>
    </CardBody>
  </Card>
);

const AnalyticsCardShell = ({
  actions,
  children,
  subtitle,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  subtitle?: string;
  title: string;
}) => (
  <Card className="border border-default-200 shadow-none">
    <CardHeader className="items-start justify-between gap-3 px-5 pb-0 pt-5">
      <div>
        <p className={sectionTitleClass}>{title}</p>
        {subtitle ? <p className={sectionSubtitleClass}>{subtitle}</p> : null}
      </div>
      {actions}
    </CardHeader>
    <CardBody className="p-5">{children}</CardBody>
  </Card>
);

const ConnectGoogleAnalyticsState = () => (
  <div className="flex min-h-[520px] items-center justify-center rounded-2xl bg-white px-4 py-16">
    <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
      <div className="grid h-[58px] w-[58px] place-items-center rounded-xl border border-default-200 bg-white text-[30px] font-semibold text-[#4F46E5] shadow-sm">
        <Image alt="Google" height={28} src="/images/google-icon.svg" width={28} />
      </div>
      <h1 className="mt-14 text-2xl font-semibold tracking-[-0.03em] text-[#111827]">
        Connect Google to See Analytics
      </h1>
      <p className="mt-4 max-w-[720px] text-base text-[#6B7280]">
        To view Google Business Profile analytics, this location needs to be
        connected through Google Business Profile API.
      </p>
      <Button
        className="mt-14 h-14 min-w-[270px] rounded-lg bg-[#4F46E5] px-8 text-base font-semibold text-white"
        startContent={<Link2 size={19} />}
      >
        Connect with Google
      </Button>
    </div>
  </div>
);

export const ClientAnalyticsScreen = ({ clientId }: { clientId?: string }) => {
  const isGoogleConnected = false;

  void clientId;

  if (!isGoogleConnected) {
    return <ConnectGoogleAnalyticsState />;
  }

  return (
    <div className="space-y-5 pb-8">
      <Card className="border border-default-200 shadow-none">
        <CardBody className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                Google Business Profile Interaction
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#111827]">
                Client Analytics
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                endContent={<ChevronDown size={14} />}
                radius="sm"
                startContent={<CalendarDays size={14} />}
                variant="bordered"
              >
                This Month
              </Button>
              <Button
                endContent={<ChevronDown size={14} />}
                radius="sm"
                startContent={<Search size={14} />}
                variant="bordered"
              >
                Search Performance
              </Button>
              <Chip
                className="bg-[#E8F3FF] text-[#1674EA]"
                radius="full"
                size="sm"
              >
                20% more profile views than last month
              </Chip>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_330px]">
            <div className="rounded-[26px] border border-default-200 bg-[#FCFDFF] p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className={sectionTitleClass}>
                    Search Performance Last 90 Days
                  </p>
                  <p className={sectionSubtitleClass}>
                    Search views and interactions across the active GBP listing
                  </p>
                </div>
                <Button isIconOnly radius="full" size="sm" variant="light">
                  <EllipsisVertical size={16} />
                </Button>
              </div>

              <div className="rounded-[22px] bg-white px-2 py-3">
                <svg className="h-[260px] w-full" viewBox="0 0 430 260">
                  <defs>
                    <linearGradient
                      id="analytics-line-fill"
                      x1="0%"
                      x2="0%"
                      y1="0%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4455F5"
                        stopOpacity="0.18"
                      />
                      <stop
                        offset="100%"
                        stopColor="#4455F5"
                        stopOpacity="0.01"
                      />
                    </linearGradient>
                  </defs>

                  {[0, 1, 2, 3, 4].map((line) => (
                    <line
                      key={line}
                      stroke="#E5E7EB"
                      strokeDasharray="4 6"
                      x1="18"
                      x2="410"
                      y1={34 + line * 42}
                      y2={34 + line * 42}
                    />
                  ))}

                  <path
                    d={`M ${chartPoints.map(([x, y]) => `${x} ${y}`).join(" L ")} L 398 212 L 30 212 Z`}
                    fill="url(#analytics-line-fill)"
                  />
                  <path
                    d={`M ${chartPoints.map(([x, y]) => `${x} ${y}`).join(" L ")}`}
                    fill="none"
                    stroke="#4455F5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="4"
                  />

                  {chartPoints.map(([x, y], index) => (
                    <g key={`${x}-${y}`}>
                      <circle
                        cx={x}
                        cy={y}
                        fill="#fff"
                        r="6"
                        stroke="#4455F5"
                        strokeWidth="3"
                      />
                      {index === chartPoints.length - 1 ? (
                        <>
                          <circle
                            cx={x}
                            cy={y}
                            fill="#4455F5"
                            opacity="0.12"
                            r="16"
                          />
                          <line
                            stroke="#B5BED1"
                            strokeDasharray="4 6"
                            x1={x}
                            x2={x}
                            y1={y}
                            y2="212"
                          />
                        </>
                      ) : null}
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            <div className="space-y-4">
              <SmallStatCard
                change="+2.6% increase this week"
                subtitle="Compared to the previous period"
                title="Total Interactions"
                value="14.3%"
              />
              <SmallStatCard
                change="+220 reviews this month"
                subtitle="Google reviews added"
                title="Total Reviews"
                value="1,200"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((item) => {
          const MetricIcon = item.icon;

          return (
            <Card
              key={item.label}
              className="border border-default-200 shadow-none"
            >
              <CardBody className="flex flex-row items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#98A2B3]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-[28px] font-semibold leading-none text-[#111827]">
                    {item.value}
                  </p>
                </div>
                <div className={`rounded-2xl p-3 ${item.accent}`}>
                  <MetricIcon />
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.06fr_1.1fr_0.86fr]">
        <AnalyticsCardShell
          actions={
            <Button
              endContent={<ChevronDown size={14} />}
              radius="sm"
              variant="light"
            >
              All Time
            </Button>
          }
          subtitle="All Time"
          title="Interaction By Devices"
        >
          <div className="space-y-4">
            {deviceBreakdown.map((device) => {
              const DeviceIcon = device.icon;

              return (
                <div key={device.label} className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-[#111827]">
                      <div
                        className="rounded-full p-2 text-white"
                        style={{ backgroundColor: device.color }}
                      >
                        <DeviceIcon size={14} />
                      </div>
                      <span>{device.label}</span>
                    </div>
                    <span className="font-medium text-[#111827]">
                      {device.value}
                    </span>
                  </div>
                  <Progress
                    aria-label={device.label}
                    classNames={{
                      indicator: "rounded-full",
                      track: "h-2.5 bg-[#EAECEF]",
                    }}
                    color="primary"
                    value={
                      (Number(device.value.replaceAll(",", "")) /
                        Number(deviceBreakdown[1].value.replaceAll(",", ""))) *
                      100
                    }
                  />
                </div>
              );
            })}
          </div>
        </AnalyticsCardShell>

        <AnalyticsCardShell
          actions={
            <Button
              endContent={<ChevronDown size={14} />}
              radius="sm"
              variant="light"
            >
              Search Query
            </Button>
          }
          subtitle="Top 5 query trends"
          title="Top Search Queries"
        >
          <div className="space-y-4">
            {queryRows.map((item, index) => (
              <div key={item.keyword} className="space-y-2">
                <div className="grid grid-cols-[minmax(0,1fr)_52px_52px] items-center gap-3">
                  <p className="truncate text-sm font-medium text-[#111827]">
                    {item.keyword}
                  </p>
                  <span className="text-xs text-default-500">{item.rank}</span>
                  <span className="text-right text-xs font-medium text-[#16A34A]">
                    {item.change}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#EAECEF]">
                  <div
                    className="h-full rounded-full bg-[#12B6E9]"
                    style={{ width: `${queryBars[index]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AnalyticsCardShell>

        <AnalyticsCardShell
          subtitle="Google Maps vs Google Search"
          title="Maps vs Google Search Views"
        >
          <div className="space-y-5">
            <div className="mx-auto grid h-40 w-40 place-items-center rounded-full bg-[conic-gradient(#37B5F3_0_53.7%,#7A3FF2_53.7%_100%)]">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
                <div>
                  <p className="text-2xl font-semibold text-[#111827]">850</p>
                  <p className="text-xs text-default-500">views</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-[#111827]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#37B5F3]" />
                  <span>Maps</span>
                </div>
                <span>53.7%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-[#111827]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#7A3FF2]" />
                  <span>Google Search</span>
                </div>
                <span>46.3%</span>
              </div>
            </div>
          </div>
        </AnalyticsCardShell>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <AnalyticsCardShell
          actions={
            <Button radius="sm" variant="light">
              This Year
            </Button>
          }
          subtitle="Monthly review activity"
          title="Review Progress"
        >
          <div className="flex h-56 items-end gap-3">
            {reviewBars.map((bar, index) => (
              <div
                key={monthLabels[index]}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-44 w-full items-end gap-1.5">
                  <div
                    className="w-1/2 rounded-t-[10px] bg-[#31C4F5]"
                    style={{ height: `${bar.aqua}%` }}
                  />
                  <div
                    className="w-1/2 rounded-t-[10px] bg-[#7A3FF2]"
                    style={{ height: `${bar.purple}%` }}
                  />
                </div>
                <span className="text-[11px] text-default-500">
                  {monthLabels[index]}
                </span>
              </div>
            ))}
          </div>
        </AnalyticsCardShell>

        <div className="grid gap-4">
          <AnalyticsCardShell
            actions={
              <Button radius="sm" variant="light">
                This Month
              </Button>
            }
            subtitle="Customer sentiment"
            title="Review Engagement"
          >
            <div className="space-y-5">
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-4xl font-semibold leading-none text-[#111827]">
                    4.8
                  </p>
                  <div className="mt-2 flex gap-1 text-[#FDB022]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="fill-current" size={16} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {reviewDistribution.map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="w-3 text-xs text-default-500">
                      {row.label}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EAECEF]">
                      <div
                        className="h-full rounded-full bg-[#FDB022]"
                        style={{ width: `${row.value}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-default-500">
                      {row.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AnalyticsCardShell>

          <AnalyticsCardShell
            actions={
              <Button radius="sm" variant="light">
                Export PDF
              </Button>
            }
            subtitle="Review benchmark"
            title="Top 10 Competitors"
          >
            <div className="space-y-3">
              {competitorRows.map((row) => (
                <div
                  key={row.business}
                  className="grid grid-cols-[minmax(0,1fr)_96px_76px] items-center gap-3 rounded-[18px] border border-default-200 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#111827]">
                      {row.business}
                    </p>
                    <p className="text-xs text-default-500">{row.category}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[#FDB022]">
                    <Star className="fill-current" size={14} />
                    <span className="text-sm text-[#111827]">
                      {row.average}
                    </span>
                  </div>
                  <span className="text-sm text-[#111827]">{row.reviews}</span>
                </div>
              ))}
            </div>
          </AnalyticsCardShell>
        </div>
      </div>

      <Card className="border border-default-200 shadow-none">
        <CardBody className="p-0">
          <DashboardDataTable
            showPagination
            ariaLabel="Client analytics local rankings"
            columns={rankingColumns}
            getRowKey={(item) => item.id}
            headerRight={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  radius="sm"
                  startContent={<CalendarDays size={14} />}
                  variant="bordered"
                >
                  2 Mar
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
              </div>
            }
            rows={rankingRows}
            title="Local Rankings"
            withShell={false}
          />
        </CardBody>
      </Card>
    </div>
  );
};
