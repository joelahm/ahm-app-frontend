import { ClientReviewManagementScreen } from "@/components/dashboard/client-details/client-review-management-screen";
import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";

const ClientReviewManagementPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  return (
    <section className="client-details-shell relative space-y-4">
      <ClientProfileAside activeKey="reviews" slug={slug} />
      <div className="pl-6">
        <ClientReviewManagementScreen clientId={slug} />
      </div>
    </section>
  );
};

export default ClientReviewManagementPage;
