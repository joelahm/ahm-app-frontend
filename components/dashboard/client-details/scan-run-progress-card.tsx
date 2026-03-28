"use client";

import type {
  ScanRunCompletedEvent,
  ScanRunFailedEvent,
  ScanRunProgressEvent,
  ScanRunStartedEvent,
} from "@/lib/scan-socket-client";
import type { ScanSocketConnectionStatus } from "@/hooks/use-scan-run-socket";

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";
import { CheckCircle2, LoaderCircle, PlugZap, XCircle } from "lucide-react";

interface ScanRunProgressCardProps {
  completedRun: ScanRunCompletedEvent | null;
  connectionStatus: ScanSocketConnectionStatus;
  failedRun: ScanRunFailedEvent | null;
  latestProgress: ScanRunProgressEvent | null;
  progressPercent: number;
  runId: number;
  scanId: number;
  startedRun: ScanRunStartedEvent | null;
  onDismiss: () => void;
}

const statusColorMap: Record<
  ScanSocketConnectionStatus,
  "default" | "primary" | "danger" | "success" | "warning"
> = {
  connected: "success",
  connecting: "warning",
  disconnected: "default",
  error: "danger",
  idle: "default",
};

export const ScanRunProgressCard = ({
  completedRun,
  connectionStatus,
  failedRun,
  latestProgress,
  progressPercent,
  runId,
  scanId,
  startedRun,
  onDismiss,
}: ScanRunProgressCardProps) => {
  const totalRequests =
    completedRun?.run.totalRequests ??
    latestProgress?.totalRequests ??
    startedRun?.totalRequests ??
    0;
  const processedRequests =
    latestProgress?.processedRequests ??
    (completedRun
      ? completedRun.run.completedRequests + completedRun.run.failedRequests
      : 0);
  const isCompleted = !!completedRun;
  const isFailed = !!failedRun;

  return (
    <Card className="mt-4 border border-default-200 shadow-none">
      <CardHeader className="flex items-start justify-between gap-3 border-b border-default-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="text-success" size={18} />
            ) : isFailed ? (
              <XCircle className="text-danger" size={18} />
            ) : (
              <LoaderCircle className="animate-spin text-[#022279]" size={18} />
            )}
            <p className="text-sm font-semibold text-[#111827]">
              Scan Run Progress
            </p>
          </div>
          <p className="text-xs text-default-500">
            Scan #{scanId} · Run #{runId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip
            color={statusColorMap[connectionStatus]}
            radius="full"
            size="sm"
            startContent={<PlugZap size={12} />}
            variant="flat"
          >
            {connectionStatus}
          </Chip>
          <Button radius="sm" size="sm" variant="bordered" onPress={onDismiss}>
            Dismiss
          </Button>
        </div>
      </CardHeader>
      <CardBody className="space-y-4 p-4">
        <Progress
          showValueLabel
          aria-label="Scan progress"
          classNames={{
            indicator: isCompleted
              ? "bg-success"
              : isFailed
                ? "bg-danger"
                : "bg-[#022279]",
            label: "text-sm font-medium text-[#111827]",
            track: "h-3 bg-default-100",
            value: "text-sm text-default-500",
          }}
          label={
            isCompleted
              ? "Scan completed"
              : isFailed
                ? "Scan failed"
                : "Processing coverage requests"
          }
          radius="sm"
          value={progressPercent}
        />

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-default-50 p-3">
            <p className="text-xs text-default-500">Total Requests</p>
            <p className="text-lg font-semibold text-[#111827]">
              {totalRequests}
            </p>
          </div>
          <div className="rounded-lg bg-default-50 p-3">
            <p className="text-xs text-default-500">Processed</p>
            <p className="text-lg font-semibold text-[#111827]">
              {processedRequests}
            </p>
          </div>
          <div className="rounded-lg bg-default-50 p-3">
            <p className="text-xs text-default-500">Completed</p>
            <p className="text-lg font-semibold text-[#111827]">
              {completedRun?.run.completedRequests ??
                latestProgress?.completedRequests ??
                0}
            </p>
          </div>
          <div className="rounded-lg bg-default-50 p-3">
            <p className="text-xs text-default-500">Failed</p>
            <p className="text-lg font-semibold text-[#111827]">
              {completedRun?.run.failedRequests ??
                latestProgress?.failedRequests ??
                0}
            </p>
          </div>
        </div>

        {completedRun?.run.summary ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-default-200 p-3">
              <p className="text-xs text-default-500">Keywords</p>
              <p className="text-sm font-semibold text-[#111827]">
                {completedRun.run.summary.keywords ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-default-200 p-3">
              <p className="text-xs text-default-500">Coordinates</p>
              <p className="text-sm font-semibold text-[#111827]">
                {completedRun.run.summary.coordinates ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-default-200 p-3">
              <p className="text-xs text-default-500">Successful Checks</p>
              <p className="text-sm font-semibold text-[#111827]">
                {completedRun.run.summary.successfulChecks ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-default-200 p-3">
              <p className="text-xs text-default-500">Failed Checks</p>
              <p className="text-sm font-semibold text-[#111827]">
                {completedRun.run.summary.failedChecks ?? 0}
              </p>
            </div>
          </div>
        ) : null}

        {failedRun ? (
          <p className="text-sm text-danger">
            {failedRun.error.code}: {failedRun.error.message}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
};
