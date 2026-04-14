import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";
import { ClientWebsiteContentScreen } from "@/components/dashboard/client-details/client-website-content-screen";

const ClientWebsiteContentPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ projectId?: string }>;
}) => {
  const { slug } = await params;

  await searchParams;

  return (
    <section className="relative space-y-4 pl-64">
      <ClientProfileAside activeKey="content" slug={slug} />
      <div className="pl-6">
        <ClientWebsiteContentScreen clientId={slug} />
      </div>
    </section>
  );
};

export default ClientWebsiteContentPage;
