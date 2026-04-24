import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";
import { ClientProjectsTable } from "@/components/dashboard/client-details/client-projects-table";

const ClientProjectsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ openProjectId?: string }>;
}) => {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const openProjectId = resolvedSearchParams?.openProjectId ?? null;

  return (
    <section className="client-details-shell relative space-y-4">
      <ClientProfileAside activeKey="projects" slug={slug} />
      <div className="pl-6">
        <ClientProjectsTable clientId={slug} openProjectId={openProjectId} />
      </div>
    </section>
  );
};

export default ClientProjectsPage;
