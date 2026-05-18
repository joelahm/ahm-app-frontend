"use client";

import type { ReactNode } from "react";

import Chart from "chart.js/auto";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { DateRangePicker } from "@heroui/date-picker";
import { parseDate, type DateValue } from "@internationalized/date";
import {
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  Globe,
  Quote,
  RefreshCw,
  Settings,
  Star,
} from "lucide-react";

import {
  clientsApi,
  type ClientCitation,
  type ClientDetails,
  type ClientGbpDetails,
  type ClientGbpPosting,
  type ClientGbpReview,
  type ClientProject,
  type ProjectTask,
} from "@/apis/clients";
import {
  keywordContentListsApi,
  type ContentBreakdownItem,
  type KeywordContentListRecord,
} from "@/apis/keyword-content-lists";
import { scansApi, type LocalRankingKeyword } from "@/apis/scans";
import { useAuth } from "@/components/auth/auth-context";
import { useAppToast } from "@/hooks/use-app-toast";

type ProjectOverview = {
  completed: number;
  name: string;
  progress: number;
  status: "Active" | "Completed" | "In Progress" | "Pending";
};

type StatusCount = {
  color: string;
  label: string;
  value: number;
};

type AnalyticsDateRange = {
  end: string;
  start: string;
};

type ReviewTrendPoint = {
  isFuture: boolean;
  label: string;
  value: number | null;
};

type ProfileCompletionSummary = {
  completed: number;
  pending: number;
  percentage: number;
  total: number;
};

const CONTENT_STATUS_LABELS = [
  "Draft",
  "Generating",
  "Internal Review",
  "Ready for Client Review",
  "Sent to Client for Review",
  "Completed",
];
const CONTENT_STATUS_COLORS = [
  "#3B82F6",
  "#65B7F3",
  "#25C7DD",
  "#6E55F6",
  "#3B82F6",
  "#07A36D",
];
const CONTENT_CHART_MAX = 180;

const DEFAULT_CONTENT_BREAKDOWN = [
  { key: "treatment-pages", label: "Treatment Pages", allocated: 10, used: 0 },
  { key: "condition-pages", label: "Condition Pages", allocated: 5, used: 0 },
  { key: "blogs", label: "Blogs", allocated: 40, used: 0 },
  { key: "press-release", label: "Press Release", allocated: 10, used: 0 },
  { key: "homepage", label: "Homepage", allocated: 1, used: 0 },
];

const statusPillClass: Record<ProjectOverview["status"], string> = {
  Active: "bg-emerald-50 text-emerald-600",
  Completed: "bg-emerald-50 text-emerald-600",
  "In Progress": "bg-[#EEF4FF] text-[#244AA8]",
  Pending: "bg-orange-50 text-orange-500",
};

const projectIcons = [Globe, ClipboardList, FileText, Settings, Quote];

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDefaultAnalyticsRange = (): AnalyticsDateRange => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    end: formatDateInputValue(now),
    start: formatDateInputValue(start),
  };
};

const toDateValue = (value?: string | null): DateValue | null => {
  if (!value) {
    return null;
  }

  try {
    return parseDate(value);
  } catch {
    return null;
  }
};

const formatDate = (value?: string | null) => {
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
  });
};

const formatShortMonthDate = (value?: string | null) => {
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
  });
};

const getRatingNumber = (value?: string | null) => {
  const rating = Number(String(value ?? "").replace(/[^\d.]/g, ""));

  return Number.isFinite(rating) ? rating : null;
};

const parseReviewDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isDateInAnalyticsRange = (
  value: string | null | undefined,
  range: AnalyticsDateRange,
) => {
  const date = parseReviewDate(value);
  const start = parseReviewDate(range.start);
  const end = parseReviewDate(range.end);

  if (!date || !start || !end) {
    return false;
  }

  const startTime = new Date(start);
  const endTime = new Date(end);

  startTime.setHours(0, 0, 0, 0);
  endTime.setHours(23, 59, 59, 999);

  return date >= startTime && date <= endTime;
};

const getFirstDateInRange = (
  range: AnalyticsDateRange,
  ...values: Array<string | null | undefined>
) => values.find((value) => isDateInAnalyticsRange(value, range)) ?? null;

const getCurrentYearMonthStarts = () => {
  const now = new Date();

  return Array.from(
    { length: 12 },
    (_, index) => new Date(now.getFullYear(), index, 1),
  );
};

const getReviewTrend = (
  reviews: ClientGbpReview[],
  totalReviewCount: number,
) => {
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const monthStarts = getCurrentYearMonthStarts();
  const monthlyCounts = monthStarts.map((monthStart) => {
    const month = monthStart.getMonth();
    const year = monthStart.getFullYear();

    return reviews.filter((review) => {
      const date = parseReviewDate(review.date);

      return (
        date !== null &&
        date.getFullYear() === year &&
        date.getMonth() === month
      );
    }).length;
  });
  const knownRangeTotal = monthlyCounts.reduce((sum, value) => sum + value, 0);
  let runningTotal = Math.max(0, totalReviewCount - knownRangeTotal);

  return monthStarts.map((monthStart, index) => {
    const isFuture = index > currentMonthIndex;

    if (!isFuture) {
      runningTotal += monthlyCounts[index] ?? 0;
    }

    return {
      isFuture,
      label: monthStart.toLocaleDateString("en-US", { month: "short" }),
      value: isFuture ? null : runningTotal,
    };
  });
};

