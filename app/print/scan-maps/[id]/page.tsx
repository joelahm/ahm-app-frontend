import { PrintScanMapsScreen } from "@/components/dashboard/print-scan-maps-screen";

export default async function PrintScanMapsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PrintScanMapsScreen scanId={id} />;
}
