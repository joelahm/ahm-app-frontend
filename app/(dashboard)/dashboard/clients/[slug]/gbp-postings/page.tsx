import { ClientGbpPostingsTable } from "@/components/dashboard/client-details/client-gbp-postings-table";
import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";

const ClientGbpPostingsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ postId?: string }>;
}) => {
  const { slug } = await params;
  const { postId } = await searchParams;

  return (
    <section className="client-details-shell relative space-y-4">
      <ClientProfileAside activeKey="gbp-posting" slug={slug} />
      <div className="pl-6">
        <ClientGbpPostingsTable clientId={slug} openPostId={postId ?? null} />
      </div>
    </section>
  );
};

export default ClientGbpPostingsPage;
