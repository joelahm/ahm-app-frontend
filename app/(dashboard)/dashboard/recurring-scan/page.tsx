import { ScansListScreen } from "@/components/dashboard/scans-list-screen";

export default function RecurringScanPage() {
  return (
    <ScansListScreen scope="QUICK" title="Recurring Scan" view="recurring" />
  );
}
