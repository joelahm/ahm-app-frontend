import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";
import { ClientTaskListsTable } from "@/components/dashboard/client-details/client-task-lists-table";

const ClientTaskListsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ projectId?: string }>;
}) => {
  const { slug } = await params;
  const { projectId } = await searchParams;

  return (
    <section className="relative space-y-4 pl-64">
      <ClientProfileAside activeKey="tasks" slug={slug} />
      <div className="pl-6">
        <ClientTaskListsTable clientId={slug} projectId={projectId} />
      </div>
    </section>
  );
};

export default ClientTaskListsPage;