const getThisMonthReviewCount = (reviews: ClientGbpReview[]) => {
  const now = new Date();

  return reviews.filter((review) => {
    const date = parseReviewDate(review.date);

    return (
      date !== null &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }).length;
};

const isDateInMonthOffset = (value: string | null | undefined, offset = 0) => {
  const date = parseReviewDate(value);

  if (!date) {
    return false;
  }

  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);

  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth()
  );
};

const getScoreTone = (score: number) => {
  if (score >= 80) {
    return {
      graph: "#07A36D",
      label: "Good",
      pillClass: "bg-emerald-50 text-emerald-600",
      text: "#07A36D",
    };
  }

  if (score >= 50) {
    return {
      graph: "#FF922E",
      label: "Needs Work",
      pillClass: "bg-orange-50 text-orange-600",
      text: "#FF922E",
    };
  }

  return {
    graph: "#EF4444",
    label: "Poor",
    pillClass: "bg-red-50 text-red-600",
    text: "#EF4444",
  };
};

const normalizeStatus = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const hasTextValue = (value: string | null | undefined) =>
  Boolean(value?.trim());

const hasItems = (items: unknown[] | null | undefined) =>
  Array.isArray(items) && items.length > 0;

const hasCompletedPracticeHours = (
  items: ClientDetails["practiceHours"] | null | undefined,
) =>
  Array.isArray(items) &&
  items.some(
    (item) =>
      item.enabled &&
      hasTextValue(item.startTime) &&
      hasTextValue(item.endTime) &&
      hasTextValue(item.startMeridiem) &&
      hasTextValue(item.endMeridiem),
  );

const getProfileCompletionSummary = (
  client: ClientDetails | null,
): ProfileCompletionSummary => {
  if (!client) {
    return { completed: 0, pending: 0, percentage: 0, total: 0 };
  }

  const checks = [
    hasTextValue(client.clientName),
    hasTextValue(client.businessName),
    hasTextValue(client.niche),
    hasTextValue(client.personalEmail),
    hasTextValue(client.personalPhone),
    hasTextValue(client.practiceEmail),
    hasTextValue(client.businessPhone),
    hasTextValue(client.website),
    hasTextValue(client.country),
    hasTextValue(client.typeOfPractice),
    hasTextValue(client.profession),
    hasTextValue(client.practiceStructure),
    hasTextValue(client.gmcRegistrationNumber),
    hasTextValue(client.buildingName),
    hasTextValue(client.unitNumber),
    hasTextValue(client.streetAddress),
    hasTextValue(client.region),
    hasTextValue(client.visibleArea),
    hasTextValue(client.nearbyAreasServed),
    hasTextValue(client.postCode),
    hasTextValue(client.credentials),
    hasTextValue(client.majorAccomplishments),
    hasTextValue(client.gbpLink),
    hasTextValue(client.facebook),
    hasTextValue(client.instagram),
    hasTextValue(client.linkedin),
    hasTextValue(client.websiteLoginLink),
    hasTextValue(client.websiteUsername),
    hasTextValue(client.websitePassword),
    hasTextValue(client.googleAnalytics),
    hasTextValue(client.googleSearchConsole),
    hasTextValue(String(client.assignedTo ?? "")),
    hasItems(client.topMedicalSpecialties),
    hasItems(client.subSpecialties),
    hasItems(client.topTreatments),
    hasItems(client.treatmentAndServices),
    hasItems(client.conditionsTreated),
    hasTextValue(client.uniqueToCompetitors),
    hasCompletedPracticeHours(client.practiceHours),
    hasItems(client.highQualityHeadshot),
    hasItems(client.yourCv),
    hasItems(client.practiceLocationInteriorPhoto),
    hasItems(client.practiceLocationExteriorPhoto),
    hasItems(client.otherImages),
    hasItems(client.colorGuide),
    hasItems(client.logo),
  ];
  const completed = checks.filter(Boolean).length;
  const total = checks.length;

  return {
    completed,
    pending: total - completed,
    percentage: Math.round((completed / total) * 100),
    total,
  };
};

const parseProgress = (value?: string | null) => {
  const numeric = Number(String(value ?? "").replace(/[^\d.]/g, ""));

  return Number.isFinite(numeric) ? Math.min(100, Math.max(0, numeric)) : 0;
};

const getProjectStatus = (
  project: ClientProject,
): ProjectOverview["status"] => {
  const status = normalizeStatus(project.phase || project.progress);

  if (status.includes("complete")) return "Completed";
  if (status.includes("active")) return "Active";
  if (status.includes("pending") || status.includes("todo")) return "Pending";

  return "In Progress";
};

const getContentStatus = (value?: string | null) => {
  const status = normalizeStatus(value);

  if (status.includes("generat")) return "Generating";
  if (status.includes("internal")) return "Internal Review";
  if (status.includes("ready")) return "Ready for Client Review";
  if (status.includes("client") || status.includes("review")) {
    return "Sent to Client for Review";
  }
  if (status.includes("complete") || status.includes("publish")) {
    return "Completed";
  }

  return "Draft";
};

