import { Card, CardBody } from "@heroui/card";

import { ClientProfileAside } from "@/components/dashboard/client-details/client-profile-aside";

const ClientProjectsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  return (
    <section className="relative space-y-4 pl-64">
      <ClientProfileAside activeKey="projects" slug={slug} />
      <div className="pl-6">
        <Card
          className="rounded-xl border border-default-200 bg-white"
          shadow="none"
        >
          <CardBody className="px-4 py-3">
            <h3 className="text-base font-semibold text-[#111827]">Projects</h3>
          </CardBody>
        </Card>
      </div>
    </section>
  );
};

export default ClientProjectsPage;
