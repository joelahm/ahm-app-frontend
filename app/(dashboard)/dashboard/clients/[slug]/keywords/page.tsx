import { ClientKeywordsTable } from "@/components/dashboard/client-details/client-keywords-table";
import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";

const ClientKeywordsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  return (
    <section className="client-details-shell relative space-y-4">
      <ClientProfileAside activeKey="keywords" slug={slug} />
      <div className="pl-6">
        <ClientKeywordsTable clientId={slug} />
      </div>
    </section>
  );
};

export default ClientKeywordsPage;
