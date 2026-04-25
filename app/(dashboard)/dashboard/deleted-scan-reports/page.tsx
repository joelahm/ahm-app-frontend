import { ScansListScreen } from "@/components/dashboard/scans-list-screen";

export default function DeletedScanReportsPage() {
  return (
    <ScansListScreen
      scope="QUICK"
      title="Deleted Scan Reports"
      view="deleted"
    />
  );
}
