import { SettingsAside } from "@/components/dashboard/settings/settings-aside";
import { SettingsAdminOnlyGuard } from "@/components/dashboard/settings/settings-admin-only-guard";
import { SettingsAIHubContent } from "@/components/dashboard/settings/settings-ai-hub-content";

const SettingsAIHubPage = () => {
  return (
    <section className="relative pl-64">
      <SettingsAdminOnlyGuard />
      <SettingsAside activeKey="ai-hub" />
      <div className="pl-6">
        <SettingsAIHubContent />
      </div>
    </section>
  );
};

export default SettingsAIHubPage;
