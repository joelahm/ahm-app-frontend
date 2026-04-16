import { SettingsAside } from "@/components/dashboard/settings/settings-aside";
import { SettingsAdminOnlyGuard } from "@/components/dashboard/settings/settings-admin-only-guard";
import { SettingsToolsContent } from "@/components/dashboard/settings/settings-tools-content";

const SettingsToolsPage = () => {
  return (
    <section className="relative pl-64">
      <SettingsAdminOnlyGuard />
      <SettingsAside activeKey="tools" />
      <div className="pl-6">
        <SettingsToolsContent />
      </div>
    </section>
  );
};

export default SettingsToolsPage;
