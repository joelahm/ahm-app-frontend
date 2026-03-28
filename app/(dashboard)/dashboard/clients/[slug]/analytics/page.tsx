import { ClientAnalyticsScreen } from "@/components/dashboard/client-details/client-analytics-screen";
import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";

const ClientAnalyticsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  return (
    <section className="relative space-y-4 pl-64">
      <ClientProfileAside activeKey="analytics" slug={slug} />
      <div className="pl-6">
        <ClientAnalyticsScreen />
      </div>
    </section>
  );
};

export default ClientAnalyticsPage;
