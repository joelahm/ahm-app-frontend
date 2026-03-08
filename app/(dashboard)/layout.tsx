import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <section className="flex min-h-screen bg-default-50">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar subtitle="Clients" title="Welcome back, Sahara!" />
          <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
        </div>
      </section>
    </ProtectedRoute>
  );
}
