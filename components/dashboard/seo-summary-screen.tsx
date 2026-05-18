"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Alert } from "@heroui/alert";
import { RefreshCcw } from "lucide-react";

import { clientsApi, type ClientApiItem } from "@/apis/clients";
import {
  keywordContentListsApi,
  type KeywordContentListRecord,
  type SaveKeywordContentListKeyword,
} from "@/apis/keyword-content-lists";
import {
  onPageOptimizationsApi,
  type OnPageOptimizationRun,
} from "@/apis/on-page-optimizations";
import { useAuth } from "@/components/auth/auth-context";
import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { useAppToast } from "@/hooks/use-app-toast";

type SeoSummaryVariant = "web-content" | "on-page";

type SummaryStatus = "Healthy" | "Needs Attention" | "Blocked";

type WebContentSummaryRow = {
  accountManager: string;
  approved: number;
  clientId: string;
  clientName: string;
  contentTypeMix: string;
  draft: number;
  generated: number;
  inReview: number;
  lastGenerated: string;
  lastUpdated: string;
  missingContent: number;
  missingTitles: number;
  published: number;
  totalKeywords: number;
};

type OnPageSummaryRow = {
  accountManager: string;
  avgScore: string;
  clientId: string;
  clientName: string;
  failedIssues: number;
  inProgress: number;
  lastAudit: string;
  lastUpdated: string;
  missingH1: number;
  missingMetaDescription: number;
  missingMetaTitle: number;
  needsReview: number;
  notStarted: number;
  optimized: number;
  status: SummaryStatus;
  totalPages: number;
};

type SummaryRow = WebContentSummaryRow | OnPageSummaryRow;

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getClientName = (client: ClientApiItem) =>
  client.businessName || client.clientName || `Client ${client.id}`;

const getAccountManager = (client: ClientApiItem) =>
  client.assignedUserName ||
  client.assignedUserEmail ||
  client.clientSuccessManagerName ||
  "-";

const normalizeStatus = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

const isFilled = (value?: string | null) => Boolean(value?.trim());

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const getAuditPages = (run: OnPageOptimizationRun | null) => {
  const audit = isRecord(run?.result) ? run.result.audit : null;

  if (!isRecord(audit) || !Array.isArray(audit.pages)) {
    return [];
  }

  return audit.pages.filter(isRecord);
};

const hasPageIssue = (page: Record<string, unknown>) => {
  const seo = isRecord(page.seo) ? page.seo : null;
  const errors = Array.isArray(page.errors) ? page.errors : [];
  const flags = Array.isArray(seo?.flags) ? seo.flags : [];
  const onPageIssues = Array.isArray(seo?.onPageIssues) ? seo.onPageIssues : [];
  const headingIssues = Array.isArray(seo?.headingIssues)
    ? seo.headingIssues
    : [];

  return (
    errors.length > 0 ||
    flags.length > 0 ||
    onPageIssues.length > 0 ||
    headingIssues.length > 0 ||
    !isFilled(String(seo?.title ?? "")) ||
    !isFilled(String(seo?.metaDescription ?? "")) ||
    asNumber(seo?.h1Count) !== 1
  );
};

const summarizeContentTypeMix = (keywords: SaveKeywordContentListKeyword[]) => {
  const counts = new Map<string, number>();

  keywords.forEach((keyword) => {
    const type = keyword.contentType?.trim() || "Unassigned";

    counts.set(type, (counts.get(type) ?? 0) + 1);
  });

  const topTypes = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([type, count]) => `${type} ${count}`);

  return topTypes.length ? topTypes.join(", ") : "-";
};

const getOnPageStatus = (row: OnPageSummaryRow): SummaryStatus => {
  if (row.failedIssues > 0) {
    return "Blocked";
  }

  if (
    row.notStarted > 0 ||
    row.inProgress > 0 ||
    row.needsReview > 0 ||
    row.missingMetaTitle > 0 ||
    row.missingMetaDescription > 0 ||
    row.missingH1 > 0
  ) {
    return "Needs Attention";
  }

  return "Healthy";
};

const getLighthouseScoreChipClass = (score: string) => {
  const numericScore = Number.parseInt(score, 10);

  if (!Number.isFinite(numericScore)) {
    return "bg-[#FEE2E2] text-[#B91C1C]";
  }

  if (numericScore >= 90) {
    return "bg-[#DCFCE7] text-[#15803D]";
  }

  if (numericScore >= 50) {
    return "bg-[#FEF3C7] text-[#B45309]";
  }

  return "bg-[#FEE2E2] text-[#B91C1C]";
};

const statusSortRank: Record<SummaryStatus, number> = {
  Blocked: 0,
  "Needs Attention": 1,
  Healthy: 2,
};