const getContentChartLabel = (label: string) => {
  if (label === "Internal Review") return ["Internal", "Review"];
  if (label === "Ready for Client Review") {
    return ["Ready for", "Client Review"];
  }
  if (label === "Sent to Client for Review") {
    return ["Sent to Client", "for Review"];
  }

  return label;
};

const CardShell = ({
  children,
  className = "",
  right,
  title,
}: {
  children: ReactNode;
  className?: string;
  right?: ReactNode;
  title: string;
}) => (
  <Card
    className={`analytics-card rounded-lg border border-[#E3E7EF] shadow-none ${className}`}
  >
    <CardHeader className="flex items-center justify-between border-b border-[#E3E7EF] px-5 py-4">
      <h2 className="text-lg font-semibold text-[#1F2937]">{title}</h2>
      {right}
    </CardHeader>
    <CardBody className="p-5">{children}</CardBody>
  </Card>
);

const ProgressBar = ({
  color = "#0B2F8A",
  value,
}: {
  color?: string;
  value: number;
}) => (
  <div className="h-3 min-w-[112px] flex-1 overflow-hidden rounded-full bg-[#EEF2FF]">
    <div
      className="h-full rounded-full"
      style={{ backgroundColor: color, width: `${Math.min(100, value)}%` }}
    />
  </div>
);

const Donut = ({
  center,
  segments,
  size = 184,
}: {
  center: React.ReactNode;
  segments: Array<{ color: string; value: number }>;
  size?: number;
}) => {
  let start = 0;
  const stops = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const end = start + segment.value;
      const stop = `${segment.color} ${start}% ${end}%`;

      start = end;

      return stop;
    })
    .join(", ");

  return (
    <div
      className="grid place-items-center rounded-full"
      style={{
        background: `conic-gradient(${stops || "#E5E7EB 0% 100%"})`,
        height: size,
        width: size,
      }}
    >
      <div
        className="grid place-items-center rounded-full bg-white text-center"
        style={{ height: size * 0.76, width: size * 0.76 }}
      >
        {center}
      </div>
    </div>
  );
};

const Gauge = ({ value }: { value: number }) => (
  <div className="relative mx-auto grid aspect-[2/1] w-full max-w-[420px] place-items-center">
    <svg className="h-full w-full" viewBox="0 0 320 160">
      <path
        d="M 30 145 A 130 130 0 0 1 290 145"
        fill="none"
        stroke="#EEF2FF"
        strokeLinecap="round"
        strokeWidth="15"
      />
      <path
        d="M 30 145 A 130 130 0 0 1 290 145"
        fill="none"
        pathLength="100"
        stroke="#07A36D"
        strokeDasharray={`${Math.max(0, Math.min(100, value))} 100`}
        strokeLinecap="round"
        strokeWidth="15"
      />
    </svg>
    <div className="absolute inset-x-0 bottom-[8%] text-center text-5xl font-semibold leading-none text-[#111827]">
      {value}%
    </div>
  </div>
);

