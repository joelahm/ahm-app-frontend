import { ClientLocalRankingDetailsScreen } from "@/components/dashboard/client-details/client-local-ranking-details-screen";

const LocalRankingsPage = async ({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) => {
  const { id, slug } = await params;

  return <ClientLocalRankingDetailsScreen clientId={slug} rankingId={id} />;
};

export default LocalRankingsPage;
