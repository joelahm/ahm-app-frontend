import { Card, CardBody, CardHeader } from "@heroui/card";

const DashboardPage = () => {
  return (
    <Card className="border border-default-200 shadow-none">
      <CardHeader>
        <h2 className="text-xl font-semibold">Dashboard Overview</h2>
      </CardHeader>
      <CardBody>
        <p className="text-default-600">
          Use the sidebar to navigate to clients, scans, and settings.
        </p>
      </CardBody>
    </Card>
  );
};

export default DashboardPage;