const WebsiteContentChart = ({
  rows,
}: {
  rows: Array<{ label: string; value: number }>;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const chart = new Chart<"bar", number[], string | string[]>(
      canvasRef.current,
      {
        data: {
          datasets: [
            {
              backgroundColor: CONTENT_STATUS_COLORS,
              borderRadius: {
                topLeft: 8,
                topRight: 8,
              },
              data: rows.map((row) => row.value),
              maxBarThickness: 34,
              type: "bar",
            },
          ],
          labels: rows.map((row) => getContentChartLabel(row.label)),
        },
        options: {
          animation: false,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `${context.label}: ${context.parsed.y}`,
              },
            },
          },
          responsive: true,
          scales: {
            x: {
              border: { color: "#C9CED8" },
              grid: {
                color: "#EEF2F6",
                drawTicks: false,
                tickBorderDash: [4, 4],
              },
              ticks: {
                color: "#6B7280",
                font: { size: 12 },
                maxRotation: 0,
                minRotation: 0,
              },
            },
            y: {
              border: { color: "#C9CED8" },
              grid: {
                color: "#E3E7EF",
                drawTicks: false,
                tickBorderDash: [4, 4],
              },
              max: CONTENT_CHART_MAX,
              min: 0,
              ticks: {
                color: "#6B7280",
                font: { size: 12 },
                stepSize: 45,
              },
            },
          },
        },
        type: "bar",
      },
    );

    return () => {
      chart.destroy();
    };
  }, [rows]);

  return (
    <div className="h-[260px] min-w-[520px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

const GbpPostingStatusChart = ({
  rows,
  total,
}: {
  rows: StatusCount[];
  total: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const values = rows.map((row) => row.value);
    const hasValues = values.some((value) => value > 0);
    const chart = new Chart<"doughnut", number[], string>(canvasRef.current, {
      data: {
        datasets: [
          {
            backgroundColor: hasValues
              ? rows.map((row) => row.color)
              : ["#E5E7EB"],
            borderColor: "#FFFFFF",
            borderRadius: 10,
            borderWidth: 8,
            data: hasValues ? values : [1],
            spacing: 2,
          },
        ],
        labels: hasValues ? rows.map((row) => row.label) : ["No posts"],
      },
      options: {
        animation: false,
        maintainAspectRatio: false,
        circumference: 360,
        cutout: "66%",
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        responsive: true,
        rotation: -120,
      },
      type: "doughnut",
    });

    return () => {
      chart.destroy();
    };
  }, [rows]);

  return (
    <div className="relative mx-auto h-[180px] w-[180px]">
      <canvas ref={canvasRef} />
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-semibold leading-none text-[#1F2937]">
            {total}
          </p>
          <p className="mt-2 text-sm text-[#98A2B3]">Total Post</p>
        </div>
      </div>
    </div>
  );
};

const ReviewEngagementChart = ({
  highlightIndex,
  rows,
}: {
  highlightIndex: number;
  rows: ReviewTrendPoint[];
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const context = canvasRef.current.getContext("2d");

    if (!context) {
      return;
    }

    const gradient = context.createLinearGradient(0, 0, 0, 260);

    gradient.addColorStop(0, "rgba(11, 47, 138, 0.18)");
    gradient.addColorStop(1, "rgba(11, 47, 138, 0)");

    const visibleValues = rows
      .map((row) => row.value)
      .filter((value): value is number => typeof value === "number");
    const maxValue = Math.max(60, ...visibleValues);
    const verticalMarker = {
      afterDatasetsDraw: (chart: Chart) => {
        const meta = chart.getDatasetMeta(0);
        const point =
          rows[highlightIndex]?.value === null
            ? null
            : meta.data[highlightIndex];

        if (!point) {
          return;
        }

        const { ctx, chartArea } = chart;
        const { x, y } = point.getProps(["x", "y"], true);

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#0B2F8A";
        ctx.moveTo(x, y + 16);
        ctx.lineTo(x, chartArea.bottom - 10);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.fillStyle = "rgba(11, 47, 138, 0.12)";
        ctx.arc(x, y, 23, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = "#FFFFFF";
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#0B2F8A";
        ctx.stroke();
        ctx.restore();
      },
      id: "reviewEngagementMarker",
    };

    const chart = new Chart<"line", Array<number | null>, string>(
      canvasRef.current,
      {
        data: {
          datasets: [
            {
              backgroundColor: gradient,
              borderColor: "#0B2F8A",
              borderWidth: 2,
              data: rows.map((row) => row.value),
              fill: true,
              pointRadius: 0,
              tension: 0.38,
            },
            {
              borderColor: "rgba(70, 115, 255, 0.28)",
              borderWidth: 2,
              data: rows.map((row, index) =>
                row.value === null
                  ? null
                  : Math.max(0, row.value - Math.max(2, 5 - index)),
              ),
              pointRadius: 0,
              tension: 0.38,
            },
          ],
          labels: rows.map((row) => row.label),
        },
        options: {
          animation: false,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
          },
          responsive: true,
          scales: {
            x: {
              border: { display: false },
              grid: { display: false, drawTicks: false },
              ticks: {
                color: "#697386",
                font: { size: 14 },
                padding: 18,
              },
            },
            y: {
              border: { display: false },
              grid: {
                color: "#D9DEE8",
                drawTicks: false,
                tickBorderDash: [6, 6],
              },
              max: Math.ceil(maxValue / 20) * 20,
              min: 0,
              ticks: {
                color: "#697386",
                font: { size: 14 },
                padding: 16,
                stepSize: 15,
              },
            },
          },
        },
        plugins: [verticalMarker],
        type: "line",
      },
    );

    return () => {
      chart.destroy();
    };
  }, [highlightIndex, rows]);

  return (
    <div className="h-[300px]">
      <canvas ref={canvasRef} />
    </div>
  );
};

