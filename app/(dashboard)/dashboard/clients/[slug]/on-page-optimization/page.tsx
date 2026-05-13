import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";
import { OnPageOptimizationScreen } from "@/components/dashboard/client-details/on-page-optimization-screen";

const OnPageOptimizationPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  return (
    <section className="client-details-shell relative min-h-[calc(100vh-96px)]">
      <ClientProfileAside activeKey="on-page-optimization" slug={slug} />
      <OnPageOptimizationScreen clientId={slug} />
    </section>
  );
};

export default OnPageOptimizationPage;
