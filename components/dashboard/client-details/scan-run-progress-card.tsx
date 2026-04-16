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
  keywordsInProgress?: number;
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
  latestProgress: _latestProgress,
  progressPercent,
  runId,
  scanId,
  startedRun: _startedRun,
  keywordsInProgress = 1,
  onDismiss,
}: ScanRunProgressCardProps) => {
  const isCompleted = !!completedRun;
  const isFailed = !!failedRun;

  return (
    <Card className="mb-4 border border-default-200 shadow-none">
      <CardHeader className="flex items-start justify-between gap-3 border-b border-default-200">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="text-success" size={18} />
            ) : isFailed ? (
              <XCircle className="text-danger" size={18} />
            ) : (
              <LoaderCircle className="animate-spin text-[#022279]" size={18} />
            )}
            <p className="text-sm font-semibold text-[#111827]">
              Scan run progress
            </p>
            <p className="text-xs text-default-500">
              Scan #{scanId} · Run #{runId}
            </p>
            <p className="text-xs font-medium text-[#022279]">
              {keywordsInProgress} keyword
              {keywordsInProgress === 1 ? "" : "s"} in progress
            </p>
          </div>
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
      <CardBody className="space-y-3 p-4">
        <Progress
          showValueLabel
          aria-label="Scan progress details"
          classNames={{
            indicator: isCompleted
              ? "bg-success"
              : isFailed
                ? "bg-danger"
                : "bg-[#022279]",
            label: "hidden",
            track: "h-3 bg-default-100",
            value: "text-sm text-default-500",
          }}
          radius="sm"
          value={progressPercent}
        />
      </CardBody>
    </Card>
  );
};
