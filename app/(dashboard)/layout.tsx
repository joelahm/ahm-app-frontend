import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const ensureAuthenticated = async () => {
  if (!API_BASE_URL) {
    redirect("/login");
  }

  const cookieHeader = (await headers()).get("cookie") ?? "";
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    cache: "no-store",
    headers: {
      cookie: cookieHeader,
    },
  });

  if (!response.ok) {
    redirect("/login");
  }
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureAuthenticated();

  return (
    <section className="flex min-h-screen bg-default-50">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar subtitle="Clients" title="Welcome back, Sahara!" />
        <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
      </div>
    </section>
  );
}
