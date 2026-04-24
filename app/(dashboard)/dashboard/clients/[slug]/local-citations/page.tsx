import { ClientLocalCitationsTable } from "@/components/dashboard/client-details/client-local-citations-table";
import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";

const ClientLocalCitationsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  return (
    <section className="client-details-shell relative space-y-4">
      <ClientProfileAside activeKey="citations" slug={slug} />
      <div className="pl-6">
        <ClientLocalCitationsTable clientId={slug} />
      </div>
    </section>
  );
};

export default ClientLocalCitationsPage;