const sortWebContentRows = (sourceRows: WebContentSummaryRow[]) =>
  [...sourceRows].sort((left, right) => {
    const leftGapScore =
      left.missingContent * 3 +
      left.missingTitles * 2 +
      left.draft +
      left.inReview +
      (left.totalKeywords === 0 ? 1000 : 0);
    const rightGapScore =
      right.missingContent * 3 +
      right.missingTitles * 2 +
      right.draft +
      right.inReview +
      (right.totalKeywords === 0 ? 1000 : 0);

    if (leftGapScore !== rightGapScore) {
      return rightGapScore - leftGapScore;
    }

    return left.clientName.localeCompare(right.clientName);
  });

const sortOnPageRows = (sourceRows: OnPageSummaryRow[]) =>
  [...sourceRows].sort((left, right) => {
    const statusDifference =
      statusSortRank[left.status] - statusSortRank[right.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const leftIssueScore =
      left.failedIssues * 4 +
      left.needsReview * 3 +
      left.missingMetaTitle * 2 +
      left.missingMetaDescription * 2 +
      left.missingH1 * 2 +
      left.notStarted +
      left.inProgress;
    const rightIssueScore =
      right.failedIssues * 4 +
      right.needsReview * 3 +
      right.missingMetaTitle * 2 +
      right.missingMetaDescription * 2 +
      right.missingH1 * 2 +
      right.notStarted +
      right.inProgress;

    if (leftIssueScore !== rightIssueScore) {
      return rightIssueScore - leftIssueScore;
    }

    return left.clientName.localeCompare(right.clientName);
  });

const buildWebContentRow = (
  client: ClientApiItem,
  lists: KeywordContentListRecord[],
): WebContentSummaryRow => {
  const keywords = lists.flatMap((list) => list.keywords ?? []);
  const generated = keywords.filter((keyword) =>
    isFilled(keyword.generatedContent),
  ).length;

  return {
    accountManager: getAccountManager(client),
    approved: keywords.filter(
      (keyword) => normalizeStatus(keyword.status) === "approved",
    ).length,
    clientId: String(client.id),
    clientName: getClientName(client),
    contentTypeMix: summarizeContentTypeMix(keywords),
    draft: keywords.filter(
      (keyword) => normalizeStatus(keyword.status) === "draft",
    ).length,
    generated,
    inReview: keywords.filter((keyword) =>
      normalizeStatus(keyword.status).includes("review"),
    ).length,
    lastGenerated: generated > 0 ? formatDateTime(lists[0]?.updatedAt) : "-",
    lastUpdated: formatDateTime(
      lists
        .map((list) => list.updatedAt)
        .sort(
          (left, right) => new Date(right).getTime() - new Date(left).getTime(),
        )
        .at(0),
    ),
    missingContent: keywords.filter(
      (keyword) => !isFilled(keyword.generatedContent),
    ).length,
    missingTitles: keywords.filter((keyword) => !isFilled(keyword.title))
      .length,
    published: keywords.filter((keyword) =>
      ["published", "completed", "complete"].includes(
        normalizeStatus(keyword.status),
      ),
    ).length,
    totalKeywords: keywords.length,
  };
};

const buildOnPageRow = (
  client: ClientApiItem,
  runs: OnPageOptimizationRun[],
): OnPageSummaryRow => {
  const sortedRuns = [...runs].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
  const latestRun = sortedRuns[0] ?? null;
  const pages = getAuditPages(latestRun);
  const totalPages =
    latestRun?.pagesAudited ?? (pages.length > 0 ? pages.length : 0);
  const runningRuns = runs.filter((run) =>
    ["PENDING", "RUNNING"].includes(run.status),
  ).length;
  const failedRuns = runs.filter((run) => run.status === "FAILED").length;
  const missingMetaTitle = pages.filter((page) => {
    const seo = isRecord(page.seo) ? page.seo : null;

    return !isFilled(String(seo?.title ?? ""));
  }).length;
  const missingMetaDescription = pages.filter((page) => {
    const seo = isRecord(page.seo) ? page.seo : null;

    return !isFilled(String(seo?.metaDescription ?? ""));
  }).length;
  const missingH1 = pages.filter((page) => {
    const seo = isRecord(page.seo) ? page.seo : null;

    return asNumber(seo?.h1Count) !== 1;
  }).length;
  const needsReview = pages.filter(hasPageIssue).length;
  const optimized = pages.length
    ? pages.filter((page) => !hasPageIssue(page)).length
    : latestRun?.status === "COMPLETED" && totalPages > 0
      ? totalPages
      : 0;
  const row: OnPageSummaryRow = {
    accountManager: getAccountManager(client),
    avgScore:
      typeof latestRun?.healthScore === "number"
        ? `${latestRun.healthScore}/100`
        : "-",
    clientId: String(client.id),
    clientName: getClientName(client),
    failedIssues:
      failedRuns +
      Number(latestRun?.highIssues ?? 0) +
      Number(latestRun?.mediumIssues ?? 0),
    inProgress: runningRuns,
    lastAudit: formatDateTime(latestRun?.completedAt ?? latestRun?.createdAt),
    lastUpdated: formatDateTime(latestRun?.updatedAt),
    missingH1,
    missingMetaDescription,
    missingMetaTitle,
    needsReview,
    notStarted: runs.length === 0 ? 1 : 0,
    optimized,
    status: "Needs Attention",
    totalPages,
  };

  return {
    ...row,
    status: getOnPageStatus(row),
  };
};

const StatCard = ({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) => (
  <Card className="rounded-lg border border-[#E5E7EB] shadow-none">
    <CardBody className="gap-1 px-4 py-3">
      <span className="text-xs font-medium text-[#6B7280]">{label}</span>
      <span className="text-2xl font-semibold text-[#111827]">{value}</span>
    </CardBody>
  </Card>
);

export const SeoSummaryScreen = ({
  variant,
}: {
  variant: SeoSummaryVariant;
}) => {
  const { getValidAccessToken, session } = useAuth();
  const toast = useAppToast();
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const isWebContent = variant === "web-content";

  const loadSummary = useCallback(async () => {
    if (!session?.accessToken) {
      setRows([]);
      setIsLoading(false);

      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const accessToken = await getValidAccessToken();
      const clients = await clientsApi.getClients(accessToken);

      if (isWebContent) {
        const response =
          await keywordContentListsApi.listKeywordContentLists(accessToken);
        const listsByClientId = new Map<string, KeywordContentListRecord[]>();

        response.keywordContentLists.forEach((list) => {
          const clientLists = listsByClientId.get(String(list.clientId)) ?? [];

          clientLists.push(list);
          listsByClientId.set(String(list.clientId), clientLists);
        });

        setRows(
          clients.map((client) =>
            buildWebContentRow(
              client,
              listsByClientId.get(String(client.id)) ?? [],
            ),
          ),
        );
      } else {
        const runResults = await Promise.allSettled(
          clients.map(async (client) => ({
            client,
            runs: await onPageOptimizationsApi.listRuns(accessToken, client.id),
          })),
        );

        setRows(
          runResults.map((result, index) => {
            if (result.status === "fulfilled") {
              return buildOnPageRow(result.value.client, result.value.runs);
            }

            return buildOnPageRow(clients[index], []);
          }),
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load SEO summary.";

      setErrorMessage(message);
      setRows([]);
      toast.danger("Failed to load SEO summary.", {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [getValidAccessToken, isWebContent, session?.accessToken, toast]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const stats = useMemo(() => {
    if (isWebContent) {
      const webRows = rows as WebContentSummaryRow[];

      return [
        { label: "Total Clients", value: webRows.length },
        {
          label: "Clients With Gaps",
          value: webRows.filter(
            (row) =>
              row.totalKeywords === 0 ||
              row.missingContent > 0 ||
              row.missingTitles > 0 ||
              row.inReview > 0 ||
              row.draft > 0,
          ).length,
        },
        {
          label: "Generated Contents",
          value: webRows.reduce((total, row) => total + row.generated, 0),
        },
        {
          label: "Missing Content",
          value: webRows.reduce((total, row) => total + row.missingContent, 0),
        },
      ];
    }

    const onPageRows = rows as OnPageSummaryRow[];

    return [
      { label: "Total Clients", value: onPageRows.length },
      {
        label: "Needs Attention",
        value: onPageRows.filter((row) => row.status !== "Healthy").length,
      },
      {
        label: "Pages Audited",
        value: onPageRows.reduce((total, row) => total + row.totalPages, 0),
      },
      {
        label: "Missing SEO Fields",
        value: onPageRows.reduce(
          (total, row) =>
            total +
            row.missingMetaTitle +
            row.missingMetaDescription +
            row.missingH1,
          0,
        ),
      },
    ];
  }, [isWebContent, rows]);

  const sortedRows = useMemo<SummaryRow[]>(() => {
    if (isWebContent) {
      return sortWebContentRows(rows as WebContentSummaryRow[]);
    }

    return sortOnPageRows(rows as OnPageSummaryRow[]);
  }, [isWebContent, rows]);

  const columns = useMemo<DashboardDataTableColumn<SummaryRow>[]>(() => {
    const baseColumns: DashboardDataTableColumn<SummaryRow>[] = [
      {
        key: "client",
        label: "Client",
        className: "min-w-[260px] bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (
          <div className="flex flex-col gap-1">
            <Link
              className="font-semibold text-[#022279]"
              href={`/dashboard/clients/${item.clientId}/${isWebContent ? "website-content" : "on-page-optimization"}`}
            >
              {item.clientName}
            </Link>
            <span className="text-xs text-[#6B7280]">
              {item.accountManager}
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (
          <Button
            as={Link}
            className="bg-[#022279] text-white"
            href={`/dashboard/clients/${item.clientId}/${isWebContent ? "website-content" : "on-page-optimization"}`}
            size="sm"
          >
            View
          </Button>
        ),
      },
    ];

    if (isWebContent) {
      return [
        baseColumns[0],
        {
          key: "totalKeywords",
          label: "Total Keywords",
          className: "bg-[#F9FAFB] text-[#111827]",
          renderCell: (item) => (item as WebContentSummaryRow).totalKeywords,
        },
        {
          key: "generated",
          label: "Generated",
          className: "bg-[#F9FAFB] text-[#111827]",
          renderCell: (item) => (item as WebContentSummaryRow).generated,
        },
        {
          key: "draft",
          label: "Draft",
          className: "bg-[#F9FAFB] text-[#111827]",
          renderCell: (item) => (item as WebContentSummaryRow).draft,
        },
        {
          key: "review",
          label: "In Review",
          className: "bg-[#F9FAFB] text-[#111827]",
          renderCell: (item) => (item as WebContentSummaryRow).inReview,
        },
        {
          key: "approved",
          label: "Approved",
          className: "bg-[#F9FAFB] text-[#111827]",
          renderCell: (item) => (item as WebContentSummaryRow).approved,
        },
        {
          key: "published",
          label: "Published",
          className: "bg-[#F9FAFB] text-[#111827]",
          renderCell: (item) => (item as WebContentSummaryRow).published,
        },
        {
          key: "missing",
          label: "Missing",
          className: "bg-[#F9FAFB] text-[#111827]",
          renderCell: (item) => {
            const row = item as WebContentSummaryRow;

            return `${row.missingTitles} titles / ${row.missingContent} content`;
          },
        },
        {
          key: "mix",
          label: "Content Type Mix",
          className: "bg-[#F9FAFB] text-[#111827]",
          renderCell: (item) => (item as WebContentSummaryRow).contentTypeMix,
        },
        {
          key: "updated",
          label: "Last Updated",
          className: "bg-[#F9FAFB] text-[#111827]",
          renderCell: (item) => (item as WebContentSummaryRow).lastUpdated,
        },
        baseColumns[1],
      ];
    }

    return [
      baseColumns[0],
      {
        key: "totalPages",
        label: "Total Pages",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (item as OnPageSummaryRow).totalPages,
      },
      {
        key: "optimized",
        label: "Optimized",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (item as OnPageSummaryRow).optimized,
      },
      {
        key: "progress",
        label: "In Progress",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (item as OnPageSummaryRow).inProgress,
      },
      {
        key: "review",
        label: "Needs Review",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (item as OnPageSummaryRow).needsReview,
      },
      {
        key: "failed",
        label: "Failed / Issues",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (item as OnPageSummaryRow).failedIssues,
      },
      {
        key: "missingTitle",
        label: "Missing Meta Title",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (item as OnPageSummaryRow).missingMetaTitle,
      },
      {
        key: "missingDescription",
        label: "Missing Meta Description",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (item as OnPageSummaryRow).missingMetaDescription,
      },
      {
        key: "missingH1",
        label: "Missing H1",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (item as OnPageSummaryRow).missingH1,
      },
      {
        key: "score",
        label: "Avg Score",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => {
          const row = item as OnPageSummaryRow;

          return (
            <Chip
              className={getLighthouseScoreChipClass(row.avgScore)}
              radius="full"
              size="sm"
            >
              {row.avgScore}
            </Chip>
          );
        },
      },
      {
        key: "audit",
        label: "Last Audit",
        className: "bg-[#F9FAFB] text-[#111827]",
        renderCell: (item) => (item as OnPageSummaryRow).lastAudit,
      },
      baseColumns[1],
    ];
  }, [isWebContent]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">
            {isWebContent
              ? "Web Content Summary"
              : "On Page Optimization Summary"}
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {isWebContent
              ? "Overview of client web content progress, gaps, and publishing status."
              : "Overview of client on-page audits, missing SEO fields, and issue status."}
          </p>
        </div>
        <Button
          startContent={<RefreshCcw size={16} />}
          variant="bordered"
          onPress={() => {
            void loadSummary();
          }}
        >
          Refresh
        </Button>
      </div>

      {errorMessage ? <Alert color="danger">{errorMessage}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <DashboardDataTable
        columns={columns}
        emptyContent="No client summary data found."
        getRowKey={(item) => item.clientId}
        isLoading={isLoading}
        loadingLabel="Loading SEO summary..."
        pageSize={10}
        rows={sortedRows}
        title={
          isWebContent
            ? "Web Content Client Overview"
            : "On Page Optimization Client Overview"
        }
      />
    </div>
  );
};
