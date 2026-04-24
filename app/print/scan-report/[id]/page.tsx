import { PrintScanReportScreen } from "@/components/dashboard/print-scan-report-screen";

export default async function PrintScanReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PrintScanReportScreen scanId={id} />;
}
