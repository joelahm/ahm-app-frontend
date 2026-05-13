import { GbpPostingReviewScreen } from "@/components/public/gbp-posting-review-screen";

const GbpPostingReviewPage = async ({
  params,
}: {
  params: Promise<{ token: string }>;
}) => {
  const { token } = await params;

  return <GbpPostingReviewScreen token={token} />;
};

export default GbpPostingReviewPage;
