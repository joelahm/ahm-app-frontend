import { QuickScanDetailsScreen } from "@/components/dashboard/quick-scan-details-screen";

export default async function QuickScanDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <QuickScanDetailsScreen scanId={id} />;
}
