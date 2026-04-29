import { WebsiteContentReviewScreen } from "@/components/public/website-content-review-screen";

const WebsiteContentReviewPage = async ({
  params,
}: {
  params: Promise<{ token: string }>;
}) => {
  const { token } = await params;

  return <WebsiteContentReviewScreen token={token} />;
};

export default WebsiteContentReviewPage;
