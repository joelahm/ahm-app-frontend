import { ClientLocalRankingsTable } from "@/components/dashboard/client-details/client-local-rankings-table";
import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";

const ClientLocalRankingsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  return (
    <section className="relative space-y-4 pl-64">
      <ClientProfileAside activeKey="local-rankings" slug={slug} />
      <div className="pl-6">
        <ClientLocalRankingsTable clientId={slug} />
      </div>
    </section>
  );
};

export default ClientLocalRankingsPage;
