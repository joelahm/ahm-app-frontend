import { ClientGbpProfile } from "@/components/dashboard/client-details/client-gbp-profile";
import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";

const GBPPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;

  return (
    <section className="client-details-shell relative space-y-4">
      <ClientProfileAside activeKey="gbp" slug={slug} />
      <div className="pl-6">
        <ClientGbpProfile clientId={slug} />
      </div>
    </section>
  );
};

export default GBPPage;
