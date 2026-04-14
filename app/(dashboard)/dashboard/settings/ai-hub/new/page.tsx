import { SettingsAdminOnlyGuard } from "@/components/dashboard/settings/settings-admin-only-guard";
import { SettingsAIPromptEditorContent } from "@/components/dashboard/settings/settings-ai-prompt-editor-content";

const SettingsAIHubPromptPage = () => {
  return (
    <section>
      <SettingsAdminOnlyGuard />
      <div className="pl-6">
        <SettingsAIPromptEditorContent />
      </div>
    </section>
  );
};

export default SettingsAIHubPromptPage;
