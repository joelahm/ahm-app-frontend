import { ClientDetailsScreen } from "@/components/dashboard/client-details/client-details-screen";

interface ClientSinglePageProps {
  params: Promise<{
    slug: string;
  }>;
}

const ClientSinglePage = async ({ params }: ClientSinglePageProps) => {
  const { slug } = await params;

  return <ClientDetailsScreen slug={slug} />;
};

export default ClientSinglePage;
