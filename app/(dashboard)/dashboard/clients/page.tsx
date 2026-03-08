import { SlidersHorizontal, Form, Columns3, Plus } from "lucide-react";

import { ClientListTable } from "@/components/dashboard/client-list-table";

const ClientsPage = () => {
  return (
    <ClientListTable
      headerActions={[
        {
          key: "filter",
          label: "Filter",
          startContent: <SlidersHorizontal size={14} />,
        },
        { key: "show", label: "Show 10", startContent: <Form size={14} /> },
        {
          key: "columns",
          label: "Columns",
          startContent: <Columns3 size={14} />,
        },
        {
          key: "add-client",
          label: "Add Client",
          color: "primary",
          variant: "solid",
          startContent: <Plus size={14} />,
        },
      ]}
      title="Client List"
    />
  );
};

export default ClientsPage;
