import { SchemaGeneratorScreen } from "@/components/dashboard/schema-generator/schema-generator-screen";

interface EditSchemaPageProps {
  params: Promise<{
    id: string;
  }>;
}

const EditSchemaPage = async ({ params }: EditSchemaPageProps) => {
  const { id } = await params;

  return <SchemaGeneratorScreen mode="edit" schemaId={id} />;
};

export default EditSchemaPage;
