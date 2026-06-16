import { ClientFieldsForm } from "@/components/dashboard/client-details/client-fields-form";
import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";

const ClientFieldsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  return (
    <section className="client-details-shell relative space-y-4">
      <ClientProfileAside activeKey="client-fields" slug={slug} />
      <div className="pl-6">
        <ClientFieldsForm />
      </div>
    </section>
  );
};

export default ClientFieldsPage;
