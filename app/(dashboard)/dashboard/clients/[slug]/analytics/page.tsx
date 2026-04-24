import { ClientAnalyticsScreen } from "@/components/dashboard/client-details/client-analytics-screen";
import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";

const ClientAnalyticsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  return (
    <section className="client-details-shell relative space-y-4">
      <ClientProfileAside activeKey="analytics" slug={slug} />
      <div className="pl-6">
        <ClientAnalyticsScreen clientId={slug} />
      </div>
    </section>
  );
};

export default ClientAnalyticsPage;