export const ClientAnalyticsScreen = ({ clientId }: { clientId?: string }) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(
    null,
  );
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [contentLists, setContentLists] = useState<KeywordContentListRecord[]>(
    [],
  );
  const [breakdown, setBreakdown] = useState<ContentBreakdownItem[]>([]);
  const [postings, setPostings] = useState<ClientGbpPosting[]>([]);
  const [gbpDetails, setGbpDetails] = useState<ClientGbpDetails | null>(null);
  const [reviews, setReviews] = useState<ClientGbpReview[]>([]);
  const [citations, setCitations] = useState<ClientCitation[]>([]);
  const [rankings, setRankings] = useState<LocalRankingKeyword[]>([]);
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>(() =>
    getDefaultAnalyticsRange(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingReviews, setIsRefreshingReviews] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!clientId || !session?.accessToken) {
      setIsLoading(false);

      return;
    }

    setIsLoading(true);

    try {
      const accessToken = await getValidAccessToken();
      const [
        clientResult,
        projectsResult,
        tasksResult,
        contentResult,
        breakdownResult,
        postingsResult,
        gbpResult,
        reviewsResult,
        citationsResult,
        rankingsResult,
      ] = await Promise.allSettled([
        clientsApi.getClientById(accessToken, clientId),
        clientsApi.getClientProjects(accessToken, clientId, { limit: 100 }),
        clientsApi.getProjectTasks(accessToken, clientId),
        keywordContentListsApi.listKeywordContentLists(accessToken, {
          clientId,
        }),
        keywordContentListsApi.getClientContentBreakdown(accessToken, clientId),
        clientsApi.listClientGbpPostings(accessToken, clientId),
        clientsApi.getClientGbpDetails(accessToken, clientId),
        clientsApi.getClientGbpReviews(accessToken, clientId),
        clientsApi.getClientCitations(accessToken, clientId),
        scansApi.getClientLocalRankings(accessToken, clientId, {
          limit: 100,
          page: 1,
        }),
      ]);

      setClientDetails(
        clientResult.status === "fulfilled" ? clientResult.value : null,
      );
      setProjects(
        projectsResult.status === "fulfilled"
          ? projectsResult.value.projects
          : [],
      );
      setTasks(
        tasksResult.status === "fulfilled" ? tasksResult.value.tasks : [],
      );
      setContentLists(
        contentResult.status === "fulfilled"
          ? contentResult.value.keywordContentLists
          : [],
      );
      setBreakdown(
        breakdownResult.status === "fulfilled"
          ? breakdownResult.value.items
          : [],
      );
      setPostings(
        postingsResult.status === "fulfilled"
          ? postingsResult.value.postings
          : [],
      );
      setGbpDetails(gbpResult.status === "fulfilled" ? gbpResult.value : null);
      setReviews(
        reviewsResult.status === "fulfilled" ? reviewsResult.value.reviews : [],
      );
      setCitations(
        citationsResult.status === "fulfilled"
          ? citationsResult.value.citations
          : [],
      );
      setRankings(
        rankingsResult.status === "fulfilled"
          ? rankingsResult.value.keywords
          : [],
      );
    } catch (error) {
      toast.danger("Failed to load client activity overview.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [clientId, getValidAccessToken, session?.accessToken, toast]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleRefreshReviews = useCallback(async () => {
    if (!clientId || !session?.accessToken || isRefreshingReviews) {
      return;
    }

    setIsRefreshingReviews(true);

    try {
      const accessToken = await getValidAccessToken();
      const reviewsResponse = await clientsApi.getClientGbpReviews(
        accessToken,
        clientId,
        {
          forceRefresh: true,
        },
      );

      setReviews(reviewsResponse.reviews);
      toast.success("Review data refreshed.");
    } catch (error) {
      toast.danger("Failed to refresh review data.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsRefreshingReviews(false);
    }
  }, [
    clientId,
    getValidAccessToken,
    isRefreshingReviews,
    session?.accessToken,
    toast,
  ]);

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        getFirstDateInRange(
          dateRange,
          project.updatedAt,
          project.startDate,
          project.dueDate,
        ),
      ),
    [dateRange, projects],
  );
  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) =>
        getFirstDateInRange(
          dateRange,
          task.dueDate,
          task.updatedAt,
          task.startDate,
          task.createdAt,
        ),
      ),
    [dateRange, tasks],
  );
  const filteredContentLists = useMemo(
    () =>
      contentLists.filter((list) =>
        getFirstDateInRange(dateRange, list.updatedAt, list.createdAt),
      ),
    [contentLists, dateRange],
  );
  const filteredPostings = useMemo(
    () =>
      postings.filter((post) =>
        getFirstDateInRange(
          dateRange,
          post.publishedAt,
          post.scheduledAt,
          post.updatedAt,
          post.createdAt,
        ),
      ),
    [dateRange, postings],
  );
  const filteredReviews = useMemo(
    () =>
      reviews.filter((review) =>
        isDateInAnalyticsRange(review.date, dateRange),
      ),
    [dateRange, reviews],
  );
  const filteredCitations = useMemo(
    () =>
      citations.filter((citation) =>
        getFirstDateInRange(dateRange, citation.createdAt, citation.updatedAt),
      ),
    [citations, dateRange],
  );
  const filteredRankings = useMemo(
    () =>
      rankings.filter((ranking) =>
        getFirstDateInRange(dateRange, ranking.dateOfScan, ranking.dateAdded),
      ),
    [dateRange, rankings],
  );

  const contentStatusCounts = useMemo(() => {
    const keywords = filteredContentLists.flatMap(
      (list) => list.keywords ?? [],
    );

    return CONTENT_STATUS_LABELS.map((label) => ({
      label,
      value: keywords.filter(
        (keyword) => getContentStatus(keyword.status) === label,
      ).length,
    }));
  }, [filteredContentLists]);
  const profileCompletion = useMemo(
    () => getProfileCompletionSummary(clientDetails),
    [clientDetails],
  );
  const overdueTasks = filteredTasks.filter((task) => {
    if (!task.dueDate || normalizeStatus(task.status).includes("complete")) {
      return false;
    }

    return new Date(task.dueDate).getTime() < Date.now();
  }).length;
  const upcomingTasks = filteredTasks
    .filter((task) => {
      if (!task.dueDate || normalizeStatus(task.status).includes("complete")) {
        return false;
      }

      const due = new Date(task.dueDate).getTime();
      const now = Date.now();

      return due >= now && due <= now + 7 * 24 * 60 * 60 * 1000;
    })
    .sort(
      (left, right) =>
        new Date(left.dueDate ?? "").getTime() -
        new Date(right.dueDate ?? "").getTime(),
    );
  const projectRows: ProjectOverview[] = filteredProjects
    .slice(0, 5)
    .map((project) => ({
      completed: 0,
      name: project.project || "Untitled Project",
      progress: parseProgress(project.progress),
      status: getProjectStatus(project),
    }));
  const overallProgress = projectRows.length
    ? Math.round(
        projectRows.reduce((sum, project) => sum + project.progress, 0) /
          projectRows.length,
      )
    : 0;
  const filteredContentKeywords = filteredContentLists.flatMap(
    (list) => list.keywords ?? [],
  );
  const contentBreakdownRows = (
    breakdown.length > 0 ? breakdown : DEFAULT_CONTENT_BREAKDOWN
  ).map((item) => {
    const key = `${item.key} ${item.label}`.toLowerCase();
    const used = filteredContentKeywords.filter((keyword) => {
      const contentType = normalizeStatus(keyword.contentType);

      if (key.includes("treatment")) return contentType.includes("treatment");
      if (key.includes("condition")) return contentType.includes("condition");
      if (key.includes("blog")) return contentType.includes("blog");
      if (key.includes("press")) return contentType.includes("press");
      if (key.includes("homepage")) return contentType.includes("home");

      return contentType === normalizeStatus(item.label);
    }).length;

    return { ...item, used };
  });
  const postingCounts: StatusCount[] = [
    { color: "#0FAA6E", label: "Published", value: 0 },
    { color: "#FF922E", label: "Scheduled", value: 0 },
    { color: "#2FAABC", label: "Draft", value: 0 },
    { color: "#98A2B3", label: "Failed", value: 0 },
  ].map((row) => ({
    ...row,
    value: filteredPostings.filter((post) =>
      normalizeStatus(post.status).includes(row.label.toLowerCase()),
    ).length,
  }));
  const totalPosts = filteredPostings.length;
  const totalPostDenominator = Math.max(totalPosts, 1);
  const reviewCount = filteredReviews.length;
  const filteredReviewRatings = filteredReviews
    .map((review) => review.rating)
    .filter((rating) => Number.isFinite(rating) && rating > 0);
  const ratingValue = filteredReviewRatings.length
    ? filteredReviewRatings.reduce((sum, value) => sum + value, 0) /
      filteredReviewRatings.length
    : getRatingNumber(gbpDetails?.rating);
  const rating = ratingValue !== null ? ratingValue.toFixed(1) : "-";
  const thisMonthReviews = getThisMonthReviewCount(filteredReviews);
  const reviewTrendRows = getReviewTrend(filteredReviews, reviewCount);
  const reviewHighlightIndex = Math.max(
    0,
    reviewTrendRows.findLastIndex((row) => row.value !== null),
  );
  const citationFound = filteredCitations.filter((citation) =>
    ["live", "found", "completed", "submitted"].some((status) =>
      normalizeStatus(citation.status).includes(status),
    ),
  ).length;
  const citationNotFound = filteredCitations.filter((citation) =>
    normalizeStatus(citation.status).includes("not"),
  ).length;
  const citationIncorrect = filteredCitations.filter((citation) =>
    Object.values(citation.verificationStatus ?? {}).some(
      (value) => value === "Incorrect",
    ),
  ).length;
  const totalCitations = filteredCitations.length;
  const citationScore = totalCitations
    ? Math.round((citationFound / totalCitations) * 100)
    : 0;
  const citationTone = getScoreTone(citationScore);
  const citationsThisMonthCount = citations.filter((citation) =>
    isDateInMonthOffset(citation.createdAt ?? citation.updatedAt),
  ).length;
  const citationsLastMonthCount = citations.filter((citation) =>
    isDateInMonthOffset(citation.createdAt ?? citation.updatedAt, -1),
  ).length;
  const citationMonthlyDelta =
    citationsThisMonthCount - citationsLastMonthCount;
  const citationMonthlyDeltaLabel =
    citationMonthlyDelta > 0
      ? `↗ ${citationMonthlyDelta} this month`
      : citationMonthlyDelta < 0
        ? `↘ ${Math.abs(citationMonthlyDelta)} this month`
        : "0 this month";
  const citationMonthlyDeltaClass =
    citationMonthlyDelta > 0
      ? "bg-emerald-50 text-emerald-600"
      : citationMonthlyDelta < 0
        ? "bg-red-50 text-red-600"
        : "bg-slate-100 text-slate-600";
  const top13 = filteredRankings.filter(
    (item) => typeof item.averageRank === "number" && item.averageRank <= 3,
  ).length;
  const top410 = filteredRankings.filter(
    (item) =>
      typeof item.averageRank === "number" &&
      item.averageRank > 3 &&
      item.averageRank <= 10,
  ).length;
  const top1120 = filteredRankings.filter(
    (item) =>
      typeof item.averageRank === "number" &&
      item.averageRank > 10 &&
      item.averageRank <= 20,
  ).length;
  const notRanking = Math.max(
    0,
    filteredRankings.length - top13 - top410 - top1120,
  );
  const latestRankingScanDates = Array.from(
    new Set(
      filteredRankings
        .map((item) => item.dateOfScan ?? item.dateAdded)
        .filter((value): value is string => Boolean(value)),
    ),
  )
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())
    .slice(0, 4)
    .map(formatShortMonthDate);
  const trackedKeywordRows = [
    ["Top 1-3", top13],
    ["Top 4 - 10", top410],
    ["Top 11 - 20", top1120],
    ["Not Ranking", notRanking],
  ].map(([label, value], index) => ({
    date: latestRankingScanDates[index] ?? "-",
    label,
    value,
  }));
  const dateRangeValue = {
    end: toDateValue(dateRange.end) ?? parseDate(dateRange.end),
    start: toDateValue(dateRange.start) ?? parseDate(dateRange.start),
  };
  const handleExportPdf = () => {
    const previousTitle = document.title;

    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    document.title = `Client Activity Overview ${dateRange.start} to ${dateRange.end}`;
    window.addEventListener("afterprint", restoreTitle);
    window.print();
    window.setTimeout(() => {
      restoreTitle();
    }, 10000);
  };

  return (
    <div className="analytics-report space-y-6 pb-8">
      <style>{`
        @media print {
          @page {
            margin: 16mm;
            size: A4 portrait;
          }

          html,
          body {
            background: #ffffff !important;
          }

          body * {
            visibility: hidden;
          }

          .analytics-report,
          .analytics-report * {
            visibility: visible;
          }

          .analytics-report {
            left: 0;
            position: absolute;
            top: 0;
            width: 100%;
          }

          .analytics-report-controls {
            display: none !important;
          }

          .analytics-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .analytics-card canvas {
            max-width: 100% !important;
          }
        }
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[#1F2937]">
          Client Activity Overview
        </h1>
        <div className="analytics-report-controls flex flex-wrap items-center gap-3">
          <DateRangePicker
            aria-label="Analytics date range"
            className="w-[320px]"
            radius="md"
            selectorIcon={<CalendarDays size={16} />}
            value={dateRangeValue}
            visibleMonths={2}
            onChange={(value) => {
              if (!value?.start || !value?.end) {
                return;
              }

              setDateRange({
                end: value.end.toString(),
                start: value.start.toString(),
              });
            }}
          />
          <Button
            className="bg-[#0B2F8A] text-white"
            isDisabled={isLoading}
            radius="md"
            startContent={<Download size={16} />}
            onPress={handleExportPdf}
          >
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.12fr]">
        <CardShell title="Onboarding Completion">
          <Gauge value={profileCompletion.percentage} />
          <div className="mt-5 grid grid-cols-2 gap-6 px-1">
            <div>
              <p className="text-2xl font-semibold text-[#07A36D]">
                {profileCompletion.completed} / {profileCompletion.total}
              </p>
              <p className="text-xs text-[#7B8494]">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#FF922E]">
                {String(profileCompletion.pending).padStart(2, "0")}
              </p>
              <p className="text-xs text-[#7B8494]">Pending</p>
            </div>
          </div>
        </CardShell>

        <CardShell title="Active Projects">
          <div className="mb-6 grid grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-semibold">
                {filteredProjects.length}
              </p>
              <p className="text-sm text-[#7B8494]">Total Projects</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{overallProgress}%</p>
              <p className="text-sm text-[#7B8494]">Overall Progress</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{overdueTasks}</p>
              <p className="text-sm text-[#7B8494]">Overdue</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {
                  filteredProjects.filter(
                    (project) => getProjectStatus(project) === "Completed",
                  ).length
                }
              </p>
              <p className="text-sm text-[#7B8494]">Completed</p>
            </div>
          </div>

          <div className="space-y-4 border-t border-[#E3E7EF] pt-6">
            {projectRows.map((project, index) => {
              const Icon = projectIcons[index % projectIcons.length];

              return (
                <div
                  key={`${project.name}-${index}`}
                  className="grid grid-cols-[minmax(0,1fr)_96px_minmax(120px,1fr)_44px] items-center gap-4"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="text-[#244AA8]" size={20} />
                    <span className="truncate font-medium text-[#1F2937]">
                      {project.name}
                    </span>
                  </div>
                  <Chip
                    className={statusPillClass[project.status]}
                    radius="full"
                    size="sm"
                  >
                    {project.status}
                  </Chip>
                  <ProgressBar value={project.progress} />
                  <span className="font-semibold text-[#1F2937]">
                    {project.progress}%
                  </span>
                </div>
              );
            })}
          </div>

          <Button
            as={Link}
            className="mt-5 px-0 text-[#0B2F8A]"
            href={`/dashboard/clients/${clientId}/projects`}
            variant="light"
          >
            View All Projects
          </Button>
        </CardShell>
      </div>

      <CardShell title="Upcoming Task">
        <div className="border-b border-[#E3E7EF] pb-6">
          <p className="text-2xl font-semibold text-[#1F2937]">
            {upcomingTasks.length}
          </p>
          <p className="text-sm text-[#FF922E]">Due in next 7 days</p>
        </div>
        <div className="space-y-5 pt-6">
          {upcomingTasks.slice(0, 5).map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-4 text-[#1F2937]"
            >
              <span className="font-medium">{task.taskName || task.task}</span>
              <span className="font-semibold">{formatDate(task.dueDate)}</span>
            </div>
          ))}
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-[#7B8494]">No tasks due this week.</p>
          ) : null}
        </div>
        <Button
          as={Link}
          className="mt-5 px-0 text-[#0B2F8A]"
          href={`/dashboard/clients/${clientId}/task-lists`}
          variant="light"
        >
          View All Tasks
        </Button>
      </CardShell>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.8fr]">
        <CardShell title="Website Content">
          <div className="overflow-x-auto">
            <WebsiteContentChart
              key={`${dateRange.start}-${dateRange.end}-${contentStatusCounts
                .map((item) => item.value)
                .join("-")}`}
              rows={contentStatusCounts}
            />
          </div>
        </CardShell>

        <CardShell title="Website Content Breakdown">
          <div className="space-y-6">
            {contentBreakdownRows.map((item) => {
              const allocated = Math.max(1, item.allocated);
              const percent = Math.min(100, (item.used / allocated) * 100);

              return (
                <div
                  key={item.key}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(110px,1fr)_56px] items-center gap-4"
                >
                  <span className="font-medium text-[#1F2937]">
                    {item.label}
                  </span>
                  <ProgressBar value={percent} />
                  <span className="font-semibold text-[#1F2937]">
                    {item.used}/{item.allocated}
                  </span>
                </div>
              );
            })}
          </div>
          <Button
            as={Link}
            className="mt-6 px-0 text-[#0B2F8A]"
            href={`/dashboard/clients/${clientId}/website-content`}
            variant="light"
          >
            Manage Content
          </Button>
        </CardShell>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CardShell title="GBP Posting Status">
          <div className="space-y-6">
            <GbpPostingStatusChart rows={postingCounts} total={totalPosts} />
            <div className="space-y-4">
              {postingCounts.map((item) => {
                const percent = Math.round(
                  (item.value / totalPostDenominator) * 100,
                );

                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 px-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-4 w-4 rounded-md"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-[#1F2937]">
                        {item.label}
                      </span>
                    </div>
                    <span className="font-semibold text-[#1F2937]">
                      {item.value} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardShell>

        <CardShell
          right={
            <Button
              isIconOnly
              aria-label="Refresh reviews"
              isDisabled={isLoading}
              isLoading={isRefreshingReviews}
              radius="full"
              size="sm"
              variant="light"
              onPress={handleRefreshReviews}
            >
              <RefreshCw size={18} />
            </Button>
          }
          title="Review Engagement"
        >
          <div className="grid gap-8 md:grid-cols-[1fr_1px_1fr] md:items-center">
            <div>
              <div className="flex items-center gap-5">
                <p className="text-4xl font-semibold leading-none text-[#111827]">
                  {rating}
                </p>
                <div>
                  <div className="flex items-center gap-1 text-[#F5AA00]">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={`review-star-${index}`}
                        fill="currentColor"
                        size={22}
                        strokeWidth={0}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[#697386]">Average Rating</p>
                </div>
              </div>
            </div>
            <div className="hidden h-[110px] w-px bg-[#E3E7EF] md:block" />
            <div>
              <p className="text-sm text-[#697386]">Total Reviews</p>
              <p className="mt-1 text-2xl font-semibold leading-none text-[#111827]">
                {reviewCount}
              </p>
              <Chip
                className="mt-1 bg-emerald-50 px-3 text-xs font-medium text-emerald-600"
                radius="full"
              >
                ↗ {thisMonthReviews} this month
              </Chip>
            </div>
          </div>
          <div className="mt-10">
            <ReviewEngagementChart
              key={`${reviewCount}-${reviewTrendRows
                .map((row) => row.value)
                .join("-")}`}
              highlightIndex={reviewHighlightIndex}
              rows={reviewTrendRows}
            />
          </div>
        </CardShell>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <CardShell title="Local Citations Status">
          <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
            <Donut
              center={
                <div>
                  <p
                    className="text-4xl font-semibold"
                    style={{ color: citationTone.text }}
                  >
                    {citationScore}%
                  </p>
                  <p className="text-sm text-[#98A2B3]">{citationTone.label}</p>
                </div>
              }
              segments={[
                { color: citationTone.graph, value: citationScore },
                { color: "#E5E7EB", value: Math.max(0, 100 - citationScore) },
              ]}
              size={190}
            />
            <div className="space-y-4">
              {[
                ["Total Citations", totalCitations, "#1F2937"],
                ["Found", citationFound, "#07A36D"],
                ["Not Found", citationNotFound, "#FF922E"],
                ["Inconsistent", citationIncorrect, "#FF922E"],
              ].map(([label, value, color]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="font-medium text-[#1F2937]">{label}</span>
                  <span
                    className="font-semibold"
                    style={{ color: String(color) }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Button
              as={Link}
              className="px-0 text-[#0B2F8A]"
              href={`/dashboard/clients/${clientId}/local-citations`}
              variant="light"
            >
              View Citations
            </Button>
            <Chip className={citationMonthlyDeltaClass} size="sm">
              {citationMonthlyDeltaLabel}
            </Chip>
          </div>
        </CardShell>

        <CardShell title="Tracked Local Keywords">
          <p className="mb-8 text-2xl font-semibold text-[#1F2937]">
            {filteredRankings.length}
          </p>
          {trackedKeywordRows.map((row) => (
            <div
              key={String(row.label)}
              className="mb-5 flex items-center justify-between gap-4"
            >
              <span className="font-medium text-[#1F2937]">
                {row.label} ({row.value})
              </span>
              <span className="font-semibold text-[#1F2937]">{row.date}</span>
            </div>
          ))}
          <Button
            as={Link}
            className="mt-3 px-0 text-[#0B2F8A]"
            href={`/dashboard/clients/${clientId}/local-rankings`}
            variant="light"
          >
            View All Keywords
          </Button>
        </CardShell>
      </div>
    </div>
  );
};
