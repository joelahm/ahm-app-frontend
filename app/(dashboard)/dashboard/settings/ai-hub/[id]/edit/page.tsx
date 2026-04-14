import { SettingsAIPromptEditorContent } from "@/components/dashboard/settings/settings-ai-prompt-editor-content";
import { SettingsAdminOnlyGuard } from "@/components/dashboard/settings/settings-admin-only-guard";

interface SettingsAIHubEditPromptPageProps {
  params: Promise<{
    id: string;
  }>;
}

const SettingsAIHubEditPromptPage = async ({
  params,
}: SettingsAIHubEditPromptPageProps) => {
  const { id } = await params;

  return (
    <section>
      <SettingsAdminOnlyGuard />
      <div className="pl-6">
        <SettingsAIPromptEditorContent mode="edit" promptId={id} />
      </div>
    </section>
  );
};

export default SettingsAIHubEditPromptPage;
