import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";
import { ClientTaskListsTable } from "@/components/dashboard/client-details/client-task-lists-table";

const ClientTaskListsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ projectId?: string; taskId?: string }>;
}) => {
  const { slug } = await params;
  const { projectId, taskId } = await searchParams;

  return (
    <section className="client-details-shell relative space-y-4">
      <ClientProfileAside activeKey="tasks" slug={slug} />
      <div className="pl-6">
        <ClientTaskListsTable
          clientId={slug}
          initialTaskId={taskId}
          projectId={projectId}
        />
      </div>
    </section>
  );
};

export default ClientTaskListsPage;
